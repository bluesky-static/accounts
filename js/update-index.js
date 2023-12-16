// @ts-check

import { getKeyShortDID, getProfileBlobUrl, getWordStartsLowerCase, shortenDID, shortenHandle, unwrapShortDID } from './utils';
import { throttledAsyncCache } from './throttled-async-cache';

/**
 * @param {{
 *  atClient: import('@atproto/api').BskyAgent,
 *  dids: string[]
 * }} _
 */
export async function* updateIndexBatched({ atClient, dids }) {
  let buffer = [];
  /** @type {{ [shortDID: string]: Error}} */
  let failedShortDIDs = {};
  let bufferStartSize = 0;
  let batchStart = Date.now();

  const MAX_BATCH_SIZE = 1000;
  const MAX_REPORT_INTERVAL = 1000 * 20;

  for await (const profile of fetchProfiles({ atClient, dids })) {
    if (profile.error) {
      failedShortDIDs[profile.shortDID] = profile.error;
      continue;
    } else {
      buffer.push(profile);
    }

    if (buffer.length - bufferStartSize >= MAX_BATCH_SIZE ||
      Date.now() - batchStart >= MAX_REPORT_INTERVAL) {
      yield prepareUpdate();

      bufferStartSize = buffer.length;
      batchStart = Date.now();
    }
  }

  if (buffer.length) {
    yield prepareUpdate();
  }

  function prepareUpdate() {

    return {
      received: buffer.length,
      flush
    };

    function flush() {
      const batch = buffer;
      const batchErrors = failedShortDIDs;
      buffer = [];
      failedShortDIDs = {};

      /**
       * @type {{ errors: { [shortDID: string]: Error } } & {
       *  [bucketKey: string]: {
       *    indexPath: string,
       *    repository: string,
       *    repoPath: string,
       *    profiles: {
       *      [shortDID: string]: Awaited<ReturnType<typeof getShortDIDIndexData>>
       *    }
       *  }
       * }}
       */
      const buckets = {};
      buckets.errors = batchErrors;

      for (const profile of batch) {
        const wordStarts = [];
        if (profile.handle) getWordStartsLowerCase(profile.handle, wordStarts);
        if (profile.displayName) getWordStartsLowerCase(profile.displayName, wordStarts);

        for (const wordStart of wordStarts) {
          let bucket = buckets[wordStart];
          const indexPath = getPrefixIndexPath(wordStart);
          const { repository, path: repoPath } = mapPrefixToRepositoryPath(wordStart);
          if (!bucket) buckets[wordStart] = bucket = {
            indexPath,
            repository,
            repoPath,
            profiles: {}
          };
          bucket.profiles[profile.shortDID] = profile;
        }
      }

      return buckets;
    }
  }
}

/**
 * @param {{
 *  atClient: import('@atproto/api').BskyAgent,
 *  dids: string[]
 * }} _
 */
export async function* fetchProfiles({ atClient, dids }) {
  const throttledFetch = throttledAsyncCache(
    getShortDIDIndexDataWithRetry, { maxConcurrency: 3, interval: 400 });

  const fetchProimiseSet = new Set(
    dids.map(did => {
      const promise = throttledFetch(atClient, shortenDID(did))
        .catch(err => ({
          shortDID: shortenDID(did),
          handle: err.message,
          error: err
        }));

      promise.then(
        () => fetchProimiseSet.delete(promise),
        () => fetchProimiseSet.delete(promise));
      return promise;
    }));

  while (fetchProimiseSet.size) {
    /** @type {Awaited<ReturnType<typeof getShortDIDIndexData>>} */
    let nextFound = await Promise.race(fetchProimiseSet);
    yield nextFound;
  }
}

/**
 * @param {string} prefix
 * @param {string=} baseDir
 */
export function getPrefixIndexPath(prefix, baseDir) {
  const { repository, path } = mapPrefixToRepositoryPath(prefix);

  return (
    upDir(baseDir) +
    'accounts-index/' + repository.charAt(repository.length - 1) + '/' + path
  );
}

/** @param {string | null | undefined} baseDir */
function upDir(baseDir) {
  let normalizedBaseDir = baseDir;
  if (normalizedBaseDir) {
    const posSlash = normalizedBaseDir.indexOf('/');
    const posBackslash = normalizedBaseDir.indexOf('\\');
    const useSlash =
      !(posBackslash >= 0 && posSlash < 0);

    let lastDelim = normalizedBaseDir.lastIndexOf(useSlash ? '/' : '\\');
    if (lastDelim === normalizedBaseDir.length - 1) {
      normalizedBaseDir = normalizedBaseDir.slice(0, lastDelim);
      lastDelim = normalizedBaseDir.lastIndexOf(useSlash ? '/' : '\\')
    }

    if (lastDelim >= 0) {
      normalizedBaseDir = normalizedBaseDir.slice(0, lastDelim + 1);
    } else {
      normalizedBaseDir += (useSlash ? '/' : '\\') + '..' + (useSlash ? '/' : '\\');
    }
  } else {
    normalizedBaseDir = '../';
  }

  return normalizedBaseDir;
}

/** @param {string} prefix */
function mapPrefixToRepositoryPath(prefix) {
  return {
    repository: 'accounts-' + prefix.charAt(0),
    path: prefix.slice(0, 2) + '/' + prefix.slice(1) + '.json'
  };
}

async function getShortDIDIndexDataWithRetry(atClient, shortDID, maxRetryCount = 8) {
  let tryCount = 0;
  const startTime = Date.now();
  while (true) {
    if (tryCount >= maxRetryCount)
      return await getShortDIDIndexData(atClient, shortDID);

    try {
      tryCount++;
      return await getShortDIDIndexData(atClient, shortDID);
    } catch (err) {

      // if this is not a rate limit, fail fast
      if (!/rate/i.test(err.message || ''))
        return await getShortDIDIndexData(atClient, shortDID);

      if (tryCount >= maxRetryCount * 0.33) {
        const retryDelay = Date.now() - startTime;
        console.warn('Failed to get profile for ' + shortDID + ', retrying in ' + (retryDelay / 1000).toFixed(1) + 's...', err);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.warn('Failed to get profile for ' + shortDID + ', retrying...', err);
      }
    }
  }
}

/** @param {import('@atproto/api').BskyAgent} atClient @param {string} shortDID */
async function getShortDIDIndexData(atClient, shortDID) {
  const describePromise = atClient.com.atproto.repo.describeRepo({
    repo: unwrapShortDID(shortDID)
  });

  const profilePromise = atClient.com.atproto.repo.listRecords({
    collection: 'app.bsky.actor.profile',
    repo: unwrapShortDID(shortDID)
  }).catch(() => { });

  const [describe, profile] = await Promise.all([describePromise, profilePromise]);

  if (!describe.data.handle) throw new Error('DID does not have a handle: ' + shortDID);

  const handle = describe.data.handle;

  /** @type {*} */
  const profileRec = profile?.data.records?.filter(rec => rec.value)[0]?.value;
  const avatarUrl = getProfileBlobUrl(shortDID, profileRec?.avatar?.ref?.toString());
  const bannerUrl = getProfileBlobUrl(shortDID, profileRec?.banner?.ref?.toString());
  const displayName = profileRec?.displayName;
  const description = profileRec?.description;

  const profileDetails = {
    shortDID: /** @type {string} */(shortenDID(shortDID)),
    handle: shortenHandle(handle),
    avatarUrl,
    bannerUrl,
    /** @type {string | undefined} */
    displayName,
    /** @type {string | undefined} */
    description,
    /** @type {*} */
    error: undefined
  };

  return profileDetails;
}
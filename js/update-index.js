// @ts-check

import { getKeyShortDID, getProfileBlobUrl, shortenDID, unwrapShortDID } from './utils';
import { throttledAsyncCache } from './throttled-async-cache';

/**
 * @param {{
 *  atClient: import('@atproto/api').BskyAgent,
 *  dids: string[]
 * }} _
 */
export async function* updateIndexBatched({ atClient, dids }) {
  let buffer = [];
  let bufferStartSize = 0;
  let batchStart = Date.now();

  const MAX_BATCH_SIZE = 1000;
  const MAX_REPORT_INTERVAL = 1000 * 20;

  for await (const profile of fetchProfiles({ atClient, dids })) {
    buffer.push(profile);

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
      buffer = [];

      /**
       * @type {{
       *  [bucketKey: string]: {
       *    indexPath: string,
       *    repo: string,
       *    repoPath: string,
       *    profiles: {
       *      [shortDID: string]: Awaited<ReturnType<typeof getShortDIDIndexData>>
       *    }
       *  }
       * }}
       */
      const buckets = {};
      for (const profile of batch) {
        const bucketKey = getKeyShortDID(profile.shortDID);
        let bucket = buckets[bucketKey];
        const indexPath = getPrefixIndexPath(bucketKey);
        const { repo, path: repoPath } = mapPrefixToRepositoryPath(bucketKey);
        if (!bucket) buckets[bucketKey] = bucket = {
          indexPath,
          repo,
          repoPath,
          profiles: {}
        };
        bucket.profiles[profile.shortDID] = profile;
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
    getShortDIDIndexDataWithRetry, { maxConcurrency: 4 });

  const fetchProimiseSet = new Set(
    dids.map(did => {
      const promise = throttledFetch(atClient, shortenDID(did));
      promise.then(
        () => fetchProimiseSet.delete(promise),
        () => fetchProimiseSet.delete(promise));
      return promise;
    }));

  while (fetchProimiseSet.size) {
    /** @type {Awaited<ReturnType<typeof getShortDIDIndexData>>} */
    const nextFound = await Promise.race(fetchProimiseSet);
    yield nextFound;
  }
}

/**
 * @param {string} prefix
 * @param {string=} baseDir
 */
export function getPrefixIndexPath(prefix, baseDir) {
  const { repo, path } = mapPrefixToRepositoryPath(prefix);

  return (
    upDir(baseDir) +
    'accounts-index/' + repo.charAt(repo.length - 1) + '/' + path
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
}

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
  });

  const [describe, profile] = await Promise.all([describePromise, profilePromise]);

  if (!describe.data.handle) throw new Error('DID does not have a handle: ' + shortDID);

  const handle = describe.data.handle;

  /** @type {*} */
  const profileRec = profile.data.records?.filter(rec => rec.value)[0]?.value;
  const avatarUrl = getProfileBlobUrl(shortDID, profileRec?.avatar?.ref?.toString());
  const bannerUrl = getProfileBlobUrl(shortDID, profileRec?.banner?.ref?.toString());
  const displayName = profileRec?.displayName;
  const description = profileRec?.description;

  const profileDetails = {
    shortDID: /** @type {string} */(shortenDID(shortDID)),
    handle,
    avatarUrl,
    bannerUrl,
    /** @type {string | undefined} */
    displayName,
    /** @type {string | undefined} */
    description
  };

  return profileDetails;
}
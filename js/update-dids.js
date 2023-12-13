// @ts-check

import { shortenDID } from './utils';
import { getKeyShortDID } from './utils';

/**
 * @param {{
 *  atClient: import('@atproto/api').BskyAgent,
 *  cursor: string | number | undefined | null
 * }} _
 */
export async function* updateDIDs({ atClient, cursor }) {
  let currentCursor = cursor;
  let totalCallTime = 0;
  let totalCallCount = 0;
  let totalReceived = 0;
  let totalAdded = 0;
  let totalReduced = 0;
  let bufferCallTime = 0;
  let bufferCallCount = 0;
  let bufferShortDIDs = [];
  while (true) {
    const callStart = Date.now();
    const reply = await
      atClient.com.atproto.sync.listRepos({
        cursor:
          currentCursor == null || currentCursor === '' ? undefined :
            String(currentCursor),
        limit: 997
      });
    const callTime = Date.now() - callStart;

    if (reply?.data?.repos?.length || reply?.data?.cursor)
      yield prepareUpdate(reply.data.repos, reply.data.cursor, callTime);

    if (!reply.data?.cursor) {
      break;
    }

    currentCursor = reply.data.cursor;
  }

  /**
   * @param {{ did?: string }[] | undefined} repos
   * @param {string | undefined} cursor
   * @param {number} callTime
   */
  function prepareUpdate(repos, cursor, callTime) {
    let received = 0;
    if (repos?.length) {
      for (const { did } of repos) {
        if (!did) continue;
        const shortDID = shortenDID(did);
        bufferShortDIDs.push(shortDID);
        received++;
        totalReceived++;
      }
    }

    bufferCallCount++;
    totalCallCount++;
    bufferCallTime += callTime;
    totalCallTime += callTime;


    const yields = {
      cursor,
      callStats: {
        callTime,
        received
      },
      bufferStats: {
        callTime: bufferCallTime,
        callCount: bufferCallCount,
        received: bufferShortDIDs.length
      },
      totalStats: {
        callTime: totalCallTime,
        callCount: totalCallCount,
        received: totalReceived
      },
      apply: applyUpdate
    };

    return yields;
  }

  /**
   * @param {{
   * initialShortDIDCount: number,
   *  getBucketText: (key: string) => Promise<string> | string,
   *  getCursorsText: () => Promise<string> | string,
   *  getReadmeText: () => Promise<string> | string,
   *  getClientDescription: () => string
   * }} _
   */
  async function applyUpdate({
    initialShortDIDCount,
    getBucketText,
    getCursorsText,
    getReadmeText,
    getClientDescription }) {
    const shortDIDs = bufferShortDIDs;
    bufferShortDIDs = [];
    bufferCallTime = 0;
    bufferCallCount = 0;

    const groupedByKey = {};
    const keys = [];
    for (const shortDID of shortDIDs) {
      const key = getKeyShortDID(shortDID);
      let bucket = groupedByKey[key];
      if (bucket) bucket.push(shortDID);
      else {
        keys.push(key);
        groupedByKey[key] = [shortDID];
      }
    }

    const keyBucketContents = await Promise.all(keys.map(key => getBucketText(key)));
    const applyResult = {
      applyStats: {
        added: 0,
        reduced: 0,
      },
      totalStats: {
        added: totalAdded,
        reduced: totalReduced,
      },
      /** @type {{ [key: string]: string[] }} */
      modifiedByKey: {},
      /** @type {string | undefined} */
      readme: undefined,
      /** @type {string | undefined} */
      cursors: undefined
    };

    for (let iKey = 0; iKey < keys.length; iKey++) {
      const key = keys[iKey];
      /** @type {readonly string[]} */
      const originalBucketArray = JSON.parse(keyBucketContents[iKey]);
      const bucketSet = new Set(originalBucketArray);
      let modified = originalBucketArray.length - bucketSet.size;
      applyResult.applyStats.reduced += modified;
      const addBucketShortDIDs = groupedByKey[key];

      for (const addShortDID of addBucketShortDIDs) {
        if (!bucketSet.has(addShortDID)) {
          bucketSet.add(addShortDID);
          modified++;
          applyResult.applyStats.added++;
        }
      }

      if (modified) {
        const modifiedBucketArray = Array.from(bucketSet);
        applyResult.modifiedByKey[key] = modifiedBucketArray;
      }
    }

    if (applyResult.applyStats.added + applyResult.applyStats.reduced) {
      const timestamp = new Date().toISOString();

      const cursorsText = await getCursorsText();
      const baseCursors = cursorsText ? JSON.parse(cursorsText) : {};
      applyResult.cursors = JSON.stringify({
        ...baseCursors,
        listRepos: {
          cursor: currentCursor,
          timestamp,
          client: getClientDescription()
        }
      }, null, 2);

      const readmeContent = await getReadmeText();
      if (readmeContent) {
        const injectTimestamp = readmeContent
          .replace(/<span class=timestamp>[^<]*<\/span>/,
            '<span class=timestamp>' + timestamp + '</span>')
          .replace(/<span class=accountnumber>[^<]*<\/span>/,
            '<span class=accountnumber>' + (initialShortDIDCount + totalAdded - totalReduced) + '</span>');
        if (injectTimestamp !== readmeContent) {
          applyResult.readme = injectTimestamp;
        }
      }
    }

    totalAdded += applyResult.applyStats.added;
    applyResult.totalStats.added = totalAdded;

    totalReduced += applyResult.applyStats.reduced;
    applyResult.totalStats.reduced = totalReduced;


    return applyResult;
  }
}
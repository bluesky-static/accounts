// @ts-check

import { BskyAgent } from '@atproto/api';
import { allShortDIDs, getClientDescriptionNode, homeDir } from './node-utils';
import { getKeyPath, getKeyShortDID, packDidsJson, shortenDID } from '../utils';
import { patchBskyAgent } from '../patch-bsky-agent';
import { updateDIDs } from '../update-dids';

export async function updateDIDsNode() {
  const fs = require('fs');
  const path = require('path');

  console.log('Static BlueSky account DIDs maintenance...');

  const atClient = new BskyAgent({
    // service: 'https://bsky.social/xrpc'
    service: 'https://bsky.network/xrpc'
  });
  patchBskyAgent(atClient);

  process.stdout.write('Currently ');

  const startCursor = readCursors().listRepos;

  const initialShortDIDCount = allShortDIDs().length;

  console.log(initialShortDIDCount.toLocaleString('en-us') + ' DIDs, updating from cursor:' + startCursor.cursor + '...');

  const BUFFER_DIDS_INTERVAL = 1000 * 20;
  const BUFFER_DIDS_COUNT = 20000;

  var latestChunk;
  var latestChunkApplied = false;
  var latestCursor;
  /** @type {{ added: number, reduced: number } | undefined} */
  var latestApplied;

  let startUpdate = Date.now();
  for await (const updateChunk of updateDIDs({ atClient, cursor: startCursor.cursor })) {
    latestChunk = updateChunk;
    latestChunkApplied = false;
    if (updateChunk.cursor)
      latestCursor = updateChunk.cursor;

    if (updateChunk.bufferStats.received > BUFFER_DIDS_COUNT ||
      (updateChunk.bufferStats.received && Date.now() > startUpdate + BUFFER_DIDS_INTERVAL)) {
      await applyUpdateChunk(updateChunk);
      latestChunkApplied = true;
    }
  }

  if (!latestChunkApplied && latestChunk) {
    await applyUpdateChunk(latestChunk);
  }

  if (latestChunk) {
    console.log(
      'Added total ' + latestApplied?.added.toLocaleString('en-us') + ' users,' +
      (!latestApplied?.reduced ? '' : ' deduplicated ' + latestApplied.reduced + ', ') +
      ' cursor:' + latestCursor);
  } else {
    console.log('No new accounts.');
  }

  async function asyncIteratorUpdateDIDsReturn() {
    for await (const r of updateDIDs(/** @type {*} */({ }))) { return r; }
  }

  /** @param {NonNullable<Awaited<ReturnType<typeof asyncIteratorUpdateDIDsReturn>>>} updateChunk */
  async function applyUpdateChunk(updateChunk) {
    const cursorsPath = path.resolve(homeDir, 'cursors.json');
    const readmePath = path.resolve(homeDir, 'README.md');
    process.stdout.write('  +');
    const changesToApply = await updateChunk.apply({
      initialShortDIDCount,
      getBucketText: (key) => {
        const bucketPath = path.resolve(
          homeDir,
          getKeyPath(key));
        return fs.readFileSync(bucketPath, 'utf8');
      },
      getCursorsText: () => fs.readFileSync(cursorsPath, 'utf8'),
      getReadmeText: () => fs.readFileSync(readmePath, 'utf8'),
      getClientDescription: getClientDescriptionNode
    });
    latestApplied = changesToApply.totalStats;

    if (changesToApply.applyStats.added + changesToApply.applyStats.reduced) {
      for (const key in changesToApply.modifiedByKey) {
        const modifiedShortDIDs = changesToApply.modifiedByKey[key];
        const bucketPath = path.resolve(
          homeDir,
          getKeyPath(key));

        fs.writeFileSync(
          bucketPath,
          packDidsJson(modifiedShortDIDs));
      }

      if (changesToApply.cursors) {
        fs.writeFileSync(
          cursorsPath,
          changesToApply.cursors);
      }

      if (changesToApply.readme) {
        fs.writeFileSync(
          readmePath,
          changesToApply.readme);
      }

      console.log(
        changesToApply.applyStats.added +
        '/' + updateChunk.bufferStats.received +
        (changesToApply.applyStats.reduced ? '/-' + changesToApply.applyStats.reduced : '') +
        ' dids cursor:' + updateChunk.cursor +
        '  ' + updateChunk.bufferStats.callCount + '/HTTP ' + (updateChunk.callStats.callTime / 1000) + 's,' +
        ' processing ' + ((Date.now() - startUpdate - updateChunk.callStats.callTime) / 1000) + 's' +
        ' ' + Object.keys(changesToApply.modifiedByKey).length + ' buckets');
    } else {
      console.log(
        'NONE/' + updateChunk.bufferStats.received +
        ' dids cursor:' + updateChunk.cursor +
        '  ' + updateChunk.bufferStats.callCount + '/HTTP ' + (updateChunk.callStats.callTime / 1000) + 's'
      );
    }
  }

  function readCursors() {
    return /** @type {typeof import('../../cursors.json')} */(
      JSON.parse(fs.readFileSync(path.resolve(homeDir, 'cursors.json'), 'utf8'))
    );
  }
}

export async function updateDids() {
  const fs = require('fs');
  const path = require('path');

  console.log('Static BlueSky accounts maintenance...');

  const atClient = new BskyAgent({
    // service: 'https://bsky.social/xrpc'
    service: 'https://bsky.network/xrpc'
  });
  patchBskyAgent(atClient);

  process.stdout.write('Currently ');

  const startCursor = readCursors().listRepos;
  /** @type {string | undefined} */
  var didsCursor = startCursor.cursor || undefined;

  const initialShortDIDCount = allShortDIDs().length;

  console.log(initialShortDIDCount.toLocaleString('en-us') + ' DIDs, updating from cursor:' + startCursor.cursor + '...');


  const BUFFER_DIDS_INTERVAL = 1000 * 20;
  const BUFFER_DIDS_COUNT = 20000;

  let addedTotal = 0;
  let bufAddShortDids = [];
  let callTime = 0;
  let callCount = 0;
  let nextAddDids = Date.now() + BUFFER_DIDS_INTERVAL;
  let startBuf = Date.now();
  /** @type {ReturnType<typeof atClient.com.atproto.sync.listRepos> | undefined} */
  var aheadPromise;
  while (true) {
    const callStart = Date.now();
    const nextList = await
      (aheadPromise ||
        atClient.com.atproto.sync.listRepos({ cursor: didsCursor, limit: 970 }));

    callTime += Date.now() - callStart;
    callCount++;

    if (nextList.data.cursor)
      didsCursor = nextList.data.cursor;

    aheadPromise = !didsCursor ? undefined :
      atClient.com.atproto.sync.listRepos({ cursor: didsCursor, limit: 997 });

    if (nextList.data?.repos?.length) {
      const addDids = nextList.data.repos.map(repo => shortenDID(repo.did));
      for (const shortDID of addDids) {
        bufAddShortDids.push(shortDID);
      }
    }

    if (bufAddShortDids.length > BUFFER_DIDS_COUNT || (bufAddShortDids.length && Date.now() > nextAddDids)) {
      updateDidsJson(bufAddShortDids, didsCursor);
      bufAddShortDids = [];
      nextAddDids = Date.now() + BUFFER_DIDS_INTERVAL;
    }

    if (!nextList.data?.cursor) {
      break;
    }
  }

  if (bufAddShortDids.length) {
    updateDidsJson(bufAddShortDids, didsCursor);
    bufAddShortDids = [];
  }

  console.log('Added ' + addedTotal.toLocaleString('en-us') + ' users, cursor:' + didsCursor);


  function updateDidsJson(addShortDids, didsCursor) {
    if (!addShortDids?.length) return;

    process.stdout.write('  +');
    let added = 0;
    const groupedByKey = {};
    for (const shortDID of addShortDids) {
      const key = getKeyShortDID(shortDID);
      let bucket = groupedByKey[key];
      if (bucket) bucket.push(shortDID);
      else groupedByKey[key] = [shortDID];
    }

    for (const key in groupedByKey) {
      const bucketPath = path.resolve(
        homeDir,
        'dids',
        (key === 'web' ? 'web.json' : key[0] + '/' + key + '.json'));

      const dids = JSON.parse(fs.readFileSync(bucketPath, 'utf8'));
      const set = new Set(dids);
      let bucketAdded = 0;
      for (const shortDID of groupedByKey[key]) {
        if (set.has(shortDID)) continue;
        bucketAdded++;
        set.add(shortDID);
        dids.push(shortDID);
      }

      if (!bucketAdded) continue;

      added += bucketAdded;
      process.stdout.write(key + ':' + bucketAdded + ' ');
      fs.writeFileSync(
        bucketPath,
        packDidsJson(dids));
    }

    if (added) {
      const timestamp = new Date().toISOString();

      fs.writeFileSync(
        path.resolve(homeDir, 'cursors.json'),
        JSON.stringify({
          ...readCursors(),
          listRepos: {
            cursor: didsCursor,
            timestamp: new Date().toISOString(),
            client: getClientDescriptionNode()
          }
        }, null, 2));

      const readmePath = path.resolve(homeDir, 'README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      const injectTimestamp = readmeContent
        .replace(/<span class=timestamp>[^<]*<\/span>/,
          '<span class=timestamp>' + timestamp + '</span>')
        .replace(/<span class=accountnumber>[^<]*<\/span>/,
          '<span class=accountnumber>' + (initialShortDIDCount + addedTotal + added) + '</span>');
      if (injectTimestamp !== readmeContent) {
        fs.writeFileSync(readmePath, injectTimestamp);
      }
    }

    console.log(
      added + '/' + addShortDids.length + ' dids cursor:' + didsCursor +
      '  ' + callCount + '/HTTP ' + (callTime / 1000) + 's, ' +
      ' processing ' + ((Date.now() - startBuf - callTime) / 1000) + 's');

    addedTotal += added;
    callTime = 0;
    callCount = 0;
    startBuf = Date.now();
  }

  function readCursors() {
    return /** @type {typeof import('../../cursors.json')} */(
      JSON.parse(fs.readFileSync(path.resolve(homeDir, 'cursors.json'), 'utf8'))
    );
  }

}

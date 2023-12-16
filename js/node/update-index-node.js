// @ts-check

import { BskyAgent } from '@atproto/api';
import { allIndexedShortDIDs, allShortDIDs, homeDir } from './node-utils';
import { patchBskyAgent } from '../patch-bsky-agent';
import { updateIndexBatched } from '../update-index';
import { packDidsJson } from '../utils';

export async function updateIndexNode() {
  const fs = require('fs');
  const path = require('path');

  process.stdout.write('Static BlueSky account index maintenance: ');
  const shortDIDs = allShortDIDs();
  process.stdout.write(shortDIDs.length.toLocaleString('en-us') + ' DIDs, indexed ');
  const indexedShortDIDs = allIndexedShortDIDs();

  const indexedSet = new Set(indexedShortDIDs);
  const unindexedShortDIDs = shortDIDs.filter(shortDID => !indexedSet.has(shortDID));

  process.stdout.write(' ' + indexedShortDIDs.length.toLocaleString('en-us') + ',');
  const remainingUnindexedShortDIDs = [...unindexedShortDIDs];
  const unindexedPath = path.resolve(homeDir, 'unindexed.json');
  fs.writeFileSync(unindexedPath, packDidsJson(remainingUnindexedShortDIDs));
  console.log(' left ' + unindexedShortDIDs.length.toLocaleString('en-us'));

  const atClient = new BskyAgent({
    service: 'https://bsky.social/xrpc'
    //service: 'https://bsky.network/xrpc'
  });
  patchBskyAgent(atClient);


  while (true) {
    const DID_BATCH_SIZE = 600;
    const didBatch = [];
    while (didBatch.length < DID_BATCH_SIZE && remainingUnindexedShortDIDs.length) {
      const pickIndex = (Math.random() * remainingUnindexedShortDIDs.length) | 0;
      didBatch.push(remainingUnindexedShortDIDs[pickIndex]);
      remainingUnindexedShortDIDs[pickIndex] = remainingUnindexedShortDIDs[remainingUnindexedShortDIDs.length - 1];
      remainingUnindexedShortDIDs.pop();
    }

    console.log('Updating index for [' + didBatch.length + '] accounts: ' + didBatch[0] + '...' + didBatch[didBatch.length - 1]);
    /** @type {Promise | undefined} */
    let finishUpdate = undefined;
    for await (const batch of updateIndexBatched({ atClient, dids: didBatch })) {
      await finishUpdate;

      process.stdout.write('  ' + batch.received + ' accounts...');
      const { errors, ...buckets } = await batch.flush();

      // allow parallel HTTP and filesystem
      finishUpdate = (async () => {
        const errorCount = Object.keys(errors).length;
        process.stdout.write(
          ' ' + Object.keys(buckets).length + ' buckets' +
          (!errorCount ? ' ' : ', ' + errorCount + (errorCount === 1 ? ' error ' : ' errors '))
        );

        const repositories = [];
        for (const bucketKey in buckets) {
          const bucket = buckets[bucketKey];
          const resolvedJsonPath = path.resolve(homeDir, bucket.indexPath);
          const existing = fs.existsSync(resolvedJsonPath) ? JSON.parse(fs.readFileSync(resolvedJsonPath, 'utf8')) : {};
          for (const shortDID in bucket.profiles) {
            const profile = bucket.profiles[shortDID];
            existing[shortDID] =
              profile.displayName ? [profile.handle, profile.displayName] :
                profile.handle;
          }

          fs.writeFileSync(
            resolvedJsonPath,
            '{\n' +
            Object.keys(existing).map(
              shortDID =>
                JSON.stringify(shortDID) + ':' + JSON.stringify(existing[shortDID])).join(',\n') +
            '\n}\n');
        
          if (repositories.indexOf(bucket.repository) < 0)
            repositories.push(bucket.repository);
        }

        process.stdout.write(' ' + repositories.length + ' repos updated');
        fs.writeFileSync(unindexedPath, packDidsJson(remainingUnindexedShortDIDs));
        console.log('.');
      })();
    }

    await finishUpdate;
  }

}
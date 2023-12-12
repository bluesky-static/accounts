// @ts-check

const fs = require('fs');
const path = require('path');
const atproto = require('@atproto/api');
const { formatSince, shortenDID, getClientDescription, packDidsJson, allShortDIDs } = require('./utils');

const atClient = new atproto.BskyAgent({
  // service: 'https://bsky.social/xrpc'
  service: 'https://bsky.network/xrpc'
});

/** @param {string} shortDID */
function getKeyShortDID(shortDID) {
  if (shortDID.indexOf(':') >= 0) return 'web';
  return shortDID.slice(0, 2);
}

async function updateFromLatest() {
  console.log('Static BlueSky accounts maintenance...');
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
      const bucketPath = path.resolve(__dirname,
        '../dids/' +
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
        path.resolve(__dirname, '../cursors.json'),
        JSON.stringify({
          ...readCursors(),
          listRepos: {
            cursor: didsCursor,
            timestamp: new Date().toISOString(),
            client: getClientDescription()
          }
        }, null, 2));

      const readmePath = path.resolve(__dirname, '../README.md');
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
      ' processing ' + ((Date.now() - startBuf - callTime)/1000) + 's');

    addedTotal += added;
    callTime = 0;
    callCount = 0;
    startBuf = Date.now();
  }

  function readCursors() {
    return /** @type {typeof import('../cursors.json')} */(
      JSON.parse(fs.readFileSync(require.resolve('../cursors.json'), 'utf8'))
    );
  }

}

module.exports = {
  updateFromLatest,
};
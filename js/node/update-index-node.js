import { allIndexedShortDIDs, allShortDIDs } from './node-utils';

export async function updateIndexNode() {
  const fs = require('fs');
  const path = require('path');

  process.stdout.write('Static BlueSky account index maintenance: ');
  const shortDIDs = allShortDIDs();
  process.stdout.write(shortDIDs.length.toLocaleString('en-us') + ' DIDs, indexed');
  const indexedShortDIDs = allIndexedShortDIDs();
  console.log(' ' + indexedShortDIDs.length.toLocaleString('en-us') + ' DIDs');

  // const atClient = new BskyAgent({
  //   // service: 'https://bsky.social/xrpc'
  //   service: 'https://bsky.network/xrpc'
  // });
  // patchBskyAgent(atClient);


}
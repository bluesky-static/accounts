// @ts-check

const fs = require('fs');
const path = require('path');
const { getWordStartsLowerCase } = require('./utils');


function importReceipts() {
  process.stdout.write('Loading receipts-db...');
  const byShortDID = loadAllReceiptsDb();
  console.log(' ' + Object.keys(byShortDID).length + ' DIDs.');

  process.stdout.write('Building buckets...');
  const addFirstLetterBuckets = {};
  let bucketCount = 0;
  for (const shortDID in byShortDID) {
    const dt = byShortDID[shortDID];
    let handle = dt;
    let displayName;
    if (Array.isArray(handle)) [handle, displayName] = dt;

    const wordStarts = [];
    if (handle) getWordStartsLowerCase(handle, wordStarts);
    if (displayName) getWordStartsLowerCase(displayName, wordStarts);

    for (const wordStart of wordStarts) {
      const firstLetter = wordStart[0];
      let buckets = addFirstLetterBuckets[firstLetter];
      if (!buckets) addFirstLetterBuckets[firstLetter] = buckets = {};

      let bucket = buckets[wordStart];
      if (!bucket) {
        buckets[wordStart] = bucket = {};
        bucketCount++;
      }

      bucket[shortDID] = dt;
    }
  }
  console.log(bucketCount + ' buckets for ' + Object.keys(addFirstLetterBuckets).length + ' first letters.');

  process.stdout.write('Writing buckets...');
  const indexPath = path.resolve(__dirname, '../../accounts-index');

  for (const firstLetter in addFirstLetterBuckets) {
    const buckets = addFirstLetterBuckets[firstLetter];
    process.stdout.write('  ' + firstLetter + ' ' + Object.keys(buckets).length + ' buckets');
    let totalContent = 0;
    for (const wordStart in buckets) {
      const bucket = buckets[wordStart];
      const bucketPath = path.resolve(indexPath, firstLetter, wordStart.slice(0, 2), wordStart.slice(1) + '.json');
      if (!fs.existsSync(path.dirname(bucketPath))) fs.mkdirSync(path.dirname(bucketPath), { recursive: true });
      const content = '{\n' +
        Object.keys(buckets[wordStart]).map(
          shortDID =>
            JSON.stringify(shortDID) + ':' + JSON.stringify(bucket[shortDID])).join(',\n') +
        '\n}\n';
      const bufContent = Buffer.from(content, 'utf8');

      fs.writeFileSync(bucketPath, bufContent);

      totalContent += bufContent.byteLength;
    }

    console.log(' ' + totalContent.toLocaleString('en-us') + 'b');
  }
}

function getAllReceiptsDbFiles() {
  const receiptsDbDir = path.resolve(__dirname, '../../../receipts-db');

  const oneLetterDirs =   /** @type {string[]} */(fs.readdirSync(receiptsDbDir)
    .map(name => path.basename(name).length === 1 ? path.resolve(receiptsDbDir, name) : undefined)
    .filter(Boolean));

  const allFiles = [];
  for (const oneLetterDir of oneLetterDirs) {
    const files =
      fs.readdirSync(oneLetterDir)
        .map(name => path.resolve(oneLetterDir, name))
        .filter(name => path.basename(name).length === 5 && name.endsWith('.js'));

    for (const f of files) {
      allFiles.push(f);
    }
  }

  return allFiles;
}

function loadAllReceiptsDb() {
  const receiptsDbFiles = getAllReceiptsDbFiles();

  const byShortDID = {};
  for (const receiptsDbFile of receiptsDbFiles) {
    const content = fs.readFileSync(receiptsDbFile, 'utf8');
    const lastCurly = content.slice(0, 200).indexOf('({') + 1;
    const closingCurly = content.lastIndexOf('}');

    const json = JSON.parse(content.slice(lastCurly, closingCurly + 1));

    Object.assign(byShortDID, json);
  }

  return byShortDID;
}



importReceipts();
// @ts-check

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

var clientDescription;
function getClientDescription() {
  if (clientDescription) return clientDescription;

  var platformDescr = 'node' + process.version.replace(/^v/, '') + ' ' + process.platform + '/' + process.arch;

  var package = require('../package.json');
  var packageDescr = package.name + '@' + package.version;

  var gitDescr = 'git:unknown';
  if (fs.existsSync(path.join(__dirname, '../.git'))) {
    try {
      var gitHash = child_process.execSync('git rev-parse HEAD').toString('utf8').trim();
      var gitDirty = child_process.execSync('git status --porcelain').toString('utf8').trim();
      var gitDescr = 'git:' + gitHash + (gitDirty ? '*' : '');
    } catch (gitError) {
    }
  }

  return clientDescription = platformDescr + ' ' + packageDescr + ' ' + gitDescr;
}

function packDidsJson(dids, lead = '[\n', tail = '\n]\n') {
  const DIDS_SINGLE_LINE = 6;
  const didsLines = [];
  for (let i = 0; i < dids.length; i += DIDS_SINGLE_LINE) {
    const chunk = dids.slice(i, i + DIDS_SINGLE_LINE);
    const line = chunk.map(shortDID => '"' + shortDID + '"').join(',');
    didsLines.push(line);
  }

  return lead + didsLines.join(',\n') + tail;
}

function allDIDFilesJSON() {
  const didsDir = path.resolve(__dirname, '../dids');
  const oneLetterDirs =   /** @type {string[]} */(fs.readdirSync(didsDir)
    .map(name => path.basename(name).length === 1 ? path.resolve(didsDir, name) : undefined)
    .filter(Boolean));

  const allFiles = [];
  for (const oneLetterDir of oneLetterDirs) {
    const files =
      fs.readdirSync(oneLetterDir)
        .map(name => path.resolve(oneLetterDir, name))
        .filter(name => name.endsWith('.json'));

    for (const f of files) {
      allFiles.push(f);
    }
  }

  allFiles.push(path.resolve(__dirname, '../dids/web.json'));

  return allFiles;
}

function allShortDIDs() {
  const allShortDIDs = [];
  for (const f of allDIDFilesJSON()) {
    const dids = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const did of dids) {
      allShortDIDs.push(did);
    }
  }
  return allShortDIDs;
}

var wordStartRegExp = /[A-Z]*[a-z]*/g;
/** @param {string} str */
function getWordStartsLowerCase(str, wordStarts) {
  if (!wordStarts) wordStarts = [];
  str.replace(wordStartRegExp, function (match) {
    const wordStart = match?.slice(0, 3).toLowerCase();
    if (wordStart?.length === 3 && wordStarts.indexOf(wordStart) < 0)
      wordStarts.push(wordStart);
    return match;
  });
  return wordStarts;
}

/** @param {string | Date | number} date */
function formatSince(date) {
  date = new Date(date);
  const now = Date.now();
  const dateTime = date.getTime();
  if (dateTime > now || date.getTime() < now - 1000 * 60 * 60 * 24 * 30) {
    return date.toLocaleDateString();
  }
  else {
    // TODO: localize
    const timeAgo = now - dateTime;
    if (timeAgo > 1000 * 60 * 60 * 48) {
      return Math.round(timeAgo / (1000 * 60 * 60 * 24)) + 'd ago';
    } else if (timeAgo > 1000 * 60 * 60 * 2) {
      return Math.round(timeAgo / (1000 * 60 * 60)) + 'h ago';
    } else if (timeAgo > 1000 * 60 * 2) {
      return Math.round(timeAgo / (1000 * 60)) + 'm ago';
    } else if (timeAgo > 1000 * 2) {
      return Math.round(timeAgo / 1000) + 's ago';
    } else {
      return 'now';
    }
  }

}

/** @param {string} text */
function likelyDID(text) {
  return text && (
    !text.trim().indexOf('did:') ||
    text.trim().length === 24 && !/[^\sa-z0-9]/i.test(text)
  );
}

/** @param {string | null | undefined} did */
function shortenDID(did) {
  return typeof did === 'string' ? did.replace(/^did\:plc\:/, '') : did;
}

function unwrapShortDID(shortDID) {
  return !shortDID ? shortDID : shortDID.indexOf(':') < 0 ? 'did:plc:' + shortDID : shortDID;
}

function unwrapShortHandle(shortHandle) {
  return !shortHandle ? shortHandle : shortHandle.indexOf('.') < 0 ? shortHandle + '.bsky.social' : shortHandle;
}

/** @param {string} handle */
function shortenHandle(handle) {
  return handle && handle.replace(_shortenHandle_Regex, '');
}
const _shortenHandle_Regex = /\.bsky\.social$/;



module.exports = {
  getWordStartsLowerCase,
  getClientDescription,
  packDidsJson,
  formatSince,
  likelyDID,
  shortenDID, unwrapShortDID,
  shortenHandle, unwrapShortHandle,
  allDIDFilesJSON, allShortDIDs
};
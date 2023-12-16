// @ts-check

import { isWeb } from '../utils';

export const homeDir = isWeb ? '' : __dirname;

var clientDescription;
export function getClientDescriptionNode() {
  const fs = require('fs');
  const path = require('path');
  const child_process = require('child_process');

  if (clientDescription) return clientDescription;
  var platformDescr = 'node' + process.version.replace(/^v/, '') + ' ' + process.platform + '/' + process.arch;

  var packageJSON = JSON.parse(fs.readFileSync(
    path.resolve(homeDir, 'package.json'), 'utf8'));

  var packageDescr = packageJSON.name + '@' + packageJSON.version;

  var gitDescr = 'git:unknown';
  if (fs.existsSync(path.join(homeDir, '.git'))) {
    try {
      var gitHash = child_process.execSync('git rev-parse HEAD').toString('utf8').trim();
      var gitDirty = child_process.execSync('git status --porcelain').toString('utf8').trim();
      var gitDescr = 'git:' + gitHash + (gitDirty ? '*' : '');
    } catch (gitError) {
    }
  }

  return clientDescription = platformDescr + ' ' + packageDescr + ' ' + gitDescr;
}

export function allDIDFilesJSON() {
  const fs = require('fs');
  const path = require('path');

  const didsDir = path.resolve(homeDir, 'dids');
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

  allFiles.push(path.resolve(homeDir, 'dids/web.json'));

  return allFiles;
}

export function allShortDIDs() {
  const fs = require('fs');

  const allShortDIDs = [];
  for (const f of allDIDFilesJSON()) {
    const dids = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const did of dids) {
      allShortDIDs.push(did);
    }
  }
  return allShortDIDs;
}

export function allIndexFilesJSON() {
  const fs = require('fs');
  const path = require('path');

  const indexDir = path.resolve(homeDir, '../accounts-index');
  const oneLetterDirs = /** @type {string[]} */(fs.readdirSync(indexDir)
    .map(name => path.basename(name).length === 1 ? path.resolve(indexDir, name) : undefined)
    .filter(Boolean));

  const allFiles = [];
  for (const oneLetterDir of oneLetterDirs) {
    const twoLetterDirs =/** @type {string[]} */(fs.readdirSync(oneLetterDir)
      .map(name => path.basename(name).length === 2 ? path.resolve(oneLetterDir, name) : undefined)
      .filter(Boolean));

    for (const twoLetterDir of twoLetterDirs) {
      const files =
        fs.readdirSync(twoLetterDir)
          .map(name => path.resolve(twoLetterDir, name))
          .filter(name => name.endsWith('.json'));

      for (const f of files) {
        allFiles.push(f);
      }
    }
  }

  allFiles.push(path.resolve(homeDir, 'dids/web.json'));

  return allFiles;
}

export function allIndexedShortDIDs() {
  const fs = require('fs');

  const allShortDIDs = new Set();
  for (const f of allIndexFilesJSON()) {
    const map = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const did in map) {
      allShortDIDs.add(did);
    }
  }
  return [...allShortDIDs];
}

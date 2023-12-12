const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const dirAccountsIndex = path.resolve(__dirname, '../../accounts-index');
const accountsIndexRepoPaths =
  /** @type {string[]} */(fs.readdirSync(dirAccountsIndex)
    .map(name => path.basename(name).length === 1 ? path.resolve(dirAccountsIndex, name) : undefined)
    .filter(Boolean));

for (const repoPath of accountsIndexRepoPaths) {
  const command =
    // 'git checkout main'
    //' &&
    'git add . && git commit -m Initial';
  process.stdout.write(repoPath + '> ' + command);
  const result = child_process.execSync(
    command,
    { cwd: repoPath }).toString('utf8');
  console.log(result);
}
// Gives every build its own version: the first two numbers come from package.json (0.3), the last is the number of commits.
// The Windows and Android builds run on the same commit, so they get the same version and publish into the same release.
const fs = require('fs');
const { execSync } = require('child_process');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [a, b] = String(p.version).split('-')[0].split('.');
let n = '0';
try { n = execSync('git rev-list --count HEAD').toString().trim(); } catch {}
p.version = a + '.' + b + '.' + n;
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('Kinora version', p.version);

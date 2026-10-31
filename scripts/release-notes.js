// Writes RELEASE_NOTES.md for the version in package.json, taken from the matching section of CHANGELOG.md.
// Both release workflows run this, so the Windows and Android builds publish the same notes.
const fs = require('fs');
const v = require('../package.json').version;
const t = fs.existsSync('CHANGELOG.md') ? fs.readFileSync('CHANGELOG.md', 'utf8') : '';
const sec = t.split(/^## /m).find((s) => s.startsWith('[' + v + ']'));
const body = sec ? sec.replace(/^.*\r?\n/, '').trim() : '';
const beta = /-/.test(v) ? '\n\nThis is a beta release, so expect some rough edges. It installs over your current version.' : '';
fs.writeFileSync('RELEASE_NOTES.md', (body || 'Kinora ' + v) + beta + '\n');

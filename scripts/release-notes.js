// Writes RELEASE_NOTES.md for this build. The notes come from CHANGELOG.md: the section named after this version,
// or the section for its first two numbers (for example [0.3.x] for 0.3.57), or else the newest section.
// Both release workflows run this, so the Windows and Android builds publish the same notes.
const fs = require('fs');
const v = require('../package.json').version;
const [a, b] = v.split('-')[0].split('.');
const t = fs.existsSync('CHANGELOG.md') ? fs.readFileSync('CHANGELOG.md', 'utf8') : '';
const secs = t.split(/^## /m).filter((s) => s.startsWith('['));
const sec = secs.find((s) => s.startsWith('[' + v + ']')) || secs.find((s) => s.startsWith('[' + a + '.' + b + '.x]')) || secs[0];
const body = sec ? sec.replace(/^.*\r?\n/, '').trim() : '';
const beta = '\n\nThis is a beta release, so expect some rough edges. Every push makes a new beta, and it installs over your current one.';
fs.writeFileSync('RELEASE_NOTES.md', '# Kinora ' + v + '\n\n' + (body || 'Kinora ' + v) + beta + '\n');

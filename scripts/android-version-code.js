// Encode the user-facing SemVer as Android's monotonically increasing numeric versionCode.
const [major, minor, patch] = require('../package.json').version
  .split('-')[0]
  .split('.')
  .map(Number);

if (![major, minor, patch].every(Number.isInteger) || minor >= 100 || patch >= 10000) {
  throw new Error('Android versionCode requires SemVer with minor < 100 and patch < 10000');
}

const code = major * 1_000_000 + minor * 10_000 + patch;
if (code <= 0 || code > 2_100_000_000) {
  throw new Error('Android versionCode is outside Android’s supported range');
}

process.stdout.write(String(code));

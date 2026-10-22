// Run once from the Kinora repo folder:  node apply-all.js
// Installs the v5 to v8 upgrades (safe to run again).
const fs = require('fs'), path = require('path');
const here = __dirname, www = path.join(here, 'www'), idx = path.join(www, 'index.html');
if (!fs.existsSync(idx)) { console.error('Run this inside the Kinora repo folder (the one that contains "www").'); process.exit(1); }
const files = ['v5.css', 'v5.js', 'v6.css', 'v6.js', 'v7.css', 'v7.js', 'v8.css', 'v8.js'];
for (const f of files) fs.copyFileSync(path.join(here, f), path.join(www, f));
const ao = path.join(here, 'android-overrides');
if (fs.existsSync(ao)) fs.copyFileSync(path.join(here, 'MainActivity.java'), path.join(ao, 'MainActivity.java'));
let h = fs.readFileSync(idx, 'utf8');
for (const v of ['v5', 'v6', 'v7', 'v8']) {
  if (!h.includes(v + '.css')) h = h.replace('</head>', `<link rel="stylesheet" href="${v}.css">\n</head>`);
  if (!h.includes(v + '.js')) h = h.replace('<script>boot()</script>', `<script src="${v}.js"></script>\n<script>boot()</script>`);
}
fs.writeFileSync(idx, h);
console.log('Kinora upgrades applied. Now commit and push, then rebuild the apps.');

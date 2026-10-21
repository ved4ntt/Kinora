// Run once from the Kinora repo folder:  node apply-v5.js
const fs = require('fs'), path = require('path');
const here = __dirname, www = path.join(here, 'www'), idx = path.join(www, 'index.html');
if (!fs.existsSync(idx)) { console.error('Run this inside the Kinora repo folder (the one that contains "www").'); process.exit(1); }
for (const f of ['v5.css', 'v5.js']) fs.copyFileSync(path.join(here, f), path.join(www, f));
let h = fs.readFileSync(idx, 'utf8');
if (!h.includes('v5.css')) h = h.replace('</head>', '<link rel="stylesheet" href="v5.css">\n</head>');
if (!h.includes('v5.js')) h = h.replace('<script>boot()</script>', '<script src="v5.js"></script>\n<script>boot()</script>');
fs.writeFileSync(idx, h);
console.log('Kinora v5 applied. Now commit and push.');

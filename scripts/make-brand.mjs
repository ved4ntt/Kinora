// Draws Kinora's launcher icon and splash images from the K mark. Run before `capacitor-assets generate`.
//   npm i --no-save sharp && node scripts/make-brand.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const PATHS = [
  'M520 272Q538 268 538 292V948Q538 968 516 958L362 862Q340 846 340 820V432Q340 396 366 376Z',
  'M548 642L738 406Q752 392 782 392H914Q936 394 924 412L692 660Q672 686 640 676Q586 662 548 642Z',
  'M548 690Q650 688 722 726Q790 764 872 884L932 944Q942 958 920 962H772Q724 956 694 912L588 762Q556 726 548 690Z',
];
const BB = { x: 340, y: 268, w: 598, h: 700 };

const DEFS = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#182234"/><stop offset=".55" stop-color="#0c1119"/><stop offset="1" stop-color="#05070a"/></linearGradient>
  <radialGradient id="glow" cx=".3" cy=".18" r=".9"><stop offset="0" stop-color="#7fa4e8" stop-opacity=".22"/><stop offset=".5" stop-color="#7fa4e8" stop-opacity="0"/></radialGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="kf" gradientUnits="userSpaceOnUse" x1="340" y1="268" x2="938" y2="968"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e4e1d8"/><stop offset="1" stop-color="#b9b4a8"/></linearGradient>
  <linearGradient id="kt" gradientUnits="userSpaceOnUse" x1="0" y1="268" x2="0" y2="620"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="16"/><feOffset dy="22"/><feComponentTransfer><feFuncA type="linear" slope=".5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

// the mark, centred at (cx, cy) with the given height
function mark(cx, cy, h, { shadow = true } = {}) {
  const s = h / BB.h;
  const tx = cx - (BB.x + BB.w / 2) * s, ty = cy - (BB.y + BB.h / 2) * s;
  const d = PATHS.map((p) => `<path d="${p}"/>`).join('');
  return `<g transform="translate(${tx} ${ty}) scale(${s})">
    <g fill="url(#kf)" ${shadow ? 'filter="url(#sh)"' : ''}>${d}</g>
    <g fill="url(#kt)">${d}</g>
  </g>`;
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;
const bg = (w, h, r = 0) => `<rect width="${w}" height="${h}" rx="${r}" fill="url(#bg)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#glow)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#sheen)"/>`;

const out = async (name, markup) => { await sharp(Buffer.from(markup)).png().toFile(name); console.log('wrote', name); };

mkdirSync('assets', { recursive: true });
mkdirSync('build', { recursive: true });

// adaptive icon layers (the visible area is the middle two thirds, so the mark stays inside it)
await out('assets/icon-background.png', svg(1024, 1024, bg(1024, 1024)));
await out('assets/icon-foreground.png', svg(1024, 1024, mark(512, 520, 470)));
// full icon (legacy launchers, Windows, store listings)
await out('assets/icon-only.png', svg(1024, 1024, bg(1024, 1024, 232) + mark(512, 520, 560)));
await out('build/icon.png', svg(1024, 1024, bg(1024, 1024, 232) + mark(512, 520, 560)));
// splash: same dark colour as the app, mark in the middle
const splash = svg(2732, 2732, `<rect width="2732" height="2732" fill="#07080b"/><rect width="2732" height="2732" fill="url(#glow)" opacity=".55"/>${mark(1366, 1366, 560)}`);
await out('assets/splash.png', splash);
await out('assets/splash-dark.png', splash);

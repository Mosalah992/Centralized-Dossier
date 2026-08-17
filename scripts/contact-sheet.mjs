// A contact sheet of the eight volumes as the shelf actually draws them.
//
// The covers stopped carrying their own titles: scripts/prepare-volumes.mjs
// clears a lettering panel in each binding and the shelf sets the name live
// over it. That means a cover can no longer be reviewed by opening the .webp —
// half of what a reader sees is type the browser lays out, and whether it sits
// in its panel is a question only a browser can answer. So this takes the real
// build, in a real browser, and photographs the eight books side by side.
//
// It builds first and serves `dist`, rather than driving the dev server, so
// what is photographed is the bundle that would be deployed. The gate and the
// shelf listing are answered by the harness: the archivist is not reachable
// from here, has nothing to do with how a cover renders, and stubbing the two
// of them is what lets this run with no credentials at all.
//
// Playwright is deliberately NOT a dependency of this project. It exists to
// make a review picture, not to build the site, and adding a browser download
// to every install for that would be a poor trade. Install it for the run:
//
//   npm run build
//   npm install --no-save playwright
//   node scripts/contact-sheet.mjs
//
// Output: docs/volume-covers.png

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs', 'volume-covers.png');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('dist/ is missing or empty — run `npm run build` first');
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg',
};

// Everything the SPA does not have a file for falls through to index.html,
// which is what _redirects does in production.
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.join(DIST, url.pathname);
  const target = fs.existsSync(file) && fs.statSync(file).isFile()
    ? file
    : path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// PLAYWRIGHT_CHROMIUM lets a machine that already has a Chromium point at it
// rather than download a second one to match whatever playwright version was
// installed for the run.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
// Two device pixels per CSS pixel: the covers are 400px wide and the shelf
// draws them at about 230, so a 1x shot would be judging the type at half the
// resolution the panel was cut at.
// Tall enough that the whole cabinet is in view at once: the clips below are
// taken in viewport coordinates, and a book scrolled off the bottom cannot be
// photographed.
const page = await browser.newPage({ viewport: { width: 1440, height: 3200 }, deviceScaleFactor: 2 });

// Read off the registry rather than listed here, so a volume added to
// shared/volumes.ts turns up on the contact sheet bound rather than withdrawn.
// A regex and not an import: the registry is TypeScript and this is a plain
// .mjs run under the pinned Node 18, which cannot load it. The shelf only ever
// asks this payload one question — which slugs have a live tab — so the slug
// is the only field that has to be right.
const slugs = [...fs.readFileSync(path.join(ROOT, 'shared', 'volumes.ts'), 'utf8')
  .matchAll(/^\s+slug: '([a-z]+)',$/gm)].map(([, slug]) => slug);

await page.route('**/api/gate', (route) => route.fulfill({ json: { open: true } }));
await page.route('**/api/volumes', (route) => route.fulfill({
  json: {
    reachable: true,
    fetchedAtUtc: '2026-01-01T00:00:00.000Z',
    // Every volume present and bound, which is the state a cover should be
    // reviewed in — a withdrawn one is greyed out and says nothing about type.
    volumes: slugs.map((slug) => ({ slug, tab: slug })),
  },
}));

await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('.book__title');
await page.evaluate(() => document.fonts.ready.then(() => true));

// The dust motes drift on a loop and the torches are animated frames; both
// would put a different picture in the diff on every run.
await page.addStyleTag({ content: '.hall__dust, .hall__torch { display: none !important; }' });

// Photographed one book at a time and tiled, rather than shooting the cabinet
// whole. The cabinet gives Chronicles a shelf of its own across the full width,
// which is right on the page and leaves half a contact sheet empty — and the
// books come out small enough that the lettering, the thing being reviewed,
// cannot be read.
const GAP = 18;
const shots = [];
for (const book of await page.locator('.book').all()) {
  const box = await book.boundingBox();
  shots.push({
    slug: (await book.getAttribute('href')).split('/').pop(),
    // A little air, so the drop shadow under each volume is not sliced off at
    // the element's own box.
    buffer: await page.screenshot({
      clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 26 },
    }),
  });
}

await browser.close();
server.close();

const tiles = await Promise.all(shots.map(async ({ slug, buffer }) => ({
  slug, buffer, meta: await sharp(buffer).metadata(),
})));

const cellW = Math.max(...tiles.map((t) => t.meta.width));
const cellH = Math.max(...tiles.map((t) => t.meta.height));
const COLUMNS = 4;
const rows = Math.ceil(tiles.length / COLUMNS);
const CAPTION = 52;
const sheetW = COLUMNS * cellW + (COLUMNS + 1) * GAP;
const sheetH = rows * (cellH + CAPTION) + (rows + 1) * GAP;

const captions = tiles.map(({ slug }, i) => {
  const cx = GAP + (i % COLUMNS) * (cellW + GAP) + cellW / 2;
  const cy = GAP + Math.floor(i / COLUMNS) * (cellH + CAPTION + GAP) + cellH + 34;
  return `<text x="${cx}" y="${cy}" font-family="Georgia, serif" font-size="26"
    letter-spacing="4" fill="#9c8a63" text-anchor="middle">${slug.toUpperCase()}</text>`;
});

await sharp({
  create: { width: sheetW, height: sheetH, channels: 4, background: '#15110d' },
})
  .composite([
    ...tiles.map(({ buffer }, i) => ({
      input: buffer,
      left: GAP + (i % COLUMNS) * (cellW + GAP),
      top: GAP + Math.floor(i / COLUMNS) * (cellH + CAPTION + GAP),
    })),
    { input: Buffer.from(`<svg width="${sheetW}" height="${sheetH}">${captions.join('')}</svg>`), top: 0, left: 0 },
  ])
  // Quantised, which takes it from four megabytes to one. This is a review
  // picture living in a public repository beside a 3.4MB audio file nobody
  // wanted either; the banding it costs is in the cabinet's backdrop, and the
  // lettering — the only thing anyone opens this to look at — is untouched.
  .png({ palette: true, quality: 90, effort: 10 })
  .toFile(OUT);

console.log(`wrote ${path.relative(ROOT, OUT)} — ${tiles.length} volumes, ${sheetW}x${sheetH}`);

// The Scribe's sample sheet: every sample in scribe/samples.ts drawn through
// the real renderer, saved one by one and laid out on one contact sheet.
//
//   node scripts/scribe-samples.mjs <out-dir> [signature=<woff>] [printed=<woff>] [hand=<woff>]
//
// The optional font arguments draw the same samples in other faces, which is
// how alternatives are put side by side before a face is changed in the Worker.
//
// It renders in Node rather than through the Worker so that a face can be
// swapped without rebuilding the bundle; the drawing code is the same module.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, ...overrides] = process.argv.slice(2);
if (!outArg) {
  console.error('usage: node scripts/scribe-samples.mjs <out-dir> [signature=<woff>] [printed=<woff>] [hand=<woff>]');
  process.exit(1);
}
const OUT = path.resolve(outArg);
fs.mkdirSync(OUT, { recursive: true });

// Bundled beside node_modules so the packages left external still resolve.
const cache = path.join(ROOT, 'node_modules/.cache/scribe-samples');
fs.mkdirSync(cache, { recursive: true });
const bundle = path.join(cache, `render-${process.pid}.mjs`);
await build({
  stdin: {
    contents: [
      "export { init as initSatori } from 'satori/standalone';",
      "export { initWasm as initResvg } from '@resvg/resvg-wasm';",
      "export { parchmentPng } from './scribe/src/render.ts';",
      "export { SAMPLES } from './scribe/samples.ts';",
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  outfile: bundle,
  logLevel: 'warning',
});
const scribe = await import(pathToFileURL(bundle).href);
fs.rmSync(bundle);

const read = (file) => {
  const bytes = fs.readFileSync(path.resolve(ROOT, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

await scribe.initSatori(read('node_modules/satori/yoga.wasm'));
await scribe.initResvg(read('node_modules/@resvg/resvg-wasm/index_bg.wasm'));

const assets = {
  signature: read('node_modules/@fontsource/mr-de-haviland/files/mr-de-haviland-latin-400-normal.woff'),
  printed: read('node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff'),
  hand: read('node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff'),
  handBold: read('node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff'),
  parchment: Object.fromEntries([1200, 1500, 1850, 2200].map((h) => [h, read(`scribe/assets/parchment-${h}.jpg`)])),
  seal: read('scribe/assets/seal-aldmeri.png'),
};
for (const override of overrides) {
  const [role, file] = override.split('=');
  if (!['signature', 'printed', 'hand'].includes(role) || !file) throw new Error(`Not a face: ${override}`);
  assets[role] = read(file);
  if (role === 'hand') assets.handBold = assets.hand;
}

const drawn = [];
for (const [index, sample] of scribe.SAMPLES.entries()) {
  const started = performance.now();
  const png = await scribe.parchmentPng(sample.request, assets);
  const ms = performance.now() - started;
  const file = path.join(OUT, `${String(index + 1).padStart(2, '0')}-${sample.request.filing.importance}-${sample.request.filing.category}.png`);
  fs.writeFileSync(file, png);
  drawn.push({ file, label: sample.label });
  console.log(`${path.basename(file)}  ${(png.byteLength / 1024).toFixed(0)} KB  ${ms.toFixed(0)} ms`);
}

// The contact sheet, on Discord's own dark ground, four across.
const THUMB = 520;
const GAP = 36;
const LABEL = 46;
const ACROSS = 4;
const thumbs = await Promise.all(
  drawn.map(async ({ file, label }) => {
    const buffer = await sharp(file).resize({ width: THUMB }).png().toBuffer();
    const { height } = await sharp(buffer).metadata();
    return { buffer, height, label };
  }),
);
const rows = [];
for (let i = 0; i < thumbs.length; i += ACROSS) rows.push(thumbs.slice(i, i + ACROSS));
const rowHeights = rows.map((row) => Math.max(...row.map((t) => t.height)) + LABEL);
const width = ACROSS * THUMB + (ACROSS + 1) * GAP;
const height = rowHeights.reduce((a, b) => a + b + GAP, GAP);
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const composite = [];
let y = GAP;
rows.forEach((row, r) => {
  row.forEach((thumb, c) => {
    const x = GAP + c * (THUMB + GAP);
    composite.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB}" height="${LABEL}"><text x="${THUMB / 2}" y="30" fill="#dbdee1" font-family="Segoe UI, sans-serif" font-size="22" text-anchor="middle">${escape(thumb.label)}</text></svg>`,
      ),
      left: x,
      top: y,
    });
    composite.push({ input: thumb.buffer, left: x, top: y + LABEL });
  });
  y += rowHeights[r] + GAP;
});
const sheetFile = path.join(OUT, 'sample-sheet.png');
await sharp({ create: { width, height, channels: 3, background: '#313338' } }).composite(composite).png().toFile(sheetFile);
console.log(`sample-sheet.png  ${width}×${height}`);

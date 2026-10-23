#!/usr/bin/env node
// The Solar's war-table map: the First Emissary's combined map of Skyrim with
// County Bruma beneath the Jerall Mountains (Assets/Compined map.png, which
// replaced the two charts laid together on 2026-10-23). Writes into
// web/src/assets/solar/:
//
//   realm-map.webp          the map spread out to pan and zoom (MapViewer).
//                           Drawn at twice the source's size with a fine
//                           resampler, so the viewer has pixels to zoom into
//                           rather than leaving the browser to stretch them.
//   realm-map-table.webp    the map on the table, at the source's own size.
//   realm-map-glimpse.webp  what the room sees of the Solar behind Ancarion's
//                           portrait when it swings open: small, since it is
//                           only ever seen dim and tilted.
//
// The pieces on the map are stored as fractions of this image (shared/solar.ts),
// so changing its framing moves the land under every piece already set down:
// change it only with the table cleared.
//
//   node scripts/prepare-solar-map.mjs

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'Assets/Compined map.png';
const OUT = 'web/src/assets/solar';

const { width, height } = await sharp(SOURCE).metadata();
mkdirSync(OUT, { recursive: true });

const outputs = [
  // [name, width, quality, sharpen]
  ['realm-map', width * 2, 84, true],
  ['realm-map-table', width, 82, false],
  ['realm-map-glimpse', 480, 60, false],
];

for (const [name, w, quality, sharpen] of outputs) {
  let image = sharp(SOURCE).resize({ width: w, kernel: 'lanczos3' });
  // A light unsharp mask restores the ink lines' edges after enlarging.
  if (sharpen) image = image.sharpen({ sigma: 0.7, m1: 0.6, m2: 1.4 });
  const file = `${OUT}/${name}.webp`;
  const info = await image.webp({ quality, effort: 6 }).toFile(file);
  console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}
console.log(`aspect ${width}/${height}`);

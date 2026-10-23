#!/usr/bin/env node
// Lays the Solar's war-table map: the Skyrim chart with the County Bruma chart
// set over its southern edge where Bruma lies, just over the Jerall Mountains
// from Helgen and the Pale Pass, as two sheets lie together on a table. Writes
// web/src/assets/solar/realm-map.webp (for the enlarged map) and
// realm-map-table.webp (for the table), with the table showing round them.
//
// The pieces on the map are stored as fractions of THIS image (shared/solar.ts),
// so moving the sheets here moves the land under every piece already set down:
// change it only with the table cleared, or not at all.
//
//   node scripts/prepare-solar-map.mjs

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SKYRIM = 'Assets/skyrim map.png'; // 5750 x 3486
const BRUMA = 'Assets/bruma map.png'; // 860 x 660
const OUT = 'web/src/assets/solar';

const SKY_W = 5750;
const SKY_H = 3486;
// The Bruma sheet: scaled, turned a little as a hand lays it, its centre under
// the Pale Pass, its top edge over the Skyrim sheet's southern margin.
const BRUMA_SCALE = 1.65;
const BRUMA_TURN = -1.6; // degrees
const BRUMA_CENTRE_X = 3260;
const BRUMA_TOP = 3110;
const SHADOW = 34;

const bw = Math.round(860 * BRUMA_SCALE);
const bh = Math.round(660 * BRUMA_SCALE);

// The sheet's edge: a thin dark line round the chart, so it reads as paper laid
// on paper rather than a picture pasted in.
const sheet = await sharp(BRUMA)
  .resize(bw, bh, { kernel: 'lanczos3' })
  .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#efe4cc' })
  .extend({ top: 2, bottom: 2, left: 2, right: 2, background: '#5b4a33' })
  .png()
  .toBuffer();
const turned = await sharp(sheet).rotate(BRUMA_TURN, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const tm = await sharp(turned).metadata();

// Its shadow on the table and on the Skyrim sheet beneath.
const shadow = await sharp({
  create: { width: tm.width + SHADOW * 4, height: tm.height + SHADOW * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp(turned).ensureAlpha().extractChannel('alpha').toColourspace('b-w').toBuffer().then((alpha) =>
        sharp({ create: { width: tm.width, height: tm.height, channels: 3, background: '#000' } })
          .joinChannel(alpha)
          .png()
          .toBuffer(),
      ),
      left: SHADOW * 2,
      top: SHADOW * 2,
    },
  ])
  .blur(SHADOW / 2)
  .linear([1, 1, 1, 0.55], [0, 0, 0, 0])
  .png()
  .toBuffer();

const left = Math.round(BRUMA_CENTRE_X - tm.width / 2);
const H = Math.max(SKY_H, BRUMA_TOP + tm.height + SHADOW);

const map = await sharp({ create: { width: SKY_W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: SKYRIM, left: 0, top: 0 },
    { input: shadow, left: left - SHADOW * 2 + 10, top: BRUMA_TOP - SHADOW * 2 + 18 },
    { input: turned, left, top: BRUMA_TOP },
  ])
  .png()
  .toBuffer();

mkdirSync(OUT, { recursive: true });
for (const [name, width, quality] of [['realm-map', 4096, 74], ['realm-map-table', 1600, 78]]) {
  const file = `${OUT}/${name}.webp`;
  const info = await sharp(map).resize({ width, kernel: 'lanczos3' }).webp({ quality, alphaQuality: 80, effort: 6 }).toFile(file);
  console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}
console.log(`aspect ${SKY_W}/${H}; Bruma sheet ${left},${BRUMA_TOP} ${tm.width}x${tm.height}`);

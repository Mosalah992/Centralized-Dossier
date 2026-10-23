#!/usr/bin/env node
// Cuts the room's candle out of Assets/Candle.png and writes it into
// web/src/assets/candle/: the candle and its holder with the painted flame
// lifted off (the flame is drawn live, web/src/room/candle-flame.ts), and the
// painted flame by itself, which stands in for the live one when a reader asks
// for less motion or the browser has no WebGL.
//
// Both images share one frame, so the live flame and the still one sit on the
// same wick. The wick's place in that frame is WICK, mirrored in Candle.tsx.
//
//   node scripts/prepare-candle.mjs

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'Assets/Candle.png';
const OUT = 'web/src/assets/candle';
// The frame, in source pixels: the holder's foot to the flame's tip.
const BOX = { left: 600, top: 300, width: 690, height: 1610 };
// The candle's top rim, in source rows: above it is flame, below it candle.
const RIM = 640;
// Below the rim the painted glow still tints the candle's flanks for a while.
const GLOW_REACH = 880;
// CSS pixels high at 1x; the 2x copy is twice this.
const HEIGHT = 300;

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;

/** The painted glow: translucent, warm and light. */
const glowAt = (i) => {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  return a <= 245 && r > 150 && g > 120 && b < 190 && r >= b;
};
const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

const body = Buffer.from(data);
const flame = Buffer.from(data);
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (y < RIM) {
      body[i + 3] = 0; // all flame and glow
      continue;
    }
    flame[i + 3] = 0;
    const a = data[i + 3];
    if (y < GLOW_REACH && glowAt(i)) body[i + 3] = 0;
    // The cut-out's pale halo, which reads as a fringe on the room's dark
    // wall: translucent and light. The holder's own soft edge is dark and stays.
    else if (a < 200 && lum(i) > 70) body[i + 3] = 0;
    else if (a < 240 && lum(i) > 100) body[i + 3] = a >> 2;
  }
}

mkdirSync(OUT, { recursive: true });
for (const [name, pixels] of [['candle', body], ['candle-flame', flame]]) {
  for (const scale of [1, 2]) {
    const h = HEIGHT * scale;
    const file = `${OUT}/${name}${scale === 1 ? '' : '@2x'}.webp`;
    await sharp(pixels, { raw: { width: W, height: info.height, channels: 4 } })
      .extract(BOX)
      .resize({ height: h, kernel: 'lanczos3' })
      .webp({ quality: 86, alphaQuality: 90, effort: 6 })
      .toFile(file);
    console.log(file);
  }
}

// Where the wick stands in the frame, as fractions of it.
const WICK = { x: (930 - BOX.left) / BOX.width, y: (625 - BOX.top) / BOX.height };
console.log('wick', WICK.x.toFixed(3), WICK.y.toFixed(3), 'aspect', `${BOX.width}/${BOX.height}`);

// Prepare the two candle sconces that flank the hall.
//
// The art is a 48x48 pixel-art sprite in eight rotations. `west` and `east` are
// a natural mirror pair — the tall candle leans opposite ways — so they are used
// on the left and right of the cabinet respectively, splaying outward to frame
// it. The other six rotations are unused.
//
// Pixel art fights fluid layout: at a non-integer scale `image-rendering:
// pixelated` doubles some pixels and not others, which shimmers on art this
// small. So the sprite is blown up 4x here with nearest-neighbour — hard edges,
// no invented colour — and the page then scales that DOWN to whatever the
// viewport gives it, using ordinary smoothing. Crisp blocks, no shimmer, and no
// dependence on the CSS size landing on a multiple of 48.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'Assets', 'Animated_skyrim_style_candles', 'rotations');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'assets');

const SCALE = 4;
const SIDES = [
  { side: 'left', rotation: 'west' },
  { side: 'right', rotation: 'east' },
];

for (const { side, rotation } of SIDES) {
  const src = path.join(SRC_DIR, `${rotation}.png`);
  const { width, height } = await sharp(src).metadata();

  const out = path.join(OUT_DIR, `candle-${side}.webp`);
  const result = await sharp(src)
    .resize(width * SCALE, height * SCALE, { kernel: 'nearest' })
    // Lossless: pixel art has flat colour fields and hard edges, which lossy
    // WebP smears exactly where the whole look lives.
    .webp({ lossless: true, effort: 6 })
    .toFile(out);

  console.log(
    `candle-${side.padEnd(5)} <- ${rotation.padEnd(4)} `
    + `${width}x${height} -> ${result.width}x${result.height}  ${result.size} bytes`,
  );
}

console.log(`\nwrote 2 sconces to ${path.relative(ROOT, OUT_DIR)}`);

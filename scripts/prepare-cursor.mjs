#!/usr/bin/env node
// Cuts the Thalmor gauntlet cursor out of Assets/cursor/thalmor gloves cursor.jfif
// and writes it at 1x and 2x into web/src/assets/cursor/.
//
// The source is a JPEG with a transparency checkerboard painted into it, a
// pale outline around the gauntlet, and a white glint at the fingertip; none
// of those can be lifted off the checkerboard, so the gauntlet is cut out by
// its own dark silhouette and the outline is drawn back as a gold rim in the
// archive's colour (--gold, #c9a227). The glint is left off: the fingertip
// sparks when the reader clicks instead. Nothing else is added. It is tilted left, as an arrow cursor
// leans, so the fingertip is the top-left point the click lands on.
//
//   node scripts/prepare-cursor.mjs

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'Assets/cursor/thalmor gloves cursor.jfif';
const OUT = 'web/src/assets/cursor';
const SIZE = 40; // CSS pixels, both ways. Chromium hides cursors over 32px only where they cross its own UI, at the window's edge.
const TILT = -28; // degrees, anticlockwise: the lean of an arrow cursor.

const GOLD = [201, 162, 39];
const GOLD_BRIGHT = [232, 205, 122];

const { data: rgb, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const lum = (i) => 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];

// 1. Everything light that can be reached from the border is background: the
//    checkerboard, the painted outline, the glint. What cannot be reached is
//    the gauntlet, its gold inlay enclosed by its dark edge.
const outside = new Uint8Array(W * H);
const light = (p) => lum(p * 3) >= 118;
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop();
  if (outside[p] || !light(p)) continue;
  outside[p] = 1;
  const x = p % W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (p >= W) stack.push(p - W);
  if (p < W * (H - 1)) stack.push(p + W);
}

// 2. Keep only the largest piece: JPEG noise leaves a few dark specks.
const label = new Int32Array(W * H).fill(-1);
let best = -1;
let bestSize = 0;
for (let s = 0, id = 0; s < W * H; s++) {
  if (outside[s] || label[s] !== -1) continue;
  let size = 0;
  const q = [s];
  label[s] = id;
  while (q.length) {
    const p = q.pop();
    size++;
    const x = p % W;
    for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (n < 0 || n >= W * H || outside[n] || label[n] !== -1) continue;
      label[n] = id;
      q.push(n);
    }
  }
  if (size > bestSize) { bestSize = size; best = id; }
  id++;
}

// 3. The gauntlet on transparency, its gold inlay drawn a little toward the
//    archive's gold. Bounding box for the crop; topmost pixel is the fingertip.
let minX = W, minY = H, maxX = 0, maxY = 0;
const rgba = Buffer.alloc(W * H * 4);
for (let p = 0; p < W * H; p++) {
  if (label[p] !== best) continue;
  const x = p % W;
  const y = (p / W) | 0;
  minY = Math.min(minY, y);
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  let [r, g, b] = [rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]];
  const warm = r - b;
  if (warm > 28 && lum(p * 3) > 70) {
    const k = Math.min(0.45, (warm - 28) / 120);
    r = r + (GOLD_BRIGHT[0] - r) * k;
    g = g + (GOLD_BRIGHT[1] - g) * k;
    b = b + (GOLD_BRIGHT[2] - b) * k;
  }
  rgba.set([r, g, b, 255], p * 4);
}

// The glint was painted over the fingertip, and the lit pixels it left on the
// finger read as a speck; the fingertip takes the glove's own dark instead.
{
  let tip = -1;
  for (let p = 0; p < W * H && tip < 0; p++) if (label[p] === best) tip = p;
  const tx = tip % W;
  const ty = (tip / W) | 0;
  for (let y = ty; y < Math.min(H, ty + 40); y++) {
    for (let x = Math.max(0, tx - 40); x < Math.min(W, tx + 40); x++) {
      const p = y * W + x;
      if (label[p] !== best || Math.hypot(x - tx, y - ty) > 40) continue;
      const i = p * 4;
      const l = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      if (l <= 58) continue;
      const k = 58 / l;
      rgba[i] *= k; rgba[i + 1] *= k; rgba[i + 2] *= k;
    }
  }
}

const pad = 40; // room to turn without clipping
const box = { left: minX - pad, top: minY - pad, width: maxX - minX + 1 + pad * 2, height: maxY - minY + 1 + pad * 2 };
const cut = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract(box).png().toBuffer();

// 4. Lean it like an arrow, then crop to what is there.
const { data: turned, info: ti } = await sharp(cut)
  .rotate(TILT, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .raw()
  .toBuffer({ resolveWithObject: true });
let tx0 = ti.width, ty0 = ti.height, tx1 = 0, ty1 = 0;
for (let y = 0; y < ti.height; y++) {
  for (let x = 0; x < ti.width; x++) {
    if (turned[(y * ti.width + x) * 4 + 3] < 24) continue;
    tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y);
  }
}
const leaned = await sharp(turned, { raw: { width: ti.width, height: ti.height, channels: 4 } })
  .extract({ left: tx0, top: ty0, width: tx1 - tx0 + 1, height: ty1 - ty0 + 1 })
  .png()
  .toBuffer();
const lw = tx1 - tx0 + 1;
const lh = ty1 - ty0 + 1;

mkdirSync(OUT, { recursive: true });
for (const scale of [1, 2]) {
  // Fit inside SIZE x SIZE, a device pixel clear on every side for the rim.
  const room = SIZE * scale - 2;
  const k = Math.min(room / lw, room / lh);
  const iw = Math.max(1, Math.round(lw * k));
  const ih = Math.max(1, Math.round(lh * k));
  const { data: inner } = await sharp(leaned).resize(iw, ih, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const w = iw + 2;
  const h = ih + 2;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < ih; y++) inner.copy(data, ((y + 1) * w + 1) * 4, y * iw * 4, (y + 1) * iw * 4);

  // The rim: one device pixel of gold just outside the silhouette.
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const here = a(x, y);
      if (here > 200) continue;
      const near = Math.max(a(x - 1, y), a(x + 1, y), a(x, y - 1), a(x, y + 1));
      const rim = Math.max(0, near - here) * 0.85;
      if (rim < 8) continue;
      const i = (y * w + x) * 4;
      const t = here / 255;
      out[i] = GOLD[0] * (1 - t) + data[i] * t;
      out[i + 1] = GOLD[1] * (1 - t) + data[i + 1] * t;
      out[i + 2] = GOLD[2] * (1 - t) + data[i + 2] * t;
      out[i + 3] = Math.max(here, rim);
    }
  }

  // The fingertip, where the click lands (the hotspot): the topmost solid
  // pixel, which the lean has made the top-left of the cursor. The spark is
  // the page's, struck there on each click (web/src/click-spark.ts).
  let sx = 0, sy = -1;
  for (let y = 0; y < h && sy < 0; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 140) { sx = x; sy = y; break; }
    }
  }
  const file = `${OUT}/gauntlet${scale === 1 ? '' : '@2x'}.png`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toFile(file);
  console.log(`${file}: ${w}x${h}, hotspot ${Math.round(sx / scale)} ${Math.round(sy / scale)} (css px)`);
}

// The Scribe's parchment and seal, generated rather than photographed.
//
//   node scripts/make-scribe-parchment.mjs
//
// Writes web/src/assets/scribe/parchment-<height>.jpg, the sheet every filing is drawn on,
// and web/src/assets/scribe/seal-aldmeri.png, the Clerk's gold seal at the size the
// renderer presses it.
//
// WHY ARITHMETIC. The renderer is not allowed AI or stock art (the team's
// requirement, 2026-11-02), and like make-cabinet-wood.mjs the licensing
// question disappears when nothing came from anywhere. The seed is fixed, so a
// re-run writes the same bytes and the committed file never drifts.
//
// WHY A JPEG. resvg decodes PNG and JPEG; the texture is opaque and noisy, which
// is the case a JPEG is for. The renderer clips the sheet to a torn edge itself
// (web/src/scribe/Parchment.tsx), so the transparency around it costs nothing here.
//
// WHY THE FINE GRAIN IS FAINT. The renderer's output is a PNG, and a PNG pays
// for every bit of high-frequency noise in the picture. The sheet's character
// comes from the slow blotches, the fibres and the foxing; the pixel grain is
// kept just strong enough to stop the flat areas reading as a gradient.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'web/src/assets/scribe');
const SEAL_SRC = path.join(ROOT, 'web/src/assets/gate-seal.webp');

/**
 * The renderer's page sizes (web/src/scribe/Parchment.tsx, FITS). One sheet is made
 * for each so it is drawn at 1:1: resampling a stretched sheet was two thirds
 * of resvg's time on every parchment.
 */
const W = 1100;
const HEIGHTS = [1200, 1500, 1850, 2200];

// ── Seeded noise ────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer lattice hash to 0..1, so value noise needs no table. */
function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal noise, roughly -1..1. */
function fbm(x, y, octaves, seed) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * (valueNoise(x, y, seed + o * 101) * 2 - 1);
    norm += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

// ── The sheet ───────────────────────────────────────────────────────────────

/** Fresh vellum at the heart of the sheet, and the umber it browns to at the edge. */
const HEART = [236, 222, 186];
const EDGE = [176, 136, 84];
const FOX = [150, 98, 48];

const random = mulberry32(0x5c41be);

/**
 * Foxing: small rust spots, as old paper takes from iron in the pulp. Placed
 * down the sheet as a fraction of its height, so every size is the same sheet.
 */
const SPOTS = Array.from({ length: 26 }, () => ({
  x: random() * W,
  y: random(),
  r: 3 + random() ** 2.4 * 30,
  depth: 0.25 + random() * 0.45,
}));

/** Two faint tide marks where something wet once stood on it. */
const RINGS = [
  { x: W * 0.78, y: 0.7, r: 150, width: 9, depth: 0.12 },
  { x: W * 0.16, y: 0.18, r: 95, width: 6, depth: 0.08 },
];

function sheet(H) {
  const px = Buffer.alloc(W * H * 3);
  const spots = SPOTS.map((s) => ({ ...s, y: s.y * H }));
  const rings = RINGS.map((ring) => ({ ...ring, y: ring.y * H }));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // How far into the sheet, 0 at the edge, measured to the nearer side and
      // roughened so the browning is not a ruled frame.
      const edgeDistance = Math.min(x, W - 1 - x, (y * W) / H, ((H - 1 - y) * W) / H);
      const ragged = edgeDistance + fbm(x / 60, y / 60, 3, 7) * 26;
      const toEdge = Math.max(0, 1 - ragged / 150);
      // Corners brown first, being handled most.
      const cx = Math.abs(x / W - 0.5) * 2;
      const cy = Math.abs(y / H - 0.5) * 2;
      const corner = Math.max(0, cx * cy - 0.55) * 1.4;

      let age = toEdge ** 1.7 * 0.85 + corner * 0.5;
      // Slow blotches across the whole sheet.
      age += fbm(x / 340, y / 340, 4, 11) * 0.14 + 0.06;
      age = Math.min(1, Math.max(0, age));

      let r = HEART[0] + (EDGE[0] - HEART[0]) * age;
      let g = HEART[1] + (EDGE[1] - HEART[1]) * age;
      let b = HEART[2] + (EDGE[2] - HEART[2]) * age;

      // Fibres: long in x, thin in y, as the pulp was laid.
      const fibre = fbm(x / 160, y / 7, 3, 23) * 3.2;
      // Mottling between the blotches and the fibres, so no area is flat.
      const mottle = fbm(x / 48, y / 48, 3, 29) * 3.5;
      // Pixel grain, kept faint (see the note at the top).
      const grain = (valueNoise(x / 1.6, y / 1.6, 31) - 0.5) * 3;
      const lift = fibre + mottle + grain;
      r += lift;
      g += lift;
      b += lift * 0.8;

      let fox = 0;
      for (const s of spots) {
        const d = Math.hypot(x - s.x, y - s.y);
        if (d > s.r * 2.2) continue;
        const rough = s.r * (1 + fbm(x / 22, y / 22, 2, 41) * 0.3);
        fox = Math.max(fox, s.depth * smooth(Math.max(0, 1 - d / (rough * 1.5))));
      }
      for (const ring of rings) {
        const d = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ring.r * (1 + fbm(x / 40, y / 40, 2, 53) * 0.06));
        if (d < ring.width * 2.5) fox = Math.max(fox, ring.depth * Math.exp(-((d / ring.width) ** 2)));
      }
      r += (FOX[0] - r) * fox;
      g += (FOX[1] - g) * fox;
      b += (FOX[2] - b) * fox;

      const i = (y * W + x) * 3;
      px[i] = Math.max(0, Math.min(255, Math.round(r)));
      px[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      px[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  return px;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const written = [];
for (const H of HEIGHTS) {
  const name = `parchment-${H}.jpg`;
  await sharp(sheet(H), { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toFile(path.join(OUT_DIR, name));
  written.push(name);
}

// The gold seal that already stands at High Command's door, at the size the
// Clerk presses it. resvg cannot read WebP, so it is re-encoded as a PNG.
await sharp(SEAL_SRC)
  .resize(260, 260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(path.join(OUT_DIR, 'seal-aldmeri.png'));

for (const name of [...written, 'seal-aldmeri.png']) {
  const { size } = fs.statSync(path.join(OUT_DIR, name));
  console.log(`web/src/assets/scribe/${name}: ${(size / 1024).toFixed(0)} KB`);
}

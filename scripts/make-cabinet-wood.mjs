// The cabinet's backboard, generated rather than photographed.
//
//   node scripts/make-cabinet-wood.mjs
//
// WHY THIS IS A SCRIPT AND NOT A DOWNLOAD. Every other asset here is "a
// committed script plus committed output" (see CLAUDE.md), and the reason is
// licensing: static files are served from public URLs, so shipping one
// distributes it to anyone with the link. A stock wood photograph would need
// its licence checked and recorded; this needs neither, because nothing here
// came from anywhere. It is arithmetic.
//
// WHAT IT REPLACES. The interior was grained with
//
//     repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 10px)
//
// — a white hairline every ten pixels, forever, at perfectly even spacing. It
// reads as corduroy rather than as timber, because real grain is neither evenly
// spaced nor straight, and because it never once changes over the width of the
// cabinet.
//
// HOW IT TILES. Seamlessly BY CONSTRUCTION rather than by mirroring or by
// cross-fading the edges. Every frequency in the field below is an integer
// number of cycles across the tile, so the function is genuinely periodic in
// both axes and the value at x = W is the value at x = 0 exactly. That matters
// more than it sounds: a blurred-edge tile shows a soft band at every repeat,
// and on a backboard 1120 px wide that band lands twice in plain sight.
//
// The grain runs VERTICALLY, because the boards of a cabinet back do. That is
// also why the tile is wide and short — the grain barely changes along its own
// length, so the horizontal seam is the one that has to be invisible and the
// vertical one has almost nothing to hide.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web/src/assets/cabinet-wood.webp');

const W = 1024;
const H = 512;

/** Boards across the tile. Must divide W, or the seam splits a plank. */
const PLANKS = 4;
const PLANK_W = W / PLANKS;

const TAU = Math.PI * 2;

/**
 * A tileable turbulence field.
 *
 * Each term is `sin(2π(u·x/W + v·y/H) + φ)` with INTEGER u and v, so each term
 * — and therefore the sum — repeats exactly once per tile in both directions.
 * The phases are hard-coded rather than random: this script has to produce the
 * same board every time it runs, or the committed output and a re-run would
 * differ for no reason anybody could see.
 */
const TERMS = [
  /*
   * THE `v` COLUMN IS DELIBERATELY SMALL, and it is the whole difference
   * between timber and water.
   *
   * `v` is how many times a term cycles DOWN the tile — along the grain. The
   * first version let it run to 11, and the board came out looking like ripples
   * on a pond: the lines snaked left and right several times over their own
   * length. Real vertical grain barely moves across the board as it descends;
   * it wanders once, slowly, and the interest is in how tightly the lines are
   * packed rather than in how much they wave.
   *
   * So the structural terms cycle once or twice down the tile and several times
   * across it. Only the pore terms, which are almost invisible, may be busy.
   */
  // Long slow bends: the shape of the tree, essentially.
  { u: 2, v: 1, a: 1.0, p: 0.0 },
  { u: 3, v: 1, a: 0.5, p: 1.7 },
  { u: 5, v: 2, a: 0.34, p: 3.1 },
  { u: 8, v: 1, a: 0.22, p: 0.6 },
  // Mid detail: the wander that keeps the lines from being ruled.
  { u: 11, v: 2, a: 0.14, p: 2.4 },
  { u: 17, v: 1, a: 0.1, p: 4.8 },
  // Fine pore. Low amplitude — this is texture, not pattern, and it is the one
  // place a busy `v` is affordable.
  { u: 23, v: 9, a: 0.035, p: 5.5 },
  { u: 41, v: 5, a: 0.022, p: 2.9 },
  { u: 67, v: 13, a: 0.014, p: 0.9 },
];
function turbulence(x, y) {
  let n = 0;
  for (const t of TERMS) n += t.a * Math.sin(TAU * ((t.u * x) / W + (t.v * y) / H) + t.p);
  return n;
}

/*
 * The colours the cabinet is already painted in.
 *
 * `.archive-cabinet__interior` runs #211711 -> #120d0a -> #0b0807 top to
 * bottom, and this sits underneath that gradient rather than instead of it, so
 * it has to live in the same family or the board will read as a lighter panel
 * pasted behind the books. DARK is the constraint, exactly as it is for
 * `--cover` in invariant 6: light foil text and pale covers go on top of this.
 */
const DEEP = [0x16, 0x0f, 0x0b];
const RAISED = [0x31, 0x22, 0x17];

/**
 * The board's brightness at a point, 0..1.
 *
 * A function rather than an inlined loop body because the wrap check at the
 * bottom has to evaluate it at x = W and y = H — coordinates that are off the
 * end of the image but exactly one period along the field.
 */
function shade(x, y) {
  /*
   * Half a board's offset, so that x = 0 lands in the MIDDLE of a plank rather
   * than on a seam.
   *
   * The first version put a seam exactly on the tile edge, and the wrap check
   * caught it: the seam is a V-shaped notch, and sampling it with its vertex on
   * column 0 means column 0 gets the vertex (darkest) while column W-1 gets a
   * point part-way up the far side. Shifting by half a plank keeps the field
   * periodic — the shift wraps with the same period — and moves both seams
   * inboard, where a one-pixel sampling asymmetry does not land on a repeat.
   */
  const sx = x + PLANK_W / 2;
  const plank = Math.floor(sx / PLANK_W) % PLANKS;
  // Where we are across this board, 0..1 — used for the seams and for the
  // slight cupping that catches light near a board's middle.
  const across = (sx % PLANK_W) / PLANK_W;

  /*
   * The grain itself: a stripe function in x, bent by the turbulence. The
   * bending is what makes it timber; without it this is a barcode.
   *
   * The stripe frequency is per-plank and integer, so boards do not share a
   * grain and the pattern still closes at the tile edge.
   */
  /*
   * Tight, because timber is. At eleven rings a board the lines were finger-
   * width bands; sawn oak at this scale is dozens of lines across a board, and
   * the density is most of what makes it read as wood rather than as pattern.
   */
  const rings = 38 + plank * 5;
  // A light bend. Heavy bending turns close-packed lines into interference.
  const grain = Math.sin(TAU * rings * across + turbulence(x, y) * 1.15);

  // Squared toward the dark end: real grain is mostly dark wood with occasional
  // raised light, not an even split.
  let t = (grain + 1) / 2;
  t = t * t * 0.72 + turbulence(x * 2, y * 3) * 0.05;

  // Each board was cut from a different part of the log.
  const plankTone = 1 + (((plank * 37) % 11) / 11 - 0.5) * 0.14;
  // Cupping: the middle of a board sits proud and takes the light.
  const cup = 1 - Math.abs(across - 0.5) * 0.34;

  let v = t * plankTone * cup;

  // The seam between boards, and the chamfer either side of it.
  const seam = Math.min(across, 1 - across);
  if (seam < 0.012) v *= 0.28 + (seam / 0.012) * 0.5;

  return Math.max(0, Math.min(1, v));
}

const px = Buffer.alloc(W * H * 3);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const v = shade(x, y);
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) px[i + c] = Math.round(DEEP[c] + (RAISED[c] - DEEP[c]) * v);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

await sharp(px, { raw: { width: W, height: H, channels: 3 } })
  // Lossless would be honest and about six times the size for a texture nobody
  // will ever inspect at 1:1. Quality 76 on a near-black image is invisible.
  .webp({ quality: 76 })
  .toFile(OUT);

/*
 * PROVE IT TILES, on the field rather than on the picture.
 *
 * The first version of this check read the encoded file back and compared its
 * first column against its last. That cannot work, and it is worth saying why
 * rather than just deleting it: the output is 8-bit and the codec is LOSSY, so
 * the two edge columns sit in different macroblocks and differ by a count or
 * two no matter what the maths does. The check was measuring quantisation and
 * WebP, and it reported a wrap that was fine as a failure.
 *
 * The invariant is about the function, so test the function: `shade` is
 * periodic if and only if shade(W, y) === shade(0, y) and shade(x, H) ===
 * shade(x, 0) — coordinates one full period along, in floating point, before
 * anything is rounded or compressed. A non-integer frequency in TERMS or in
 * `rings` breaks that exactly, and nothing else does.
 */
const EPS = 1e-9;
let worstX = 0;
let worstY = 0;
for (let y = 0; y < H; y++) worstX = Math.max(worstX, Math.abs(shade(W, y) - shade(0, y)));
for (let x = 0; x < W; x++) worstY = Math.max(worstY, Math.abs(shade(x, H) - shade(x, 0)));

const bytes = fs.statSync(OUT).size;
console.log(`wrote ${path.relative(ROOT, OUT)}  ${W}x${H}  ${(bytes / 1024).toFixed(1)} kB`);
console.log(`wrap error: ${worstX.toExponential(1)} across, ${worstY.toExponential(1)} down`);

if (worstX > EPS || worstY > EPS) {
  console.error('\nTHE TILE DOES NOT WRAP. A frequency in TERMS or `rings` is not an integer.');
  process.exitCode = 1;
}

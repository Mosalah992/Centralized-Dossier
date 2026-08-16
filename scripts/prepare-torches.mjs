// Prepare the two torches that flank the hall.
//
// The source is a stock comparison reel: 494x278, 222 frames, two torches side
// by side with a divider down column 246 -- "ORIGINAL" on the left, and on the
// right a "VER. 001".."VER. 005" that swaps every 44 frames. Three captions are
// burned into every frame ("MEDIEVAL TORCH" across the top, a label bottom-left
// and "(STAC)" bottom-right of each panel).
//
// So three things have to happen before the footage is usable.
//
// ONE PANEL. Only the left half is a single continuous clip; the right half
// cuts between five different renders and cannot loop. Everything below reads
// columns 0..245 and throws the rest away.
//
// ONE LOOP. Measured frame to frame, the left panel repeats with a period of
// exactly 44 frames: mean absolute difference 4.6/255 at that lag against 9.0
// between adjacent frames, the residue being GIF palette dithering rather than
// motion. The reel is that one clip played five times over. Keeping 44 frames
// costs a fifth of the pixels and loses nothing, and the seam it leaves is
// quieter than an average frame step -- 7.3 against a 9.7 mean -- so the loop
// is genuinely closed and needs no cross-fade.
//
// NO CAPTIONS. The captions are drawn opaque over every frame, so they are
// bright in the per-pixel minimum and motionless in the per-pixel deviation,
// while the flame is neither. Either test alone leaves dithered holes in the
// glyphs; the union of the two, dilated, closes them. The holes are then filled
// by harmonic inpainting rather than painted black, because the top caption
// starts about nine columns from the right edge of the smoke plume -- close
// enough that a black rectangle would cut a hard vertical edge through it.
// Relaxation lets the smoke fall off smoothly instead, and settles to black
// everywhere else, which is what the other two captions sit on.
//
// The output is animated WebP, not GIF: fire is smooth gradient, which is what
// lossy coding is good at and what a 256-colour palette is worst at. 6.9MB of
// source reel becomes about 330KB a side, and neither side is fetched at all
// under 720px, where shelf.css hides both.
//
// The two sides are the same clip started half a loop apart, so they never
// gutter in lockstep; the page mirrors the right one rather than this script,
// so one still frame serves both. That still is for readers who ask for less
// motion -- base.css stops every CSS animation for them, but nothing in CSS
// pauses an animated image.
//
// Note the shape of the pipeline: sharp's `extract` and `composite` are both
// page-aware on animated input, so the crop and the caption repair are applied
// by sharp with the frame metadata intact. Reassembling raw frames by hand is
// not an option -- sharp 0.33 takes no page height for raw input, so a raw
// buffer cannot be handed back as an animation.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Assets', 'torchlightgif.gif');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'assets');

const LOOP = 44;      // frames in one turn of the clip
const PANEL = 246;    // columns 0..245; 246 is the divider between the panels
const ITERS = 220;    // relaxation passes; the widest hole is ~10px across
const DILATE = 3;     // takes the antialiased rim of each glyph with it

// 44 frames of keyed fire is what sets the file size, and neither lever below
// buys much: dropping RGB quality from 72 to 42 saves 17% and starts to smear
// the flame. Alpha is the surprise -- the channel is a full detail map of the
// flame, so it is the expensive half of the file, but the page behind it is
// near-black, which hides almost any error in it. 50 is chosen off a boosted
// side-by-side against lossless: indistinguishable there, while below about 40
// the alpha starts to contour and the flame's halo breaks into hard bands.
const QUALITY = 72;
const ALPHA_QUALITY = 50;

// Where the burned-in captions live, generously bounded. Each box has to hold
// the dilated glyph mask with unmasked pixels around it to relax towards.
const BOXES = [
  { y0: 0, y1: 48, x0: 128, x1: PANEL },    // "MEDIEVAL TORCH"
  { y0: 242, y1: 278, x0: 0, x1: 97 },      // "ORIGINAL"
  { y0: 242, y1: 278, x0: 173, x1: PANEL }, // "(STAC)"
];

const C = 3;

/** The left panel of `LOOP` frames starting at `page`, as flat RGB. */
async function readPanel(page) {
  const input = sharp(SRC, { animated: true, pages: LOOP, page });
  const meta = await input.metadata();
  const { data } = await input
    .extract({ left: 0, top: 0, width: PANEL, height: meta.pageHeight })
    .flatten({ background: '#000' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, H: meta.pageHeight, delays: meta.delay.slice(0, LOOP) };
}

/** Pixels inside BOXES that hold caption rather than footage. */
function captionMask(data, H) {
  const idx = (f, y, x) => ((f * H + y) * PANEL + x) * C;
  const hit = new Uint8Array(H * PANEL);

  for (const { y0, y1, x0, x1 } of BOXES) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        let min = Infinity, max = -Infinity, sum = 0, sumSq = 0;
        for (let f = 0; f < LOOP; f++) {
          const i = idx(f, y, x);
          const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (v < min) min = v;
          if (v > max) max = v;
          sum += v;
          sumSq += v * v;
        }
        const sd = Math.sqrt(Math.max(0, sumSq / LOOP - (sum / LOOP) ** 2));
        // Bright in every frame, or bright and motionless.
        if (min > 20 || (sd < 15 && max > 35)) hit[y * PANEL + x] = 1;
      }
    }
  }

  // Dilate, clipped back to the boxes so it can never eat into the flame.
  const mask = new Uint8Array(H * PANEL);
  for (const { y0, y1, x0, x1 } of BOXES) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        let on = 0;
        for (let dy = -DILATE; dy <= DILATE && !on; dy++) {
          for (let dx = -DILATE; dx <= DILATE; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || ny >= H || nx < 0 || nx >= PANEL) continue;
            if (hit[ny * PANEL + nx]) { on = 1; break; }
          }
        }
        mask[y * PANEL + x] = on;
      }
    }
  }
  return mask;
}

/**
 * Fill the masked pixels of one frame by Jacobi relaxation: average the four
 * neighbours, leave the known pixels alone, repeat. Two buffers are swapped
 * and only masked pixels are ever written, so a pass costs the hole and not
 * the frame. Neighbours are clamped at the panel edge, which leaves a Neumann
 * boundary where a caption runs into it -- the fill then comes from the other
 * three sides, and those are black.
 */
function inpaintFrame(data, H, mask, frame, todo) {
  const n = H * PANEL * C;
  let cur = new Float32Array(n);
  let next = new Float32Array(n);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < PANEL; x++) {
      const s = ((frame * H + y) * PANEL + x) * C, d = (y * PANEL + x) * C;
      const masked = mask[y * PANEL + x];
      for (let c = 0; c < C; c++) cur[d + c] = masked ? 0 : data[s + c];
    }
  }
  next.set(cur);

  for (let it = 0; it < ITERS; it++) {
    for (let k = 0; k < todo.length; k++) {
      const p = todo[k];
      const y = (p / PANEL) | 0, x = p % PANEL;
      const up = (Math.max(0, y - 1) * PANEL + x) * C;
      const dn = (Math.min(H - 1, y + 1) * PANEL + x) * C;
      const lf = (y * PANEL + Math.max(0, x - 1)) * C;
      const rt = (y * PANEL + Math.min(PANEL - 1, x + 1)) * C;
      const d = p * C;
      for (let c = 0; c < C; c++) {
        next[d + c] = (cur[up + c] + cur[dn + c] + cur[lf + c] + cur[rt + c]) / 4;
      }
    }
    const swap = cur; cur = next; next = swap;
  }
  return cur;
}

/**
 * The finished RGBA strip: every frame cropped, repaired, and keyed.
 *
 * KEYING. The clip is fire on black, which wants to be added to the page rather
 * than laid over it. Screen blending would do that in one line of CSS, but .hall
 * sets `isolation: isolate` for the sake of its own negative z-index wall
 * gradients, and inside an isolated group the backdrop starts out transparent --
 * screen against transparent returns the source, so the black ground would stay
 * opaque and the torch would sit in a black box. Baking the key into the file
 * instead is independent of whatever stacking context it lands in.
 *
 * The standard un-premultiply for an additive plate: alpha is the brightest
 * channel, and the colour is divided by it. Normal compositing then works out
 * to `source + backdrop * (1 - alpha)` -- additive where the flame is bright,
 * and correctly occluding where the smoke is thick, which screen could never do
 * because screen only ever lightens. The divisor is floored so that near-black
 * pixels, which are invisible either way, cannot amplify dithering noise into
 * confetti under a lossy encoder.
 */
const ALPHA_FLOOR = 0.05;

// The reel cuts its own smoke off: the plume is still thick where the source
// frame ends, so the top of the crop is a straight horizontal edge across the
// smoke. Small and dark in the page it reads as a seam, so the alpha is ramped
// away over the top rows and the plume dissolves instead. Smoothstep rather
// than linear, which would leave a faint crease of its own where the ramp
// meets full strength. The flame is nowhere near this band.
const FADE_ROWS = 28;

function plateStrip(data, H, mask, crop, todo) {
  const { x0, y0, w, h } = crop;
  const strip = Buffer.alloc(w * h * LOOP * 4, 0);

  const fade = new Float32Array(h).fill(1);
  for (let y = 0; y < Math.min(FADE_ROWS, h); y++) {
    const t = y / FADE_ROWS;
    fade[y] = t * t * (3 - 2 * t);
  }

  for (let f = 0; f < LOOP; f++) {
    const filled = inpaintFrame(data, H, mask, f, todo);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = ((y + y0) * PANEL + (x + x0)) * C;
        const r = Math.min(255, Math.max(0, filled[s]));
        const g = Math.min(255, Math.max(0, filled[s + 1]));
        const b = Math.min(255, Math.max(0, filled[s + 2]));
        // The colour is left alone and only the alpha is ramped, so the smoke
        // thins out rather than darkening towards black as it goes.
        const a = (Math.max(r, g, b) / 255) * fade[y];
        const div = Math.max(Math.max(r, g, b) / 255, ALPHA_FLOOR);
        const d = (((f * h + y) * w) + x) * 4;
        strip[d] = Math.round(Math.min(255, r / div));
        strip[d + 1] = Math.round(Math.min(255, g / div));
        strip[d + 2] = Math.round(Math.min(255, b / div));
        strip[d + 3] = Math.round(a * 255);
      }
    }
  }
  return strip;
}

/** Bounding box of everything that is not dead margin, captions excluded. */
function contentBox(data, H, mask) {
  let minY = H, maxY = -1, minX = PANEL, maxX = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < PANEL; x++) {
      if (mask[y * PANEL + x]) continue;
      let peak = 0;
      for (let f = 0; f < LOOP; f++) {
        const i = ((f * H + y) * PANEL + x) * C;
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (v > peak) peak = v;
      }
      if (peak > 8) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  const y0 = Math.max(0, minY - 2), y1 = Math.min(H, maxY + 3);
  const x0 = Math.max(0, minX - 2), x1 = Math.min(PANEL, maxX + 3);
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}

// --- run --------------------------------------------------------------------

const first = await readPanel(0);
const mask = captionMask(first.data, first.H);

// One flat list of the pixels to fill, so the relaxation iterates the hole.
const todo = [];
for (let i = 0; i < mask.length; i++) if (mask[i]) todo.push(i);

const crop = contentBox(first.data, first.H, mask);
console.log(
  `left panel ${PANEL}x${first.H} -> ${crop.w}x${crop.h} at (${crop.x0},${crop.y0}), `
  + `${todo.length} caption px, ${LOOP} frames`,
);

/**
 * Write `frames` pages as one animation.
 *
 * The strip is computed here but the frame metadata has to come from sharp, so
 * the source is reopened, cropped -- `extract` is page-aware, so this is what
 * establishes the size and the page count -- and then every pixel is replaced
 * by compositing the finished plate over it with `blend: 'source'`. Handing raw
 * frames straight to the encoder is not possible: sharp 0.33 accepts no page
 * height for raw input, so a raw buffer cannot be read back as an animation.
 */
async function write(name, page, frames, strip, delays) {
  const animated = frames > 1;
  const input = animated
    ? sharp(SRC, { animated: true, pages: frames, page })
    : sharp(SRC, { pages: 1, page });
  const opts = { quality: QUALITY, alphaQuality: ALPHA_QUALITY, effort: 6 };
  const info = await input
    .extract({ left: crop.x0, top: crop.y0, width: crop.w, height: crop.h })
    .ensureAlpha()
    .composite([{
      input: strip,
      raw: { width: crop.w, height: crop.h * frames, channels: 4 },
      blend: 'source',
      top: 0,
      left: 0,
    }])
    .webp(animated ? { ...opts, delay: delays, loop: 0 } : opts)
    .toFile(path.join(OUT_DIR, name));
  // `info.pages` echoes the input reel, not what was written; report the loop.
  console.log(
    `${name.padEnd(17)} ${crop.w}x${crop.h}`
    + `${animated ? ` x${frames}` : '    '}  ${info.size} bytes`,
  );
}

const leftPlate = plateStrip(first.data, first.H, mask, crop, todo);
await write('torch-left.webp', 0, LOOP, leftPlate, first.delays);

const second = await readPanel(LOOP / 2);
const rightPlate = plateStrip(second.data, second.H, mask, crop, todo);
await write('torch-right.webp', LOOP / 2, LOOP, rightPlate, second.delays);

// The still is the first frame of the left torch, keyed the same way, so a
// reader on reduced motion sees the frame the animation would have opened on.
await write('torch-still.webp', 0, 1, leftPlate.subarray(0, crop.w * crop.h * 4));

console.log(`\nwrote 3 files to ${path.relative(ROOT, OUT_DIR)}`);

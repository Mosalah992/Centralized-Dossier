// Slice the six volume covers out of the single sheet the art arrived on.
//
// `Assets/Book volumes UI assets.png` is a 3x2 sheet, already keyed to
// transparency, laid out in shelf order: roster, statistics, ledger on the top
// row; stipends, honor, calendar on the bottom. Each book is drawn to the same
// template but lands a few pixels off its neighbours, so cropping to a fixed
// grid would leave them standing at different heights once they are side by
// side on a shelf.
//
// So the books are found rather than assumed: read each one's true bounds from
// the alpha channel, scale it to a common width, and align it on the line where
// its BODY ends — not where its art ends. The ribbon hangs below that line and
// is allowed to overhang the shelf edge, which is what a bookmark does.
//
// Body heights differ by ~1.5% between books. That is left alone: six volumes
// bound by hand are not the same height, and forcing them to be looks worse
// than the variation does.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Assets', 'Book volumes UI assets.png');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'assets', 'volumes');

// Shelf order, row-major — the order the sheet is drawn in.
const SLUGS = [
  ['roster', 'statistics', 'ledger'],
  ['stipends', 'honor', 'calendar'],
];

// Books are normalised to this width. It is close to their native ~380px, so
// the resample stays under 2% and the gold filigree keeps its edges.
const BODY_W = 384;
const PAD_X = 8;
const PAD_TOP = 4;
const CANVAS_W = BODY_W + PAD_X * 2;

// A pixel counts as art only well clear of the feathered edge, so the faint
// halo around each book does not merge the columns into one run.
const SOLID = 16;

/** Opaque-pixel runs along an axis, used to find the gaps between books. */
function runs(counts) {
  const out = [];
  let start = -1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0 && start < 0) start = i;
    else if (counts[i] === 0 && start >= 0) { out.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) out.push([start, counts.length - 1]);
  return out;
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const alphaAt = (x, y) => data[(y * W + x) * C + 3];

const colCounts = new Array(W).fill(0);
const rowCounts = new Array(H).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alphaAt(x, y) > SOLID) { colCounts[x]++; rowCounts[y]++; }
  }
}

const columns = runs(colCounts);
const rows = runs(rowCounts);
if (columns.length !== 3 || rows.length !== 2) {
  throw new Error(`expected a 3x2 sheet, found ${columns.length} columns x ${rows.length} rows`);
}

// ── Pass 1: measure every book, so the shared baseline can be derived ──────

const books = [];
for (let r = 0; r < rows.length; r++) {
  for (let c = 0; c < columns.length; c++) {
    const [cx0, cx1] = columns[c];
    const [ry0, ry1] = rows[r];

    let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
    for (let y = ry0; y <= ry1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        if (alphaAt(x, y) <= SOLID) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }

    // The body is every row wide enough to be cover-and-spine rather than
    // ribbon; its last row is the line the book stands on.
    const widths = [];
    for (let y = y0; y <= y1; y++) {
      let n = 0;
      for (let x = x0; x <= x1; x++) if (alphaAt(x, y) > SOLID) n++;
      widths.push(n);
    }
    const widest = Math.max(...widths);
    const bodyRows = widths.map((n, i) => (n > widest * 0.5 ? i : -1)).filter((i) => i >= 0);

    const scale = BODY_W / (x1 - x0 + 1);
    books.push({
      slug: SLUGS[r][c],
      x0, y0,
      w: x1 - x0 + 1,
      h: y1 - y0 + 1,
      scale,
      // Both relative to the top of the crop, already in output pixels.
      bodyBottom: Math.round((bodyRows[bodyRows.length - 1] + 1) * scale),
      scaledH: Math.round((y1 - y0 + 1) * scale),
    });
  }
}

// One baseline for all six: deep enough that the tallest body still clears the
// top padding, and a canvas tall enough for the longest ribbon below it.
const baseline = PAD_TOP + Math.max(...books.map((b) => b.bodyBottom));
const canvasH = baseline + Math.max(...books.map((b) => b.scaledH - b.bodyBottom)) + PAD_TOP;

// ── Pass 2: cut, place, encode ────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const book of books) {
  const cover = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .extract({ left: book.x0, top: book.y0, width: book.w, height: book.h })
    .resize(BODY_W, book.scaledH, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, `${book.slug}.webp`);
  const result = await sharp({
    create: {
      width: CANVAS_W, height: canvasH,
      channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cover, left: PAD_X, top: baseline - book.bodyBottom }])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(
    `${book.slug.padEnd(11)} ${result.width}x${result.height}  `
    + `${String(Math.round(result.size / 1024)).padStart(3)} kB  `
    + `(resampled ${book.scale.toFixed(3)})`,
  );
}

console.log(
  `\nwrote 6 covers to ${path.relative(ROOT, OUT_DIR)} `
  + `— ${CANVAS_W}x${canvasH}, standing on y=${baseline}`,
);

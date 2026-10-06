// Slice the nine volume covers out of the single sheet the art arrived on.
//
// `Assets/new volume assets.png` is keyed to transparency and laid out in two
// rows: four books on top, five below. The books carry their titles and
// colours painted in, and both are kept as drawn — the volumes were renamed to
// match the lettering (shared/volumes.ts), so nothing is erased or re-dyed.
//
// Each book is drawn a few pixels off its neighbours and the bottom row is
// drawn smaller than the top, so cropping to a fixed grid would leave them
// standing at different heights once they share a shelf. The books are found
// rather than assumed: read each one's bounds from the alpha channel, scale it
// to a common BODY height, and stand it on the line where its body ends.
//
// Height, not width, because three of the books have clasps standing proud of
// the fore-edge. Normalising on width would shrink exactly those three.
//
// The common height is the SHORTEST body on the sheet, so nothing is ever
// upscaled: the sheet is all the detail there is, and resampling it larger
// would only make bigger files of the same softness.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Assets', 'new volume assets.png');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'assets', 'volumes');

// Row-major, in the order the sheet is drawn.
const SLUGS = [
  ['roster', 'ledger', 'honor', 'statistics'],
  ['stipends', 'history', 'enforcement', 'informants', 'calendar'],
];

const PAD_X = 6;
const PAD_TOP = 4;

// A pixel counts as art only well clear of the feathered edge, so the faint
// halo around each book does not merge neighbouring columns into one run.
const SOLID = 64;
// Bounds are taken at a lower threshold than separation, so the halo the
// separation ignored is still inside the crop rather than clipped off it.
const EDGE = 16;

/** Runs of non-zero entries along an axis. */
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
const W = info.width;
const H = info.height;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

const rowCounts = new Array(H).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) if (alphaAt(x, y) > SOLID) rowCounts[y]++;
}
const rows = runs(rowCounts).filter(([a, b]) => b - a > 20);
if (rows.length !== SLUGS.length) {
  throw new Error(`expected ${SLUGS.length} rows of books, found ${rows.length}`);
}

/**
 * Columns of one row, one per book.
 *
 * On the top row the books stand apart and the gaps are found directly. On the
 * bottom row two pairs touch — a clasp reaches over its neighbour's spine — so
 * the widest run is split at its thinnest column until there is one run per
 * book. The thinnest column is where the overlap is shallowest, which is the
 * least art either book can lose to the cut.
 */
function columnsOf([y0, y1], count) {
  const cols = new Array(W).fill(0);
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < W; x++) if (alphaAt(x, y) > SOLID) cols[x]++;
  }
  const found = runs(cols).filter(([a, b]) => b - a > 20);
  while (found.length < count) {
    const i = found.reduce((best, r, k) => (r[1] - r[0] > found[best][1] - found[best][0] ? k : best), 0);
    const [a, b] = found[i];
    // Only the middle of the run: a book's own shoulders are thin too.
    const lo = Math.round(a + (b - a) * 0.2);
    const hi = Math.round(b - (b - a) * 0.2);
    let cut = lo;
    for (let x = lo; x <= hi; x++) if (cols[x] < cols[cut]) cut = x;
    found.splice(i, 1, [a, cut - 1], [cut, b]);
  }
  if (found.length !== count) throw new Error(`expected ${count} books in a row, found ${found.length}`);
  return found;
}

/** One book's bounds inside its cell, and where its body ends. */
function measure(slug, [x0, x1], [y0, y1]) {
  let bx0 = Infinity, bx1 = -1, by0 = Infinity, by1 = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(x, y) <= EDGE) continue;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
  }
  const widths = [];
  for (let y = by0; y <= by1; y++) {
    let n = 0;
    for (let x = bx0; x <= bx1; x++) if (alphaAt(x, y) > EDGE) n++;
    widths.push(n);
  }
  const widest = Math.max(...widths);
  const body = widths.map((n, i) => (n > widest * 0.5 ? i : -1)).filter((i) => i >= 0);
  return {
    slug,
    x0: bx0, y0: by0,
    w: bx1 - bx0 + 1,
    h: by1 - by0 + 1,
    rawBodyTop: body[0],
    rawBodyBottom: body[body.length - 1] + 1,
  };
}

const books = rows.flatMap((row, r) =>
  columnsOf(row, SLUGS[r].length).map((cell, c) => measure(SLUGS[r][c], cell, row)));

const targetBodyH = Math.min(...books.map((b) => b.rawBodyBottom - b.rawBodyTop));
for (const book of books) {
  book.scale = targetBodyH / (book.rawBodyBottom - book.rawBodyTop);
  book.scaledW = Math.round(book.w * book.scale);
  book.scaledH = Math.round(book.h * book.scale);
  book.bodyBottom = Math.round(book.rawBodyBottom * book.scale);
}

// One baseline for all of them, deep enough for the tallest art above its body
// line (the clip on Realm History) and a canvas deep enough for anything below.
const baseline = PAD_TOP + Math.max(...books.map((b) => b.bodyBottom));
const canvasH = baseline + Math.max(...books.map((b) => b.scaledH - b.bodyBottom)) + PAD_TOP;
const canvasW = Math.max(...books.map((b) => b.scaledW)) + PAD_X * 2;

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const book of books) {
  const cover = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: book.x0, top: book.y0, width: book.w, height: book.h })
    .resize(book.scaledW, book.scaledH, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, `${book.slug}.webp`);
  const result = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: cover,
      left: Math.round((canvasW - book.scaledW) / 2),
      top: baseline - book.bodyBottom,
    }])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(
    `${book.slug.padEnd(11)} ${result.width}x${result.height}  `
    + `${String(Math.round(result.size / 1024)).padStart(3)} kB  (resampled ${book.scale.toFixed(3)})`,
  );
}

console.log(
  `\nwrote ${books.length} covers to ${path.relative(ROOT, OUT_DIR)} `
  + `— ${canvasW}x${canvasH}, standing on y=${baseline}`,
);

// ── Volume seals ──────────────────────────────────────────────────────────

/*
 * A seal cut out of a cover, for volumes that need their own mark away from
 * the shelf.
 *
 * The archive has one seal everywhere else: the Dominion insignia at
 * public/seal.webp. The Chronicles keep their own door, and a door wants the
 * mark of the thing behind it — so the medallion off the volume's ORIGINAL
 * cover is kept for the inside board and the lock. It outlived that cover on
 * purpose: the shelf art changed, the door did not.
 *
 * The bounds are measured by hand against the source art rather than found:
 * the medallion sits on black leather with no alpha to trace, and one plate is
 * not worth a detector.
 */
const SEALS = [
  {
    slug: 'informants',
    file: 'retired/Top Secret Volume.png',
    // The disc, less the laurel that crowds it left and right.
    region: { left: 443, top: 588, width: 372, height: 372 },
  },
];

for (const { slug, file, region } of SEALS) {
  const size = region.width;

  // Cut to a circle: the medallion is round and its corners are leather, which
  // would otherwise sit as a dark square on the board's gradient. The inner
  // stop is just short of the rim so the edge is feathered rather than jagged.
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <defs>
         <radialGradient id="d">
           <stop offset="0.94" stop-color="#fff" stop-opacity="1"/>
           <stop offset="1" stop-color="#fff" stop-opacity="0"/>
         </radialGradient>
       </defs>
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#d)"/>
     </svg>`,
  );

  const out = path.join(OUT_DIR, `${slug}-seal.webp`);
  const result = await sharp(path.join(ROOT, 'Assets', file))
    .extract(region)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(
    `${slug}-seal`.padEnd(20)
    + `${result.width}x${result.height}  ${String(Math.round(result.size / 1024)).padStart(3)} kB`,
  );
}

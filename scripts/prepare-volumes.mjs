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

// Covers that arrived on their own rather than on the sheet. They are measured
// and placed by exactly the same rules, and share the others' baseline, so a
// later addition still stands level with the original six. This one is drawn to
// the same proportions by luck rather than design — its body is 0.842 wide for
// every unit tall against the sheet's 0.844 — so normalising on width lands its
// height within a few pixels of its neighbours. A cover drawn to some other
// shape would need normalising on height instead, and a wider canvas.
const STANDALONE = [
  { slug: 'history', file: 'Volume History of the realm.png' },
  // Arrived flat on white rather than keyed, so it is cut from its background
  // here. Everything downstream measures books by their alpha, and a cover with
  // none would be read as a full-canvas rectangle and cropped to the paper.
  { slug: 'informants', file: 'Top Secret Volume.png', keyWhite: true },
];

// Background threshold for keyWhite. The book is black leather and gold; its
// lightest leaf sits far below this, so nothing on the cover is at risk.
const WHITE = 200;

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

/**
 * Cut a cover off its white paper.
 *
 * Threshold alone would eat the drop shadow's lighter half and leave its darker
 * half as a grey skirt, so background is decided by REACHABILITY: near-white
 * pixels connected to the border are paper, and near-white pixels enclosed by
 * the art (a gold highlight, the pale of an engraved wing) are not. The mask is
 * then blurred a little, which is what gives the rim its antialiasing back —
 * a hard mask on a resized cover shows every stair-step.
 */
function keyWhiteBackground(src) {
  const { data, W, H, C } = src;
  const isPaper = (i) => data[i * C] > WHITE && data[i * C + 1] > WHITE && data[i * C + 2] > WHITE;

  const background = new Uint8Array(W * H);
  const queue = [];
  for (let x = 0; x < W; x++) queue.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) queue.push(y * W, y * W + W - 1);

  while (queue.length) {
    const i = queue.pop();
    if (background[i] || !isPaper(i)) continue;
    background[i] = 1;
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) queue.push(i - 1);
    if (x < W - 1) queue.push(i + 1);
    if (y > 0) queue.push(i - W);
    if (y < H - 1) queue.push(i + W);
  }

  for (let i = 0; i < W * H; i++) data[i * C + 3] = background[i] ? 0 : 255;
  return src;
}

/** Decode an image to raw RGBA once; every measurement reads from this. */
async function loadRaw(file, { keyWhite = false } = {}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const src = { data, W: info.width, H: info.height, C: info.channels };
  if (keyWhite) keyWhiteBackground(src);
  src.alphaAt = (x, y) => data[(y * src.W + x) * src.C + 3];
  return src;
}

/**
 * Measure one book inside `region` of `src`: its true bounds, the scale that
 * normalises it to BODY_W, and where its body ends — the line it stands on,
 * which is not where its art ends because the ribbon hangs below.
 */
function measureBook(src, region, slug) {
  const { x: rx0, y: ry0, w: rw, h: rh } = region;
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  for (let y = ry0; y < ry0 + rh; y++) {
    for (let x = rx0; x < rx0 + rw; x++) {
      if (src.alphaAt(x, y) <= SOLID) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  const widths = [];
  for (let y = y0; y <= y1; y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (src.alphaAt(x, y) > SOLID) n++;
    widths.push(n);
  }
  const widest = Math.max(...widths);
  const bodyRows = widths.map((n, i) => (n > widest * 0.5 ? i : -1)).filter((i) => i >= 0);

  const scale = BODY_W / (x1 - x0 + 1);
  return {
    slug, src,
    x0, y0,
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    scale,
    // Both relative to the top of the crop, already in output pixels.
    bodyBottom: Math.round((bodyRows[bodyRows.length - 1] + 1) * scale),
    scaledH: Math.round((y1 - y0 + 1) * scale),
  };
}

const sheet = await loadRaw(SRC);

const colCounts = new Array(sheet.W).fill(0);
const rowCounts = new Array(sheet.H).fill(0);
for (let y = 0; y < sheet.H; y++) {
  for (let x = 0; x < sheet.W; x++) {
    if (sheet.alphaAt(x, y) > SOLID) { colCounts[x]++; rowCounts[y]++; }
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
    books.push(measureBook(
      sheet,
      { x: cx0, y: ry0, w: cx1 - cx0 + 1, h: ry1 - ry0 + 1 },
      SLUGS[r][c],
    ));
  }
}

for (const { slug, file, keyWhite } of STANDALONE) {
  const src = await loadRaw(path.join(ROOT, 'Assets', file), { keyWhite });
  books.push({ ...measureBook(src, { x: 0, y: 0, w: src.W, h: src.H }, slug), keyed: Boolean(keyWhite) });
}

// One baseline for all of them: deep enough that the tallest body still clears
// the top padding, and a canvas tall enough for the longest ribbon below it.
// Derived across every cover, so adding one can only ever grow the canvas —
// never leave a newcomer floating above the shelf or clipped at the foot.
const baseline = PAD_TOP + Math.max(...books.map((b) => b.bodyBottom));
const canvasH = baseline + Math.max(...books.map((b) => b.scaledH - b.bodyBottom)) + PAD_TOP;

// ── Pass 2: cut, place, encode ────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const book of books) {
  const { data, W, H, C } = book.src;
  let pipeline = sharp(data, { raw: { width: W, height: H, channels: C } })
    .extract({ left: book.x0, top: book.y0, width: book.w, height: book.h })
    .resize(BODY_W, book.scaledH, { kernel: 'lanczos3' });

  if (book.modulate) pipeline = pipeline.modulate(book.modulate);

  const cover = await pipeline.png().toBuffer();

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
  `\nwrote ${books.length} covers to ${path.relative(ROOT, OUT_DIR)} `
  + `— ${CANVAS_W}x${canvasH}, standing on y=${baseline}`,
);

// ── Volume seals ──────────────────────────────────────────────────────────

/*
 * A seal cut out of a cover, for volumes that need their own mark away from
 * the shelf.
 *
 * The archive has one seal everywhere else: the Dominion insignia at
 * public/seal.webp, on the hall's header and stamped at the foot of every
 * register. That is the Embassy's mark, not any one book's. The Informants'
 * Chronicle keeps its own door, and a door wants the mark of the thing behind
 * it — so its medallion is lifted off its own cover and used on the inside
 * board and on the lock.
 *
 * The bounds are measured by hand against the source art rather than found:
 * the medallion sits on black leather with no alpha to trace, and one plate is
 * not worth a detector.
 */
const SEALS = [
  {
    slug: 'informants',
    file: 'Top Secret Volume.png',
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

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

// ── The Embassy's binding ──────────────────────────────────────────────────
//
// The art arrived colour-coded: navy, forest, crimson and violet, one saturated
// dye per category. That is a chart legend applied to leather, and it was the
// main reason the shelf read as generated rather than bound. An embassy binds
// its registers in its own stock and tells them apart by the label.
//
// Measured against the supplied art: the four coded covers ran 40–55% mean
// saturation against 15–31% for the amber ones, and the Financial Ledger
// reached 100% at the 95th percentile — a fully saturated red that no dye, no
// hide and no photograph of a real object ever produces. The violet was worse
// than loud: purple was the costliest dye in the pre-modern world, so the
// petty-cash book carried the most expensive binding in the building.
//
// `hue` is the volume's place in one tanned range; the spread across the eight
// is the variation of a single hide. `sat` caps the field. `light` re-tones a
// cover that printed too bright — Hall of Honor and History sat at mean
// lightness 52 and 42 against 11–20 for the rest, so two books glowed and six
// receded. `wear` is how hard the Embassy works the volume, and drives edge
// scuffing, grain, and how far the gilt has dulled.
const STOCK = {
  roster: { hue: 24, sat: 30, light: 1.0, wear: 1.0 },
  statistics: { hue: 30, sat: 28, light: 1.0, wear: 0.95 },
  ledger: { hue: 14, sat: 34, light: 1.0, wear: 1.0 },
  stipends: { hue: 27, sat: 29, light: 1.0, wear: 0.9 },
  calendar: { hue: 29, sat: 26, light: 1.05, wear: 0.45 },
  history: { hue: 31, sat: 26, light: 0.82, wear: 0.4 },
  // Vellum, and left so. A citations book in vellum is a real distinction
  // rather than a colour-code, and --cover already takes its dark from the
  // bronze of the clasps for exactly this reason.
  honor: { hue: 36, sat: 22, light: 0.74, wear: 0.12 },
  // Black leather. Barely worked, because it is sealed rather than consulted.
  informants: { hue: 20, sat: 22, light: 1.0, wear: 0.15 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let t;
  if (hp < 1) t = [c, x, 0];
  else if (hp < 2) t = [x, c, 0];
  else if (hp < 3) t = [0, c, x];
  else if (hp < 4) t = [0, x, c];
  else if (hp < 5) t = [x, 0, c];
  else t = [c, 0, x];
  const m = l - c / 2;
  return t.map((v) => clamp(Math.round((v + m) * 255), 0, 255));
}

/** Signed shortest way round the wheel, -180..180. */
const deltaHue = (a, b) => (((a - b) % 360) + 540) % 360 - 180;

/**
 * Value noise from the pixel's own coordinates. Deterministic on purpose: the
 * committed covers have to be reproducible, and a random grain would put a
 * different hide in the diff on every run of this script.
 */
function noiseAt(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Re-bind one cover in the Embassy's stock. Operates on RGBA in place. */
function bind(data, width, height, cfg) {
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;

      let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

      // Near-neutrals are the silver medallion, the shadows and the page
      // whites. Nothing there is dyed, and re-hueing it would only tint the
      // relief that makes the cover read as an object rather than a rectangle.
      if (s >= 0.1) {
        // Gilt: bright, and already amber. It stays gold — the fault was never
        // the gold but the dye beneath it — and dulls with how hard the book is
        // worked, since handling takes the leaf off first.
        const isGilt = h >= 33 && h <= 68 && l > 0.42 && s > 0.22;

        if (isGilt) {
          h = 46 + deltaHue(h, 46) * 0.55;
          s = clamp(s * (1 - 0.3 * cfg.wear), 0.1, 0.62);
        } else {
          // The field, pulled almost the whole way onto the stock and then
          // capped. The 100% red and the violet both die here.
          h = cfg.hue + deltaHue(h, cfg.hue) * 0.12;
          s = Math.min(s * 0.5, cfg.sat / 100);
        }
      }

      l = clamp(l * cfg.light, 0, 1);

      // Wear. Edges go first and corners hardest, which is where a shelved book
      // is actually handled; the grain is the hide coming through the finish.
      if (cfg.wear > 0) {
        const ex = Math.abs(x - cx) / cx;
        const ey = Math.abs(y - cy) / cy;
        const edge = Math.pow(Math.max(ex, ey), 3.2) * 0.3 + Math.pow(ex * ey, 1.6) * 0.34;
        l *= 1 - edge * cfg.wear;
        l *= 1 + (noiseAt(x, y, 7) - 0.5) * 0.05 * cfg.wear;
        l = clamp(l, 0, 1);
      }

      const [r, g, b] = hslToRgb(h, s, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  return data;
}

// ── The title panel ────────────────────────────────────────────────────────
//
// Every cover arrived with its title and subtitle PAINTED INTO the art, which
// made two problems the grade above could not touch. A rename needed new art —
// the eighth volume shipped reading "TOP SECRET" long after the register was
// retitled Thalmor Chronicles — and the letterforms are irregular in the way
// generated lettering is: uneven counters, baselines drifting one to two
// degrees, spacing that no punch would give twice.
//
// So the lettering comes off here and the app sets it live over the cover in
// Cinzel (web/src/components/Book.tsx). What this leaves behind has to read as
// binding rather than as a patch, which is the whole difficulty: a blur or a
// flat rectangle would be worse than the painted title it replaced.
//
// The panel is therefore ERASED rather than covered. For each column the
// leather is carried across the panel by interpolating between a band of clean
// rows above it and a band below it, so the cover's own vignette and lighting
// gradient continue through the gap instead of being averaged away. Grain goes
// back on top, and the six sheet covers then take a blind-stamped fillet — an
// impressed line, no gilt, the way a binder marks out a lettering panel. The
// slight loss of the leather's mid-scale mottling inside the panel is not a
// defect to hide: a stamped panel is compressed leather, and compressed
// leather is smoother than the field around it.
//
// Bounds are per cover and MEASURED, not assumed. The painted block sits at a
// different height on almost every volume — 141 on Roster against 112 on the
// sealed volume — and the clasp on the fore-edge comes within a few pixels of
// the subtitle's last letter. They were read off the covers by profiling each
// row's horizontal gradient energy across the board's field: the type block is
// the run of high energy, and the quiet rows on either side of it are both the
// clearance and the donor bands the erase samples from.
//
// `tooled: false` says the volume already has a lettering panel of its own and
// must not be given a second one. History of the Realm is lettered on an
// inlaid black plaque with an ogee frame; the sealed volume's title stands
// between two painted rules. In both cases the frame is kept and only the
// field inside it is cleared.
const LABEL = {
  roster:     { x: 114, y: 141, w: 218, h:  86, tooled: true },
  statistics: { x: 114, y: 138, w: 218, h:  88, tooled: true },
  ledger:     { x: 114, y: 143, w: 218, h:  83, tooled: true },
  stipends:   { x: 114, y: 129, w: 218, h:  93, tooled: true },
  honor:      { x: 114, y: 136, w: 218, h:  85, tooled: true },
  calendar:   { x: 114, y: 146, w: 218, h:  85, tooled: true },
  // The plaque's field, inside its gold ogee. The lettering runs to within two
  // pixels of the frame at both ends — "OF THE REALM" is set wider than the
  // plaque's straight runs are long — so this one is cut close and given a
  // narrower fade than the rest. It can afford one: the field is flat black, so
  // there is no texture either side of the join for a seam to show up in.
  history:    { x: 148, y: 183, w: 181, h:  56, tooled: false, feather: 1.2 },
  // Between the two painted rules that already frame the title. They are the
  // volume's own cartouche and are left exactly where they are.
  informants: { x: 118, y: 115, w: 214, h: 104, tooled: false },
};

/** Rows sampled on each side of the panel to carry the leather across it. */
const DONOR = 5;

/** How far the erase fades at the panel's own edge, in pixels. */
const FEATHER = 2.5;

/**
 * Signed distance to a rounded rectangle centred on the origin, negative
 * inside. The fillet and the panel's recess are both drawn off this, which is
 * what keeps the impressed line an even depth around the corners — a stamp is
 * one tool pressed once, not four sides drawn separately.
 */
function roundedRectSD(dx, dy, hw, hh, r) {
  const qx = Math.abs(dx) - (hw - r);
  const qy = Math.abs(dy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Smooth 0..1 ramp; the erase and the bevel both want eased edges, not steps. */
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Two octaves of the same deterministic value noise, bilinear-sampled, so the
 * cleared panel keeps a hide's mottle as well as its grain. Without the coarse
 * octave the interpolation leaves a field that is smooth in exactly the way a
 * gradient is and no leather ever is.
 */
function mottleAt(x, y, scale, seed) {
  const u = x / scale;
  const v = y / scale;
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const ex = fx * fx * (3 - 2 * fx);
  const ey = fy * fy * (3 - 2 * fy);
  const n00 = noiseAt(x0, y0, seed);
  const n10 = noiseAt(x0 + 1, y0, seed);
  const n01 = noiseAt(x0, y0 + 1, seed);
  const n11 = noiseAt(x0 + 1, y0 + 1, seed);
  return (n00 * (1 - ex) + n10 * ex) * (1 - ey) + (n01 * (1 - ex) + n11 * ex) * ey;
}

/**
 * Fit a quadratic to a donor profile, rejecting outliers as it goes.
 *
 * A plain average will not do here. The clearance above the type block is only
 * four or five rows on most covers, which puts the donor band right under the
 * laurel and sword tips, and gilt is far brighter than leather: one contaminated
 * column, carried the height of the panel, becomes a vertical smear straight
 * down the cover. Reweighting drops those columns, and a quadratic is all the
 * shape a lit leather field has across two hundred pixels anyway — so what
 * survives is the lighting, never a fragment of the ornament above it.
 */
function robustProfileFit(profile) {
  const n = profile.length;
  const weights = new Array(n).fill(1);

  let coefficients = [0, 0, 0];
  for (let pass = 0; pass < 3; pass++) {
    // Normal equations for y = a + b·u + c·u², u centred on the panel so the
    // powers stay small and the 3x3 solve stays well conditioned.
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rhs = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const basis = [1, u, u * u];
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) m[a][b] += weights[i] * basis[a] * basis[b];
        rhs[a] += weights[i] * basis[a] * profile[i];
      }
    }
    coefficients = solve3(m, rhs);

    const residuals = profile.map((v, i) => {
      const u = (i / (n - 1)) * 2 - 1;
      return v - (coefficients[0] + coefficients[1] * u + coefficients[2] * u * u);
    });
    const spread = residuals.map(Math.abs).sort((a, b) => a - b)[n >> 1] || 1;
    for (let i = 0; i < n; i++) {
      // Tukey: a column two spreads off the fit contributes nothing at all.
      const r = residuals[i] / (2.2 * spread + 1e-6);
      weights[i] = Math.abs(r) < 1 ? (1 - r * r) ** 2 : 0;
    }
  }

  return profile.map((_, i) => {
    const u = (i / (n - 1)) * 2 - 1;
    return coefficients[0] + coefficients[1] * u + coefficients[2] * u * u;
  });
}

/** Gaussian elimination on a 3x3; enough for the fit above and nothing more. */
function solve3(m, rhs) {
  const a = m.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    if (Math.abs(a[col][col]) < 1e-9) continue;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c < 4; c++) a[r][c] -= f * a[col][c];
    }
  }
  return [0, 1, 2].map((i) => (Math.abs(a[i][i]) < 1e-9 ? 0 : a[i][3] / a[i][i]));
}

/**
 * Take the painted title off one cover and leave a lettering panel behind.
 * Operates on RGBA in place, BEFORE `bind`, so the cleared leather is dyed,
 * worked and vignetted by exactly the same pass as the leather it came from —
 * a panel graded separately would sit a shade off its own cover.
 */
function relabel(data, width, height, panel, seed) {
  const { x, y, w, h } = panel;
  const x1 = x + w;
  const y1 = y + h;
  const feather = panel.feather ?? FEATHER;

  const at = (px, py, c) => data[(py * width + px) * 4 + c];

  // The donor bands, one above the panel and one below. Median down the depth
  // rather than mean, so a single row that clips an ornament does not lift the
  // column; the robust fit along the panel's length then throws out whichever
  // columns the ornament reached anyway.
  const top = [[], [], []];
  const bottom = [[], [], []];
  const median = (values) => values.sort((a, b) => a - b)[values.length >> 1];
  for (let px = x; px < x1; px++) {
    for (let c = 0; c < 3; c++) {
      const above = [];
      const below = [];
      for (let k = 1; k <= DONOR; k++) {
        above.push(at(px, y - k, c));
        below.push(at(px, y1 - 1 + k, c));
      }
      top[c].push(median(above));
      bottom[c].push(median(below));
    }
  }
  const topFit = top.map(robustProfileFit);
  const bottomFit = bottom.map(robustProfileFit);

  // How coarse this hide actually is, read off the donor bands themselves
  // rather than guessed: the residual against the fit, as a fraction of the
  // level, is the grain. Hand-picking an amplitude would have been wrong on
  // two covers whatever number was picked — the vellum is nearly smooth and
  // the worked leather is not — and a panel grained unlike its own cover is
  // exactly the flat rectangle this is meant to avoid.
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let i = 0; i < w; i++) {
    for (const [fit, edge, step] of [[topFit, y - 1, -1], [bottomFit, y1, 1]]) {
      for (let k = 0; k < DONOR; k++) {
        for (let c = 0; c < 3; c++) {
          const level = fit[c][i];
          if (level < 4) continue;
          const r = (at(x + i, edge + k * step, c) - level) / level;
          // Anything this far off is ornament the fit already threw out, not grain.
          if (Math.abs(r) > 0.3) continue;
          sum += r;
          sumSquares += r * r;
          count++;
        }
      }
    }
  }
  const grainSigma = clamp(
    count > 20 ? Math.sqrt(Math.max(0, sumSquares / count - (sum / count) ** 2)) : 0.03,
    // Wide, because it is a measurement and not a preference: a black cover
    // measures three times the relative grain of the vellum one purely because
    // its leather is dark. The bounds are only there to stop a degenerate
    // reading — an all-ornament donor band — from sanding or blizzarding a
    // panel.
    0.008, 0.25,
  );

  // Three octaves, weighted so most of the power sits at pixel scale. That
  // proportion is not a matter of taste: leather's own spectrum is dominated by
  // pore, and a texture built mostly of blotch measures the same overall but
  // still reads as a smooth patch beside the real thing.
  const texture = (px, py) => (noiseAt(px, py, seed) - 0.5)
    + (mottleAt(px, py, 4, seed + 3) - 0.5) * 0.42
    + (mottleAt(px, py, 13, seed + 11) - 0.5) * 0.34;

  // Normalised against its own spread over this panel rather than a constant,
  // so `grainSigma` lands as measured however the octaves are reweighted.
  let textureSum = 0;
  let textureSquares = 0;
  for (let py = y; py < y1; py++) {
    for (let px = x; px < x1; px++) {
      const v = texture(px, py);
      textureSum += v;
      textureSquares += v * v;
    }
  }
  const samples = w * h;
  const textureSigma = Math.sqrt(
    Math.max(1e-6, textureSquares / samples - (textureSum / samples) ** 2),
  );

  // Interpolate between the CENTRES of the two donor bands rather than the
  // panel's own edges, so the ramp arrives at the sampled value exactly where
  // it was sampled and the join carries no step.
  const yTop = y - (DONOR + 1) / 2;
  const yBottom = y1 - 1 + (DONOR + 1) / 2;

  for (let py = y; py < y1; py++) {
    const t = (py - yTop) / (yBottom - yTop);
    for (let px = x; px < x1; px++) {
      const i = (py * width + px) * 4;
      if (data[i + 3] === 0) continue;

      // Full erase across the panel, easing out over the last pixels so the
      // reconstructed field meets the painted one without a seam to catch.
      const fade = Math.min(
        smoothstep(0, feather, px - x), smoothstep(0, feather, x1 - 1 - px),
        smoothstep(0, feather, py - y), smoothstep(0, feather, y1 - 1 - py),
      );

      const grain = 1 + (grainSigma / textureSigma) * texture(px, py);

      const k = px - x;
      for (let c = 0; c < 3; c++) {
        const field = (topFit[c][k] * (1 - t) + bottomFit[c][k] * t) * grain;
        data[i + c] = clamp(Math.round(data[i + c] * (1 - fade) + field * fade), 0, 255);
      }
    }
  }

  if (!panel.tooled) return grainSigma;

  // ── The blind stamp ──────────────────────────────────────────────────────
  //
  // A fillet impressed into the panel's edge: no gilt, only relief, which is
  // what "blind" means and what keeps this from competing with the gold frame
  // it sits inside. Light comes from the upper left, as it does everywhere in
  // this art, so a groove's upper wall catches and its lower wall loses.
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hw = w / 2;
  const hh = h / 2;
  const RADIUS = 4;
  const INSET = 4.5;
  const LX = -0.55;
  const LY = -0.84;

  for (let py = Math.floor(y - 3); py < Math.ceil(y1 + 3); py++) {
    for (let px = Math.floor(x - 3); px < Math.ceil(x1 + 3); px++) {
      const i = (py * width + px) * 4;
      if (data[i + 3] === 0) continue;

      const dx = px - cx;
      const dy = py - cy;
      const sd = roundedRectSD(dx, dy, hw, hh, RADIUS);
      if (sd > 3) continue;

      let shade = 1;

      // The panel is pressed below the field it sits in, so it takes a little
      // less light overall and a shadow off the wall that overhangs it.
      if (sd < 0) {
        shade *= 1 - 0.02;
        shade *= 1 - 0.03 * (1 - smoothstep(0, 22, py - y));
        shade *= 1 + 0.03 * (1 - smoothstep(0, 10, y1 - py));
        shade *= 1 - 0.03 * (1 - smoothstep(0, 12, px - x));
      } else {
        // The lip the stamp raised around itself.
        shade *= 1 + 0.03 * (1 - smoothstep(0, 3, sd)) * (py < cy ? 1 : -0.8);
      }

      // The fillet. Depth from how near the groove's centre line, and the two
      // walls shaded off the outward normal so the line reads as impressed
      // rather than drawn. Kept deliberately faint: a heavier line stops being
      // tooling and becomes a border drawn around a rectangle, which is the
      // one thing this panel must not look like.
      const d = sd + INSET;
      if (Math.abs(d) < 1.25) {
        // A tool pressed by hand does not bite evenly along its run, and a line
        // of perfectly constant depth is the tell that gave the whole panel
        // away on the vellum volume — where the ground is pale enough to show
        // every bit of it. The wander is coarse and slow, an arm's worth.
        const depth = (1 - (d / 1.25) ** 2)
          * (0.68 + 0.64 * mottleAt(px, py, 26, seed + 17));
        const e = 0.35;
        const nx = roundedRectSD(dx + e, dy, hw, hh, RADIUS) - roundedRectSD(dx - e, dy, hw, hh, RADIUS);
        const ny = roundedRectSD(dx, dy + e, hw, hh, RADIUS) - roundedRectSD(dx, dy - e, hw, hh, RADIUS);
        const len = Math.hypot(nx, ny) || 1;
        const lit = -((nx / len) * LX + (ny / len) * LY);
        shade *= 1 - 0.045 * depth;
        shade *= 1 + 0.05 * depth * Math.sign(d) * lit;
      }

      for (let c = 0; c < 3; c++) data[i + c] = clamp(Math.round(data[i + c] * shade), 0, 255);
    }
  }

  return grainSigma;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const book of books) {
  const { data, W, H, C } = book.src;
  let pipeline = sharp(data, { raw: { width: W, height: H, channels: C } })
    .extract({ left: book.x0, top: book.y0, width: book.w, height: book.h })
    .resize(BODY_W, book.scaledH, { kernel: 'lanczos3' });

  if (book.modulate) pipeline = pipeline.modulate(book.modulate);

  const cover = await pipeline.png().toBuffer();

  // Bound after the book is placed on its canvas, so the wear at the edges is
  // measured from the volume's own centre rather than from the sheet it was
  // cut out of.
  const placed = await sharp({
    create: {
      width: CANVAS_W, height: canvasH,
      channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cover, left: PAD_X, top: baseline - book.bodyBottom }])
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Cleared before the grade, not after: `bind` re-hues, caps and vignettes the
  // whole canvas, and leather that skipped that pass would be a shade off the
  // cover it was reconstructed from.
  const grain = relabel(
    placed, CANVAS_W, canvasH, LABEL[book.slug],
    // A seed per volume, so no two covers get the same grain, and the same
    // seed on every run, so a rerun does not put a different hide in the diff.
    [...book.slug].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 997,
  );

  const bound = bind(placed, CANVAS_W, canvasH, STOCK[book.slug]);

  const out = path.join(OUT_DIR, `${book.slug}.webp`);
  const result = await sharp(bound, {
    raw: { width: CANVAS_W, height: canvasH, channels: 4 },
  })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(
    `${book.slug.padEnd(11)} ${result.width}x${result.height}  `
    + `${String(Math.round(result.size / 1024)).padStart(3)} kB  `
    + `(resampled ${book.scale.toFixed(3)}, `
    // Printed because it is measured rather than chosen: if a cover's panel
    // ever comes out looking flat, this is the first number to look at.
    + `panel grain ${(grain * 100).toFixed(1)}%)`,
  );
}

console.log(
  `\nwrote ${books.length} covers to ${path.relative(ROOT, OUT_DIR)} `
  + `— ${CANVAS_W}x${canvasH}, standing on y=${baseline}`,
);

// The shelf has to set its type over the panel this script just cleared, and
// the panel is in a different place on every cover. Rather than keep the same
// eight rectangles measured twice — once here against the art, once by hand in
// the stylesheet — the geometry is written out as build output beside the
// covers it belongs to, and web/src/covers.ts reads it. LABEL above is the one
// place they are set; this file is derived and should not be edited.
//
// Fractions of the canvas rather than pixels, because that is what CSS wants:
// the book is laid out at whatever width the shelf gives it, so a panel fixed
// in pixels would drift off its cover at every breakpoint.
const labels = Object.fromEntries(
  books.map(({ slug }) => {
    const { x, y, w, h } = LABEL[slug];
    const round = (v) => Number(v.toFixed(5));
    return [slug, {
      left: round(x / CANVAS_W),
      top: round(y / canvasH),
      width: round(w / CANVAS_W),
      height: round(h / canvasH),
    }];
  }),
);

const labelsFile = path.join(OUT_DIR, 'labels.json');
fs.writeFileSync(
  labelsFile,
  `${JSON.stringify({ _: 'Generated by scripts/prepare-volumes.mjs — edit LABEL there.', ...labels }, null, 2)}\n`,
);
console.log(`wrote ${path.relative(ROOT, labelsFile)}`);

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

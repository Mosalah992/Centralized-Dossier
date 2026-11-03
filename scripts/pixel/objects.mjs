// The furniture and fittings, each its own sprite, placed by
// web/src/pixel/layout.ts. Returns [name, raster, extra] for the manifest;
// an animated sprite is a strip of frames left to right, and its extra says
// how many and how wide each is.
//
// Light falls from the upper left throughout: top and left edges catch it,
// bottom and right edges are in shade. Gold is the only trim; blue appears
// only where there is magic (the arches' portals, the sconces). Ancarion and
// the Orrery's glass stay painted; their frame, plate and cradle are drawn
// here.

import { PANELS, PLACES, PORTRAIT } from '../../web/src/pixel/layout.ts';
import { LEAF, LEAF_FLAT } from './glyphs.mjs';
import { Raster, seeded } from './raster.mjs';

/** A cheap fixed hash, for placements that are the same every build. */
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/** A strip of `n` frames, each drawn fresh by `frame(raster, i)`. */
function strip(w, h, n, frame) {
  const out = new Raster(w * n, h);
  for (let i = 0; i < n; i++) {
    const f = new Raster(w, h);
    frame(f, i);
    out.blit(f, i * w, 0);
  }
  return out;
}

/** The raster mirrored left to right. */
function flipped(src) {
  const out = new Raster(src.width, src.height);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) out.px[y * src.width + (src.width - 1 - x)] = src.px[y * src.width + x];
  return out;
}

/**
 * A bevelled band round a rectangle, `ramp.lit` on its upper-left half and
 * `ramp.shade` on its lower-right, indexed by depth from the outer edge.
 */
function bevel(r, x0, y0, x1, y1, ramp) {
  const depth = ramp.lit.length;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const [dl, dt, dr, db] = [x - x0, y - y0, x1 - x, y1 - y];
      const d = Math.min(dl, dt, dr, db);
      if (d >= depth) continue;
      // Top and left edges lit, bottom and right in shade, mitred at the
      // corners: the top right mitre takes the light, the bottom left the shade.
      let lit = dt === d || dl === d;
      if (dl === d && db === d) lit = false;
      r.set(x, y, (lit ? ramp.lit : ramp.shade)[d]);
    }
}

/**
 * The pointed Altmer cresting along a cabinet's top: a gable stepped three
 * across for each one up, lit along its left slope, with a gold finial.
 */
function crest(r, x0, x1, base, h) {
  for (let i = 0; i < h; i++) {
    const y = base - 1 - i;
    const l = x0 + 3 * i;
    const rr = x1 - 3 * i;
    for (let x = l; x <= rr; x++) r.set(x, y, 'w');
    r.hline(l, l + 2, y, 'Y');
    r.hline(rr - 2, rr, y, 'G');
  }
  const mid = Math.floor((x0 + x1) / 2);
  r.set(mid, base - h - 1, 'Y');
  r.set(mid + 1, base - h - 1, 'G');
  r.set(mid, base - h - 2, 'L');
  // A gold boss in the gable.
  r.hline(mid - 1, mid + 2, base - 3, 'y');
  r.set(mid - 1, base - 3, 'Y');
  r.set(mid + 2, base - 3, 'G');
}

/** A cornice: a lit top, a mid band, a gold line beneath. */
function cornice(r, x0, x1, y) {
  r.hline(x0, x1, y, 'O');
  r.hline(x0, x1, y + 1, 'o');
  r.hline(x0, x1, y + 2, 'y');
  r.set(x1, y + 1, 'W');
}

/** A plinth: a gold line, then wood in shade toward the floor. */
function plinth(r, x0, x1, y) {
  r.hline(x0, x1, y, 'y');
  r.hline(x0, x1, y + 1, 'o');
  r.hline(x0, x1, y + 2, 'W');
  r.hline(x0, x1, y + 3, 'W');
  r.hline(x0, x1, y + 4, 'w');
  r.vline(x1, y + 1, y + 4, 'w');
}

/** Two bracket feet, tapering inward, under a case from x0 to x1. */
function feet(r, x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y++) {
    const w = 7 - (y - y0);
    r.hline(x0, x0 + w - 1, y, 'w');
    r.set(x0, y, 'W');
    r.hline(x1 - w + 1, x1, y, 'K');
  }
}

/** A case's side stile, its gold inlay down the middle. */
function stile(r, x, top, bottom, side) {
  const cols = side === 'left' ? ['o', 'W', 'G', 'w'] : ['W', 'G', 'W', 'K'];
  cols.forEach((key, i) => {
    for (let y = top; y < bottom; y++) {
      const inlay = key === 'G' && (y < top + 3 || y > bottom - 4);
      r.set(x + i, y, inlay ? 'W' : key);
    }
  });
}

// ─── Bookshelf ────────────────────────────────────────────────────────────

/** Leathers as [shade, base, light]. */
const LEATHERS = [
  ['r', 'R', 'x'],
  ['n', 'N', 'v'],
  ['f', 'F', 'h'],
  ['w', 'W', 'o'],
  ['q', 'P', 'p'],
  ['K', 'w', 'W'],
  ['g', 'G', 'y'],
  ['r', 'R', 'x'],
  ['n', 'N', 'v'],
];

function spine(r, x, y, w, h, [shade, base, light], label) {
  for (let i = 0; i < w; i++) r.vline(x + i, y, y + h - 1, i === 0 ? light : i === w - 1 ? shade : base);
  if (h > 6 && base !== 'G') {
    r.hline(x, x + w - 1, y + 1, 'G');
    r.hline(x, x + w - 1, y + h - 3, 'G');
    r.set(x, y + 1, 'y');
    r.set(x, y + h - 3, 'y');
  }
  if (label && w >= 3 && h > 9) r.vline(x + 1, y + 4, y + 6, 'p');
}

/** One shelf of books from x0 to x1, standing on yBottom. */
function shelfRow(r, x0, x1, yTop, yBottom, rand) {
  const room = yBottom - yTop + 1;
  let x = x0;
  while (x <= x1) {
    const roll = rand();
    const pick = LEATHERS[Math.floor(rand() * LEATHERS.length)];
    if (roll < 0.07 && x1 - x >= 10) {
      // A stack lying flat.
      const w = 8 + Math.floor(rand() * 3);
      let y = yBottom;
      for (let k = 0; k < 3; k++) {
        const [shade, base, light] = LEATHERS[Math.floor(rand() * LEATHERS.length)];
        const inset = k === 1 ? 1 : 0;
        r.hline(x + inset, x + w - 1 - inset, y, shade);
        r.hline(x + inset, x + w - 1 - inset, y - 1, light);
        r.set(x + inset, y, base);
        y -= 2;
      }
      x += w + 1;
      continue;
    }
    if (roll < 0.13) {
      x += 2 + Math.floor(rand() * 2);
      continue;
    }
    const w = 2 + Math.floor(rand() * 3);
    if (x + w - 1 > x1) {
      // The last gap: a book leans into it if there is room.
      const left = x1 - x + 1;
      if (left >= 3) {
        const h = room - 3;
        for (let j = 0; j < h; j++) {
          const off = Math.floor(j / 4);
          r.set(x + off, yBottom - j, pick[2]);
          r.set(x + off + 1, yBottom - j, pick[1]);
          r.set(x + off + 2, yBottom - j, pick[0]);
        }
      }
      break;
    }
    const h = room - 1 - Math.floor(rand() * 5);
    spine(r, x, yBottom - h + 1, w, h, pick, rand() < 0.4);
    x += w;
  }
}

function bookshelf() {
  const { w: W, h: H } = PLACES.bookshelf;
  const r = new Raster(W, H);
  const rand = seeded(1453);
  crest(r, 4, 51, 10, 8);
  cornice(r, 1, W - 2, 10);
  const top = 13;
  const bottom = 96;
  r.rect(3, top, W - 6, bottom - top, 'k');
  stile(r, 3, top, bottom, 'left');
  stile(r, W - 7, top, bottom, 'right');
  let from = top + 1;
  for (const board of [29, 46, 63, 80, bottom]) {
    shelfRow(r, 7, W - 8, from, board - 1, rand);
    if (board < bottom) {
      r.hline(7, W - 8, board, 'o');
      r.hline(7, W - 8, board + 1, 'w');
    }
    from = board + 2;
  }
  plinth(r, 1, W - 2, bottom);
  feet(r, 2, W - 3, bottom + 5, H - 1);
  return r;
}

// ─── Bulletin board ───────────────────────────────────────────────────────

function notice(r, x, y, w, h, kind, rand) {
  r.rect(x, y, w, h, 'p');
  r.vline(x + w - 1, y + 1, y + h - 1, 'P');
  r.hline(x + 1, x + w - 1, y + h - 1, 'P');
  // A dog-eared corner.
  r.set(x + w - 1, y + h - 1, null);
  r.set(x + w - 2, y + h - 2, 'q');
  if (kind === 'wanted') {
    r.hline(x + 2, x + w - 3, y + 2, 'k');
    r.rect(x + 4, y + 4, w - 8, 7, 'P');
    r.ellipse(x + w / 2 - 2, y + 5, 4, 3, 'q');
    r.rect(x + w / 2 - 3, y + 8, 6, 3, 'q');
    r.hline(x + 3, x + w - 4, y + h - 4, 'R');
    r.hline(x + 4, x + w - 5, y + h - 2, 'q');
  } else {
    const lines = kind === 'scrap' ? 1 : Math.floor((h - 4) / 2);
    for (let i = 0; i < lines; i++) {
      const ly = y + 3 + i * 2;
      if (ly >= y + h - 2) break;
      for (let lx = x + 2; lx <= x + w - 3; lx++) if (rand() > 0.18) r.set(lx, ly, i === 0 ? 'k' : 'q');
    }
    if (kind === 'decree') {
      r.dither(x + w / 2 - 1, y + h - 5, 3, 3, 'R', 'x');
      r.set(x + w / 2, y + h - 4, 'x');
    }
  }
  r.set(x + Math.floor(w / 2), y, kind === 'decree' ? 'x' : 'Y');
}

function board() {
  const { w: W, h: H } = PLACES.board;
  const r = new Raster(W, H);
  const rand = seeded(1066);
  // The pent: a shallow gable stepped fourteen across for each one up.
  const mid = W / 2;
  for (let i = 0; i < 3; i++) {
    const half = 18 + 14 * i;
    r.hline(mid - half, mid + half - 1, i, 'W');
    r.hline(mid - half, mid - half + 13, i, 'o');
    r.hline(mid + half - 14, mid + half - 1, i, 'w');
  }
  r.hline(0, W - 1, 3, 'y');
  // The frame and its planks.
  r.rect(0, 4, W, H - 4, 'w');
  r.hline(0, W - 1, 4, 'o');
  r.rect(3, 6, W - 6, 21, 'W');
  for (let x = 14; x < W - 3; x += 12) {
    r.vline(x, 6, 26, 'w');
    r.vline(x + 1, 6, 26, 'o');
  }
  r.hline(3, W - 4, 6, 'w');
  r.vline(2, 5, 27, 'G');
  r.vline(W - 3, 5, 27, 'g');
  r.hline(0, W - 1, 27, 'y');
  r.hline(0, W - 1, 28, 'W');
  r.hline(0, W - 1, 29, 'k');
  // Scraps of older notices, then the notices themselves.
  r.rect(55, 21, 5, 3, 'q');
  r.rect(100, 22, 4, 4, 'q');
  for (const [x, y, w, h, kind] of [
    [6, 8, 14, 16, 'text'],
    [23, 7, 12, 11, 'text'],
    [24, 20, 11, 6, 'scrap'],
    [38, 8, 16, 18, 'wanted'],
    [57, 7, 13, 13, 'decree'],
    [72, 9, 12, 15, 'text'],
    [87, 7, 15, 12, 'text'],
    [88, 20, 12, 6, 'scrap'],
    [104, 10, 8, 12, 'text'],
  ])
    notice(r, x, y, w, h, kind, rand);
  return r;
}

// ─── The arches ───────────────────────────────────────────────────────────

/**
 * An equilateral lancet: each half of the opening is an arc centred on the
 * opposite springing point, so the two arcs meet in a point at the top.
 */
const ARCH = { spring: 38, half: 17, cx: 23.5, band: 5 };

/** Signed distance from the opening's edge: negative inside the opening. */
function archDistance(x, y) {
  const px = x + 0.5;
  const py = y + 0.5;
  const { spring, half, cx } = ARCH;
  if (py >= spring) return Math.abs(px - cx) - half;
  const ox = px < cx ? cx + half : cx - half;
  return Math.hypot(px - ox, py - spring) - half * 2;
}

function arch(f, frame, lit) {
  const { w: W, h: H } = PLACES.archL;
  const { spring, cx } = ARCH;
  const floor = 87;
  for (let y = 0; y < floor; y++)
    for (let x = 0; x < W; x++) {
      const d = archDistance(x, y);
      const left = x + 0.5 < cx;
      if (d < 0) {
        // The portal: Aetherius beyond a veil of blue magic.
        const inner = -d;
        const h = hash(x * 131 + y, 77);
        let key = lit && (x + y) % 2 === 0 ? 'N' : 'n';
        if (h % 41 === 0) key = (h >>> 9) % 4 === frame ? 'v' : 'C';
        else if (h % 29 === 0) key = (h >>> 11) % 4 === (frame + 2) % 4 ? 'b' : 'c';
        else if (h % 17 === 0) key = 'b';
        if (inner < 5 && (y + frame * 2) % 8 < (lit ? 2 : 1)) key = lit ? 'c' : 'B';
        if (inner < 2.2) key = lit ? 'B' : 'b';
        if (inner < 1) key = lit ? 'c' : 'B';
        f.set(x, y, key);
      } else if (d < ARCH.band) {
        const band = Math.floor(d);
        const ramp = left ? ['g', 'y', 'Y', 'y', 'g'] : ['g', 'G', 'y', 'G', 'g'];
        let key = ramp[band];
        // Leaves carved along the middle of the band.
        if (band === 2 && (y + (left ? 0 : 2)) % 4 === 0) key = left ? 'L' : 'Y';
        f.set(x, y, key);
      } else if (y < spring && d < ARCH.band + 2) {
        // A vine climbing the arch's flanks on the wall, leaves outward.
        const step = Math.floor(d);
        if (step === ARCH.band && y % 3 !== 0) f.set(x, y, 'F');
        if (step === ARCH.band + 1 && y % 6 === 1) f.set(x, y, y % 12 === 1 ? 'H' : 'h');
      }
    }
  // The star at the apex.
  f.hline(23, 24, 0, 'Y');
  f.set(22, 1, 'y');
  f.set(23, 1, 'L');
  f.set(24, 1, 'L');
  f.set(25, 1, 'G');
  f.hline(23, 24, 2, 'y');
  // Leaf-crowned capitals where the arch springs, and its bases.
  for (const x0 of [0, W - 8]) {
    f.hline(x0, x0 + 7, spring - 2, 'Y');
    f.hline(x0, x0 + 7, spring - 1, 'y');
    f.hline(x0, x0 + 7, spring, 'y');
    f.hline(x0, x0 + 7, spring + 1, 'G');
    f.set(x0 + 7, spring - 1, 'G');
    for (const [dx, key] of [[1, 'h'], [2, 'H'], [3, 'h'], [4, 'F'], [5, 'h'], [6, 'F']]) f.set(x0 + dx, spring - 3 - (dx % 2), key);
    f.hline(x0, x0 + 7, floor - 4, 'Y');
    f.hline(x0, x0 + 7, floor - 3, 'y');
    f.hline(x0, x0 + 7, floor - 2, 'G');
    f.hline(x0, x0 + 7, floor - 1, 'g');
  }
  // Two stone steps up to the threshold.
  f.hline(4, W - 5, floor, 't');
  f.hline(4, W - 5, floor + 1, 'S');
  f.hline(2, W - 3, floor + 2, 't');
  f.hline(2, W - 3, floor + 3, 'S');
  f.hline(2, W - 3, H - 1, 's');
}

// ─── Ancarion's frame and plate ───────────────────────────────────────────

/**
 * Ancarion's gold frame, the door to the Solar: a mitred bevel with a beaded
 * moulding, rosettes at the corners, a leaf at either side and a pointed
 * pediment, round an empty opening. He stays painted (RoomPortrait.tsx): the
 * painting shows through the opening.
 */
function portraitFrame() {
  const { w: W, h: H } = PORTRAIT.door;
  const o = PORTRAIT.opening;
  const r = new Raster(W, H);
  const [top, bottom] = [o.y - 6, o.y + o.h + 5];
  bevel(r, 0, top, W - 1, bottom, {
    lit: ['g', 'G', 'y', 'Y', 'y', 'g'],
    shade: ['g', 'g', 'G', 'y', 'G', 'g'],
  });
  // A beaded moulding along the middle of the band.
  for (let y = top; y <= bottom; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, y - top, W - 1 - x, bottom - y);
      if (d === 3 && (x + y) % 3 === 0) r.set(x, y, r.get(x, y) === 'Y' ? 'L' : 'Y');
    }
  // Rosettes at the corners of the band.
  for (const [x, y] of [[2, top + 2], [W - 5, top + 2], [2, bottom - 4], [W - 5, bottom - 4]]) {
    r.set(x + 1, y, 'Y');
    r.set(x, y + 1, 'Y');
    r.set(x + 1, y + 1, 'L');
    r.set(x + 2, y + 1, 'G');
    r.set(x + 1, y + 2, 'G');
  }
  // Small leaves halfway down each side.
  r.draw(LEAF, 1, o.y + o.h / 2 - 2);
  r.drawFlipped(LEAF, W - 4, o.y + o.h / 2 - 2, { Y: 'y', y: 'G', G: 'g' });
  // The pediment over the frame.
  crest(r, 17, 46, top, 4);
  if (bottom !== H - 1) throw new Error('the frame should fill the door');
  return r;
}

/**
 * The plate beneath Ancarion, where the word is spoken: a gold bevel round a
 * black slot, hung from the frame on two gold brackets.
 */
function portraitPlate() {
  const { w: W, h: H } = PORTRAIT.plateArt;
  const r = new Raster(W, H);
  r.rect(15, 0, 3, 1, 'G');
  r.rect(W - 18, 0, 3, 1, 'g');
  bevel(r, 10, 1, W - 11, H - 1, { lit: ['g', 'y', 'g'], shade: ['g', 'G', 'k'] });
  const slot = PORTRAIT.plate;
  r.rect(slot.x, slot.y - PORTRAIT.plateArt.y, slot.w, slot.h, 'k');
  return r;
}

// ─── The Cabinet ──────────────────────────────────────────────────────────

/** The drawers' rows, top to bottom: Fresh!, New, Old, Archive. */
const DRAWERS = [13, 30, 47, 64];

function drawer(r, x, y, w, h, fresh) {
  r.rect(x, y, w, h, 'W');
  r.hline(x, x + w - 1, y, 'o');
  r.vline(x, y, y + h - 1, 'o');
  r.hline(x, x + w - 1, y + h - 1, 'w');
  r.vline(x + w - 1, y, y + h - 1, 'w');
  // A recessed panel.
  r.hline(x + 2, x + w - 3, y + 2, 'w');
  r.vline(x + 2, y + 2, y + h - 3, 'w');
  r.hline(x + 2, x + w - 3, y + h - 3, 'O');
  r.vline(x + w - 3, y + 2, y + h - 3, 'O');
  // The brass label holder and its card, then the cup pull.
  const cx = x + Math.floor(w / 2);
  r.rect(cx - 6, y + 3, 12, 5, 'G');
  r.hline(cx - 6, cx + 5, y + 3, 'y');
  r.rect(cx - 5, y + 4, 10, 3, 'p');
  for (let i = cx - 4; i <= cx + 3; i++) if (i % 3 !== 0) r.set(i, y + 5, 'q');
  r.hline(cx - 3, cx + 2, y + 10, 'y');
  r.set(cx - 3, y + 10, 'Y');
  r.hline(cx - 2, cx + 1, y + 11, 'G');
  if (fresh) {
    // The Fresh! drawer wears a crimson tag.
    r.vline(cx + 7, y + 3, y + 6, 'x');
    r.vline(cx + 8, y + 3, y + 7, 'R');
  }
}

function cabinet(f, open) {
  const { w: W, h: H } = PLACES.cabinet;
  crest(f, 4, 51, 9, 8);
  cornice(f, 1, W - 2, 9);
  const top = 12;
  const bottom = 81;
  f.rect(3, top, W - 6, bottom - top, 'k');
  stile(f, 3, top, bottom, 'left');
  stile(f, W - 7, top, bottom, 'right');
  DRAWERS.forEach((y, i) => {
    if (i === 0 && open) {
      // Drawn out toward the reader: larger, and the drawer's sides beneath.
      f.rect(7, y, W - 14, 16, 'k');
      f.hline(7 - open, W - 8 + open, y + 15 + open, 'w');
      f.vline(7 - open, y + 2, y + 15 + open, 'K');
      f.vline(W - 8 + open, y + 2, y + 15 + open, 'K');
      drawer(f, 7 - open, y - open, W - 14 + 2 * open, 15 + open, true);
      return;
    }
    drawer(f, 7, y, W - 14, 16, i === 0);
  });
  plinth(f, 1, W - 2, bottom);
  feet(f, 2, W - 3, bottom + 5, H - 1);
}

// ─── The globe's cradle ───────────────────────────────────────────────────

/**
 * The gold cradle the Orrery's glass globe sits in (RoomOrb.tsx keeps the
 * globe itself painted): a cup hugging the globe's underside, on a stem with a
 * knop, on a stepped foot. The globe is 26 across, centred at (15, 13).
 */
function globeStand() {
  const { w: W, h: H } = PLACES.globe;
  const r = new Raster(W, H);
  const cx = 15;
  const cy = 13;
  const R = 13;
  for (let y = cy + 5; y <= cy + R + 2; y++)
    for (let x = cx - R - 2; x <= cx + R + 2; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R + 0.4 && d < R + 2.2) r.set(x, y, x < cx - 4 ? (d < R + 1.3 ? 'Y' : 'y') : x > cx + 4 ? 'G' : 'y');
    }
  r.hline(cx - 1, cx + 1, 28, 'y');
  r.set(cx + 1, 28, 'G');
  r.hline(cx - 2, cx + 2, 29, 'y');
  r.set(cx - 2, 29, 'Y');
  r.set(cx + 2, 29, 'G');
  r.hline(cx - 1, cx + 1, 30, 'G');
  r.hline(cx - 4, cx + 4, 31, 'y');
  r.set(cx - 4, 31, 'Y');
  r.set(cx + 4, 31, 'G');
  r.hline(cx - 6, cx + 6, 32, 'y');
  r.set(cx - 6, 32, 'Y');
  r.hline(cx + 4, cx + 6, 32, 'G');
  r.hline(cx - 7, cx + 7, H - 1, 'g');
  return r;
}

// ─── The Scribe Table ─────────────────────────────────────────────────────

function leg(r, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    const knop = y === y0 + 2 || y === y0 + 3;
    if (knop) {
      r.set(x - 1, y, 'o');
      r.set(x, y, 'O');
      r.set(x + 1, y, 'W');
      r.set(x + 2, y, 'w');
    } else {
      r.set(x, y, 'o');
      r.set(x + 1, y, 'W');
      r.set(x + 2, y, 'w');
    }
  }
  r.hline(x - 1, x + 2, y1, 'k');
}

function scribe() {
  const { w: W, h: H } = PLACES.scribe;
  const r = new Raster(W, H);
  const top = 12;
  const lip = 20;
  const apron = 30;
  // Legs and their stretcher, behind the apron.
  leg(r, 5, apron, H - 1);
  leg(r, W - 8, apron, H - 1);
  r.hline(8, W - 9, 36, 'W');
  r.hline(8, W - 9, 37, 'w');
  // The desktop, seen a little from above, and its lip catching the light.
  r.poly([[6, top], [W - 6, top], [W, lip], [0, lip]], (x, y) => (hash(x >> 3, y) % 5 === 0 ? 'o' : 'O'));
  r.hline(6, W - 7, top, 'o');
  r.hline(1, W - 2, lip, 'Y');
  // The apron, two drawers and their pulls, gold at the corners.
  r.rect(1, lip + 1, W - 2, apron - lip - 1, 'W');
  r.hline(1, W - 2, lip + 1, 'y');
  r.hline(1, W - 2, apron - 1, 'w');
  r.vline(1, lip + 2, apron - 1, 'o');
  r.vline(W - 2, lip + 2, apron - 1, 'w');
  for (const x0 of [10, W / 2 + 4]) {
    const x1 = x0 + W / 2 - 15;
    r.hline(x0, x1, lip + 3, 'w');
    r.vline(x0, lip + 3, apron - 3, 'w');
    r.hline(x0 + 1, x1, apron - 3, 'o');
    r.vline(x1, lip + 4, apron - 3, 'o');
    const cx = Math.floor((x0 + x1) / 2);
    r.set(cx, lip + 5, 'Y');
    r.set(cx + 1, lip + 5, 'y');
    r.set(cx, lip + 6, 'y');
    r.set(cx + 1, lip + 6, 'G');
  }
  for (const x of [2, W - 4]) r.draw(['yG', 'G.'], x, lip + 2);
  // A stack of papers, and the Clerk's seal standing on it.
  r.rect(8, 15, 11, 4, 'p');
  r.hline(9, 19, 18, 'P');
  r.vline(19, 15, 18, 'P');
  r.hline(9, 17, 16, 'q');
  r.rect(12, 9, 3, 5, 'w');
  r.vline(12, 9, 13, 'W');
  r.set(13, 8, 'o');
  r.hline(11, 15, 14, 'y');
  r.set(15, 14, 'G');
  // The register, open, its lines, and its crimson ribbon over the edge.
  const mid = W / 2;
  r.poly([[mid - 15, top - 1], [mid, top - 2], [mid, lip - 1], [mid - 17, lip - 1]], 'p');
  r.poly([[mid, top - 2], [mid + 15, top - 1], [mid + 17, lip - 1], [mid, lip - 1]], 'p');
  r.vline(mid - 1, top - 2, lip - 1, 'P');
  r.vline(mid, top - 2, lip - 1, 'q');
  r.vline(mid + 16, top + 3, lip - 1, 'P');
  r.hline(mid - 16, mid + 16, lip - 1, 'P');
  for (const ly of [top + 1, top + 3, top + 5]) {
    for (let x = mid - 14; x <= mid - 3; x++) if ((x * 3 + ly) % 7) r.set(x, ly, 'q');
    for (let x = mid + 3; x <= mid + 14; x++) if ((x * 5 + ly) % 6) r.set(x, ly, 'q');
  }
  r.vline(mid + 8, lip, lip + 6, 'x');
  r.set(mid + 8, lip + 7, 'R');
  // The inkwell and its quill.
  r.hline(59, 62, top + 1, 'y');
  r.set(59, top + 1, 'Y');
  r.rect(58, top + 2, 6, 5, 'k');
  r.set(58, top + 3, 'w');
  r.hline(58, 63, top + 7, 'K');
  for (let t = 0; t < 12; t++) {
    r.set(61 + t, top - t, t < 3 ? 'q' : 'p');
    if (t >= 3 && t < 11) r.set(62 + t, top - t, t % 3 ? 'L' : 'P');
  }
  return r;
}

// ─── Candles and sconces ──────────────────────────────────────────────────

const CANDLE_FLAMES = [
  ['.....E......', '.....Ee.....', '....eEEe....', '....eEEe....', '....eEEy....', '.....ey.....', '.....k......'],
  ['....E.......', '....Ee......', '....eEe.....', '....eEEe....', '....eEEy....', '.....ey.....', '.....k......'],
  ['.....e......', '.....E......', '....eEe.....', '....eEEe....', '....eEEe....', '.....Ey.....', '.....k......'],
  ['......E.....', '.....eE.....', '.....eEe....', '....eEEe....', '....eEEy....', '.....ey.....', '.....k......'],
];

/** A gold floor candlestick, its candle dripping, its flame in four frames. */
function candle(f, frame) {
  const { h: H } = PLACES.candleL;
  f.draw(CANDLE_FLAMES[frame], 0, 0);
  // The candle, lit on its left, a drip down its right.
  f.rect(4, 7, 4, 10, 'p');
  f.vline(4, 7, 16, 'L');
  f.vline(7, 8, 16, 'P');
  f.vline(8, 8, 11, 'p');
  f.set(8, 12, 'P');
  // The drip pan, the stem and its two knops, the foot.
  f.hline(2, 9, 17, 'y');
  f.set(2, 17, 'Y');
  f.set(9, 17, 'G');
  f.hline(3, 8, 18, 'G');
  for (let y = 19; y < H - 4; y++) {
    f.set(5, y, 'y');
    f.set(6, y, 'G');
  }
  for (const y of [23, 29]) {
    f.hline(4, 7, y, 'y');
    f.set(4, y, 'Y');
    f.set(7, y, 'G');
  }
  f.hline(3, 8, H - 4, 'y');
  f.set(3, H - 4, 'Y');
  f.hline(2, 9, H - 3, 'G');
  f.set(2, H - 3, 'y');
  f.hline(1, 10, H - 2, 'y');
  f.set(1, H - 2, 'Y');
  f.hline(8, 10, H - 2, 'G');
  f.hline(0, 11, H - 1, 'g');
}

const SCONCE_FLAMES = [
  ['....C.....', '....Cc....', '...cCCc...', '...cCCc...', '..BcCCcB..', '..BccccB..', '...BBBB...'],
  ['...C......', '...Cc.....', '...cCc....', '...cCCc...', '..BcCCcB..', '..BccccB..', '...BBBB...'],
  ['....c.....', '....C.....', '...cCc....', '..BcCCc...', '..BcCCcB..', '..BccccB..', '...BBBB...'],
  ['.....C....', '....cC....', '....cCc...', '...cCCcB..', '..BcCCcB..', '..BccccB..', '...BBBB...'],
];

/** A wall sconce: a gold bowl on a backplate, burning blue. */
function sconce(f, frame) {
  f.draw(SCONCE_FLAMES[frame], 0, 1);
  f.draw(
    [
      '.YyyyyyyG.',
      '..yyyyyG..',
      '...GyyG...',
      '....yG....',
      '...gyGg...',
      '...YyyG...',
      '...yyyG...',
      '...yyGG...',
      '....yG....',
      '.....g....',
    ],
    0,
    8,
  );
}

// ─── Boughs, note, clock and plaque ───────────────────────────────────────

/** A gold bough reaching from the top left corner, leaves along it and a twig hanging. */
function bough() {
  const { w: W, h: H } = PLACES.boughL;
  const r = new Raster(W, H);
  const at = (x) => Math.round(3 + 0.33 * x - 0.0028 * x * x);
  for (let x = 0; x < W - 4; x++) {
    const y = at(x);
    const thick = x < 30 ? 3 : x < 64 ? 2 : 1;
    r.set(x, y, 'y');
    if (thick > 1) r.set(x, y + 1, 'G');
    if (thick > 2) r.set(x, y + 2, 'g');
  }
  // A twig hanging from the bough.
  for (let i = 0; i <= 22; i++) {
    const x = Math.round(40 + i * 0.35 + (i * i) / 60);
    r.set(x, at(40) + 2 + i, i < 12 ? 'G' : 'y');
  }
  for (let x = 6; x < W - 6; x += 7) {
    const y = at(x);
    const above = (x / 7) % 2 < 1;
    if (above) r.draw(LEAF, x, y - 5);
    else r.draw([...LEAF].reverse(), x, y + 2, { Y: 'y', y: 'G', G: 'g' });
  }
  for (let i = 4; i <= 20; i += 5) {
    const x = Math.round(40 + i * 0.35 + (i * i) / 60);
    r.draw(LEAF_FLAT, x + 1, at(40) + 1 + i, i % 2 ? {} : { Y: 'y', y: 'G' });
  }
  r.draw(LEAF_FLAT, W - 6, at(W - 6) - 1);
  return r;
}

/** The pinned note: parchment, a curled corner, a crimson wax pin. */
function note() {
  const { w: W, h: H } = PANELS.note;
  const r = new Raster(W, H);
  r.rect(1, 2, W - 3, H - 4, 'p');
  r.vline(W - 3, 3, H - 3, 'P');
  r.hline(2, W - 3, H - 3, 'P');
  // A shadow on the wall beneath it.
  r.vline(W - 2, 4, H - 2, 'k');
  r.hline(3, W - 2, H - 2, 'k');
  // Ragged edges: a nick here and there, placed by hash.
  for (let x = 2; x < W - 3; x++) {
    if (hash(x, 1) % 9 === 0) r.set(x, 2, null);
    if (hash(x, 2) % 11 === 0) r.set(x, H - 3, 'q');
  }
  for (let y = 3; y < H - 3; y++) if (hash(y, 3) % 10 === 0) r.set(1, y, null);
  // The curled corner.
  for (let i = 0; i < 6; i++) for (let j = 0; j <= i; j++) r.set(W - 3 - (5 - i) + j, H - 3 - j, null);
  r.line(W - 9, H - 3, W - 3, H - 9, 'q');
  r.poly([[W - 9, H - 3.5], [W - 3.5, H - 9], [W - 8, H - 8]], 'P');
  // The wax pin.
  const cx = Math.floor(W / 2);
  r.draw(['.Rx.', 'RxxR', 'rRRr', '.rr.'], cx - 2, 0);
  return r;
}

/** The plaque the hour is written on: a gold bevel round lacquer. */
function clock() {
  const { w: W, h: H } = PANELS.clock;
  const r = new Raster(W, H);
  bevel(r, 0, 0, W - 1, H - 1, { lit: ['g', 'Y', 'y', 'g'], shade: ['g', 'G', 'G', 'k'] });
  r.rect(4, 4, W - 8, H - 8, 'k');
  for (const [x, y] of [[1, 1], [W - 4, 1], [1, H - 4], [W - 4, H - 4]]) r.draw(['.L.', 'LYG', '.G.'], x, y);
  return r;
}

/** The nine-slice for name plaques: corners three pixels square. */
const PLAQUE = [
  '.gggggggggg.',
  'gYYYYYYYYYyg',
  'gYkkkkkkkkGg',
  'gYkkkkkkkkGg',
  'gYkkkkkkkkGg',
  'gYkkkkkkkkGg',
  'gYkkkkkkkkGg',
  'gYkkkkkkkkGg',
  'gyGGGGGGGGGg',
  '.gggggggggg.',
];

function plaque() {
  const r = new Raster(12, 10);
  r.draw(PLAQUE, 0, 0);
  return r;
}

/** A lighter plaque for labels that should not outweigh what they name: corners two pixels square. */
const PLAQUE_SMALL = [
  '.gggggg.',
  'gYYYYYyg',
  'gYkkkkGg',
  'gYkkkkGg',
  'gYkkkkGg',
  'gYkkkkGg',
  'gyGGGGGg',
  '.gggggg.',
];

function plaqueSmall() {
  const r = new Raster(8, 8);
  r.draw(PLAQUE_SMALL, 0, 0);
  return r;
}

export function drawObjects() {
  const { w: aw, h: ah } = PLACES.archL;
  const { w: cw, h: ch } = PLACES.cabinet;
  const { w: kw, h: kh } = PLACES.candleL;
  const { w: sw, h: sh } = PLACES.sconceL;
  const left = bough();
  return [
    ['bookshelf', bookshelf()],
    ['board', board()],
    ['arch', strip(aw, ah, 8, (f, i) => arch(f, i % 4, i >= 4)), { frames: 8, fw: aw }],
    ['portrait', portraitFrame()],
    ['portrait-plate', portraitPlate()],
    ['cabinet', strip(cw, ch, 3, (f, i) => cabinet(f, i)), { frames: 3, fw: cw }],
    ['globe-stand', globeStand()],
    ['scribe', scribe()],
    ['candle', strip(kw, kh, 4, candle), { frames: 4, fw: kw }],
    ['sconce', strip(sw, sh, 4, sconce), { frames: 4, fw: sw }],
    ['bough-l', left],
    ['bough-r', flipped(left)],
    ['note', note()],
    ['clock', clock()],
    ['plaque', plaque(), { slice: 3 }],
    ['plaque-small', plaqueSmall(), { slice: 2 }],
  ];
}

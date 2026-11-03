// The Solar's furniture, behind Ancarion (web/src/views/Solar.tsx), drawn on
// the room's palette and grid and placed by SOLAR in web/src/pixel/layout.ts.
// The hall itself is the room's scene: the Solar is another room of the same
// house. The realm map on the war table stays painted; the table's top is
// left dark where it lies (WAR_TABLE.map).
//
// Light falls from the upper left, as in the room.

import { SOLAR, WAR_TABLE } from '../../web/src/pixel/layout.ts';
import { EAGLE_15 } from './glyphs.mjs';
import { Raster } from './raster.mjs';

/** A cheap fixed hash, for placements that are the same every build. */
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/** The raster mirrored left to right. */
function flipped(src) {
  const out = new Raster(src.width, src.height);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) out.px[y * src.width + (src.width - 1 - x)] = src.px[y * src.width + x];
  return out;
}

/** A bevelled band round a rectangle: ramp.lit on the upper left, ramp.shade on the lower right. */
function bevel(r, x0, y0, x1, y1, ramp) {
  const depth = ramp.lit.length;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.min(x - x0, y - y0, x1 - x, y1 - y);
      if (d >= depth) continue;
      let lit = y - y0 === d || x - x0 === d;
      if (x - x0 === d && y1 - y === d) lit = false;
      r.set(x, y, (lit ? ramp.lit : ramp.shade)[d]);
    }
}

/** A turned leg: lit on its left, a bulb near the top, a foot at the floor. */
function leg(r, x, y0, y1) {
  for (let y = y0; y <= y1; y++) {
    const bulb = y >= y0 + 2 && y <= y0 + 5;
    const w = bulb ? 6 : 4;
    const l = x + (6 - w) / 2;
    r.hline(l, l + w - 1, y, 'W');
    r.set(l, y, 'o');
    r.set(l + w - 1, y, 'w');
  }
  r.hline(x, x + 5, y1, 'w');
  r.set(x, y1, 'W');
}

// ─── The war table ────────────────────────────────────────────────────────

/**
 * The war table, its top seen from above so the whole map lies open on it: a
 * wide wooden rim with a gold inlay round the dark bed where the map lies, an
 * apron with the Dominion's boss, and two turned legs to the floor.
 */
function warTable() {
  const { w: W, h: H } = SOLAR.table;
  const m = WAR_TABLE.map;
  const r = new Raster(W, H);
  const [x0, x1, y0, y1] = [m.x - 8, m.x + m.w + 7, 0, m.y + m.h + 3];
  // The rim, lit along its far and left edges.
  bevel(r, x0, y0, x1, y1, { lit: ['O', 'O', 'o', 'o'], shade: ['w', 'W', 'W', 'o'] });
  r.rect(x0 + 4, y0 + 2, x1 - x0 - 7, y1 - y0 - 3, 'o');
  // The gold inlay round the bed, one pixel in from it.
  const [ix0, iy0, ix1, iy1] = [m.x - 2, m.y - 2, m.x + m.w + 1, m.y + m.h + 1];
  r.hline(ix0, ix1, iy0, 'Y');
  r.vline(ix0, iy0, iy1, 'Y');
  r.hline(ix0, ix1, iy1, 'G');
  r.vline(ix1, iy0, iy1, 'G');
  // The bed the map lies on, and its shadow along the far and left edges.
  r.rect(m.x - 1, m.y - 1, m.w + 2, m.h + 2, 'k');
  r.rect(m.x, m.y, m.w, m.h, 'K');
  // Grain along the rim.
  for (let x = x0 + 4; x < x1 - 3; x++) {
    if (hash(x, 1) % 5 === 0) r.set(x, y0 + 2, 'W');
    if (hash(x, 2) % 5 === 0) r.set(x, y1 - 2, 'W');
  }
  // Brass corner plates.
  for (const [cx, cy] of [[x0 + 2, y0 + 1], [x1 - 4, y0 + 1], [x0 + 2, y1 - 3], [x1 - 4, y1 - 3]]) {
    r.set(cx, cy, 'Y');
    r.set(cx + 1, cy, 'y');
    r.set(cx, cy + 1, 'y');
    r.set(cx + 1, cy + 1, 'G');
  }
  // The apron under the top's front edge.
  const a0 = y1 + 1;
  const a1 = a0 + 9;
  r.rect(x0 + 2, a0, x1 - x0 - 3, a1 - a0 + 1, 'W');
  r.hline(x0 + 2, x1 - 2, a0, 'w');
  r.hline(x0 + 3, x1 - 3, a0 + 2, 'y');
  r.hline(x0 + 3, x1 - 3, a1 - 1, 'G');
  r.hline(x0 + 2, x1 - 2, a1, 'w');
  // The boss at the middle of the apron.
  const mid = Math.floor((x0 + x1) / 2);
  r.draw(['..Y..', '.YyG.', 'YyLyG', '.GyG.', '..G..'], mid - 2, a0 + 2);
  // Legs, the near two whole, the far two short behind the apron.
  leg(r, x0 + 4, a1 + 1, H - 1);
  leg(r, x1 - 9, a1 + 1, H - 1);
  r.rect(x0 + 16, a1 + 1, 3, 5, 'w');
  r.rect(x1 - 18, a1 + 1, 3, 5, 'w');
  // An ink outline round the shade side, so the table stands off the floor.
  r.outline('k', 'shade');
  return r;
}

// ─── The Clerk Table and Canonreeve's Desk ────────────────────────────────

/** A writing table's top, apron and legs; `top` draws what lies on it. */
function writingTable(top) {
  const { w: W, h: H } = SOLAR.clerk;
  const r = new Raster(W, H);
  const [x0, x1, t0, t1] = [2, W - 3, 10, 22];
  bevel(r, x0, t0, x1, t1, { lit: ['O', 'o'], shade: ['w', 'W'] });
  r.rect(x0 + 2, t0 + 2, x1 - x0 - 3, t1 - t0 - 3, 'o');
  const a0 = t1 + 1;
  r.rect(x0 + 1, a0, x1 - x0 - 1, 6, 'W');
  r.hline(x0 + 1, x1 - 1, a0, 'w');
  r.hline(x0 + 2, x1 - 2, a0 + 2, 'y');
  r.hline(x0 + 1, x1 - 1, a0 + 5, 'w');
  leg(r, x0 + 2, a0 + 6, H - 1);
  leg(r, x1 - 7, a0 + 6, H - 1);
  // A stretcher between the legs.
  r.hline(x0 + 8, x1 - 8, H - 7, 'W');
  r.hline(x0 + 8, x1 - 8, H - 6, 'w');
  top(r, { x0, x1, t0, t1 });
  r.outline('k', 'shade');
  return r;
}

/** The Clerk Table: a stack of filings, the gold Aldmeri seal and the crimson Denied, an inkwell. */
function clerkTable() {
  return writingTable((r, { x0, t0 }) => {
    // Filings, squared into a stack.
    r.rect(x0 + 6, t0 - 2, 20, 9, 'p');
    r.hline(x0 + 6, x0 + 25, t0 - 2, 'L');
    r.vline(x0 + 25, t0 - 1, t0 + 6, 'P');
    r.hline(x0 + 6, x0 + 25, t0 + 6, 'q');
    for (let i = 0; i < 3; i++) r.hline(x0 + 9, x0 + 21 - i * 3, t0 + 1 + i * 2, 'q');
    // The Aldmeri seal: a gold stamp on a turned handle.
    const sx = x0 + 34;
    r.draw(['..Ow..', '..oW..', '.OoWw.', '.oWWw.', 'YyyyyG', 'yLyyGG', 'GGGGgg'], sx, t0 - 7);
    // The Denied: the same, its face crimson.
    const dx = x0 + 44;
    r.draw(['..Ow..', '..oW..', '.OoWw.', '.oWWw.', 'xRRRRr', 'RxRRrr', 'rrrrrr'], dx, t0 - 7);
    // An inkwell and its quill.
    const ix = x0 + 58;
    r.draw(['....L', '...Lp', '..Lp.', '.kp..', 'kKKk.', 'KkkK.', 'kkkk.'], ix, t0 - 5);
  });
}

/** Canonreeve's Desk: bound books stacked, a book open with a quill across it, a candle. */
function canonreeveDesk() {
  return writingTable((r, { x0, t0 }) => {
    // Three books stacked, spines to the reader.
    const leathers = [['r', 'R', 'x'], ['n', 'N', 'v'], ['f', 'F', 'h']];
    leathers.forEach(([shade, base, light], i) => {
      const y = t0 + 2 - i * 4;
      const w = 18 - i * 2;
      r.rect(x0 + 4 + i, y, w, 4, base);
      r.hline(x0 + 4 + i, x0 + 3 + i + w, y, light);
      r.hline(x0 + 4 + i, x0 + 3 + i + w, y + 3, shade);
      r.vline(x0 + 7 + i, y + 1, y + 2, 'y');
      r.vline(x0 + 1 + i + w, y + 1, y + 2, 'y');
    });
    // The open book: two pages, the gutter between them, lines of writing.
    const bx = x0 + 28;
    r.rect(bx, t0 - 1, 24, 7, 'p');
    r.hline(bx, bx + 23, t0 - 1, 'L');
    r.vline(bx + 11, t0 - 1, t0 + 5, 'q');
    r.vline(bx + 12, t0 - 1, t0 + 5, 'P');
    r.hline(bx - 1, bx + 24, t0 + 6, 'N');
    for (let i = 0; i < 3; i++) {
      r.hline(bx + 2, bx + 9, t0 + 1 + i * 2, 'q');
      r.hline(bx + 14, bx + 21 - (i === 2 ? 4 : 0), t0 + 1 + i * 2, 'q');
    }
    // A quill across the right-hand page.
    r.line(bx + 15, t0 + 4, bx + 25, t0 - 6, 'L');
    r.line(bx + 16, t0 + 4, bx + 25, t0 - 5, 'p');
    // A candle in a gold dish, lit.
    const cx = x0 + 60;
    r.draw(['..E..', '.EeE.', '..e..', '.LpP.', '.pPq.', '.pPq.', '.pPq.', 'yyyyG', '.GGg.'], cx, t0 - 9);
  });
}

// ─── The back wall ────────────────────────────────────────────────────────

/** The Dominion's hanging: navy on a gold rod, a gold border, the eagle, a swallowtail and fringe. */
function hanging() {
  const { w: W, h: H } = SOLAR.hanging;
  const r = new Raster(W, H);
  // The rod and its finials.
  r.hline(0, W - 1, 1, 'y');
  r.hline(0, W - 1, 0, 'Y');
  r.hline(0, W - 1, 2, 'G');
  r.draw(['.Y.', 'YyG', '.G.'], 0, 0);
  r.draw(['.Y.', 'YyG', '.G.'], W - 3, 0);
  const [l, rr, top, hem] = [4, W - 5, 3, H - 10];
  for (let y = top; y < H; y++) {
    // The swallowtail: a V cut up into the hem.
    const cut = y >= hem ? Math.floor(((y - hem + 1) * (rr - l)) / 2 / (H - hem)) : -1;
    for (let x = l; x <= rr; x++) {
      const mid = (l + rr) / 2;
      if (cut >= 0 && Math.abs(x - mid) < cut) continue;
      let key = 'N';
      // Folds: lit and shaded columns down the cloth.
      const fold = (x - l) % 12;
      if (fold === 0) key = 'v';
      else if (fold === 11) key = 'n';
      // The gold border two pixels in.
      const d = Math.min(x - l, rr - x);
      if (d === 2 && y < hem) key = x < mid ? 'Y' : 'G';
      if (y === top + 2 && d >= 2) key = 'Y';
      if (y === hem - 1 && d >= 2) key = 'G';
      r.set(x, y, key);
    }
  }
  // The fringe along the hem's two tails.
  for (let x = l; x <= rr; x++) if (x % 2 === 0) {
    for (let y = H - 1; y >= hem; y--) if (r.get(x, y) !== null) { r.set(x, y, 'y'); break; }
  }
  // The eagle at the middle, in gold.
  r.draw(EAGLE_15, Math.floor(W / 2) - 7, 22);
  return r;
}

/** A window on the night: a stone frame round an arched light, a mullion and a transom, stars and the moon. */
function window(moon) {
  const { w: W, h: H } = SOLAR.windowL;
  const r = new Raster(W, H);
  const cx = (W - 1) / 2;
  const R = W / 2;
  const inside = (x, y, inset) => {
    if (y < R) {
      const dx = x - cx;
      const dy = R - 0.5 - y;
      return Math.hypot(dx, dy) <= R - inset - 0.5;
    }
    return x >= inset && x <= W - 1 - inset;
  };
  for (let y = 0; y < H - 4; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y, 0)) continue;
      // Stone, lit on the left of the arch, shaded on the right.
      if (!inside(x, y, 3)) {
        r.set(x, y, x < cx ? 't' : 'S');
        if (!inside(x, y, 1)) r.set(x, y, x < cx ? 'S' : 's');
        continue;
      }
      // The night through the glass, darker toward the top.
      let key = y < H * 0.45 ? 'n' : 'N';
      const h = hash(x, y + (moon ? 50 : 0));
      if (h % 61 === 0) key = 'L';
      else if (h % 97 === 0) key = 'C';
      r.set(x, y, key);
    }
  // Lead: the mullion and the transom, in dark gold.
  for (let y = 3; y < H - 4; y++) if (inside(Math.round(cx), y, 3)) r.set(Math.floor(cx), y, 'g');
  for (let x = 3; x < W - 3; x++) r.set(x, Math.floor(H * 0.6), 'g');
  // The moon, a crescent, in the left-hand window.
  if (moon) r.draw(['.LLL.', 'LLY..', 'LY...', 'LLY..', '.LLL.'], 7, 14);
  // The sill.
  r.hline(0, W - 1, H - 4, 't');
  r.hline(0, W - 1, H - 3, 'S');
  r.hline(1, W - 2, H - 2, 's');
  r.hline(2, W - 3, H - 1, 'k');
  return r;
}

export function drawSolar() {
  return [
    ['war-table', warTable()],
    ['clerk-table', clerkTable()],
    ['canonreeve-desk', canonreeveDesk()],
    ['solar-hanging', hanging()],
    ['solar-window-l', window(true)],
    ['solar-window-r', flipped(window(false))],
  ];
}

// The room itself, behind the furniture: ceiling, back wall, side walls and
// floor in one-point perspective, with the pillars, banners and potted ferns
// that give it depth. One master picture, wider and taller than any window,
// laid behind the furniture and cropped by the window (web/src/pixel/layout.ts).
//
// Each region is drawn by projecting its pixels back onto the back wall's
// plane, so panels, rails, tiles and beams all run toward the one vanishing
// point and stay whole pixels.

import { MASTER, ROOM } from '../../web/src/pixel/layout.ts';
import { EAGLE_11, URN } from './glyphs.mjs';
import { Raster } from './raster.mjs';

const OX = MASTER.originX;
const OY = MASTER.originY;
const VX = OX + ROOM.vanish.x;
const VY = OY + ROOM.vanish.y;
const HALF = ROOM.backHalf;
const TOP = OY + ROOM.ceiling;
const FLOOR = OY + ROOM.floor;

/** Back-wall panel pattern at (u along the wall, v down it), shared by all three walls. */
function panel(u, v, dark) {
  const base = dark ? 'K' : 'w';
  const recess = dark ? 'k' : 'K';
  const lit = dark ? 'w' : 'W';
  // Cornice under the ceiling.
  if (v < TOP + 2) return 'g';
  if (v < TOP + 3) return 'y';
  if (v < TOP + 5) return dark ? 'G' : 'G';
  if (v < TOP + 6) return 'g';
  // Frieze rail, chair rail, skirting.
  const rail = OY + ROOM.rail;
  if (v >= rail && v < rail + 1) return 'y';
  if (v >= rail + 1 && v < rail + 3) return 'G';
  if (v >= rail + 3 && v < rail + 4) return 'g';
  if (v >= FLOOR - 6 && v < FLOOR - 5) return 'g';
  if (v >= FLOOR - 5) return dark ? 'k' : 'K';
  // Panels: a stile every 31, a lower bay below the rail and an upper above.
  const bay = ((u % 31) + 31) % 31;
  if (bay < 3) return bay === 0 ? recess : base;
  const upper = v < rail;
  const y0 = upper ? TOP + 10 : rail + 7;
  const y1 = upper ? rail - 5 : FLOOR - 10;
  if (v < y0 || v > y1 || bay < 6 || bay > 28) return base;
  // The recessed panel: shadow along its top and left, light along its bottom and right.
  if (v === y0 || bay === 6) return recess;
  if (v === y1 || bay === 28) return lit;
  return base;
}

/** How far the back wall stands from the eye, in the floor's units (one unit is one art pixel at the back wall). */
const DEPTH = 160;
/** A floor tile's side, and a ceiling bay's. */
const TILE = 16;
const BAY = 31;

/** Distance from the eye, as a fraction of the back wall's, of a floor pixel's row. */
const floorZ = (y) => (FLOOR - VY) / (y - VY);
const ceilingZ = (y) => (VY - TOP) / (VY - y);
const floorCell = (x, y) => {
  const z = floorZ(y);
  return [Math.floor(((x - VX) * z + 1000) / TILE), Math.floor((z * DEPTH) / TILE)];
};

/** A cheap fixed hash, for grain that is the same every build. */
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/** Vertical grain in a panel's face: a few long streaks, placed by hash. */
function grain(u, v, key, streak) {
  const h = hash(u, 7);
  if (h % 9 !== 0) return key;
  const run = 18 + (h >>> 8) % 30;
  const start = (h >>> 16) % 90;
  return (v + 900 - start) % 90 < run ? streak : key;
}

export function drawScene() {
  const r = new Raster(MASTER.width, MASTER.height);

  for (let y = 0; y < MASTER.height; y++) {
    for (let x = 0; x < MASTER.width; x++) {
      const dx = x - VX;
      const ax = Math.abs(dx);
      const top = ax <= HALF ? TOP : VY - (VY - TOP) * (ax / HALF);
      const bottom = ax <= HALF ? FLOOR : VY + (FLOOR - VY) * (ax / HALF);

      if (y < top) {
        // The ceiling: beams running back to the wall, crossed by others.
        const z = ceilingZ(y);
        const beam = (((dx * z) % BAY) + BAY) % BAY;
        const cross = ((z * DEPTH) % BAY) / BAY;
        let key = 'k';
        if (beam < 4) key = beam < 1 ? 'w' : 'K';
        if (cross < 4 / BAY) key = cross < 1 / BAY ? 'w' : 'K';
        r.set(x, y, key);
      } else if (y < bottom) {
        if (ax <= HALF) {
          const u = x - (VX - HALF);
          let key = panel(u, y, false);
          if (key === 'w') key = grain(u, y, key, 'W');
          r.set(x, y, key);
        } else {
          // A side wall: project back to the corner's plane; u runs from the
          // corner toward the reader, foreshortened.
          const z = HALF / ax;
          const v = Math.floor(VY + (y - VY) * z);
          const u = Math.floor((1 - z) * DEPTH);
          let key = panel(u, v, true);
          if (key === 'K') key = grain(u, v, key, 'w');
          r.set(x, y, key);
        }
      } else {
        // The floor: dark polished stone in a checker, a gold joint wherever a
        // tile ends (one pixel, however near), and a lit edge on the pale tiles.
        const [col, row] = floorCell(x, y);
        const [colLeft] = floorCell(x - 1, y);
        const [colUp, rowUp] = y - 1 >= bottom ? floorCell(x, y - 1) : [col, row];
        let key = (col + row) % 2 ? 's' : 'K';
        if (col !== colLeft || col !== colUp || row !== rowUp) key = 'g';
        else if (key === 's') {
          const [, rowUp2] = floorCell(x, y - 2);
          const [colLeft2] = floorCell(x - 2, y);
          if (rowUp2 !== row || colLeft2 !== col) key = 'S';
        }
        r.set(x, y, key);
      }
    }
  }

  drawRug(r);
  drawPillar(r, VX - HALF);
  drawPillar(r, VX + HALF);
  drawBanner(r, OX - 111);
  drawBanner(r, OX + 95);
  // Ferns in gold urns at the pillars' feet.
  drawPlant(r, VX - HALF - 20, FLOOR + 12);
  drawPlant(r, VX + HALF + 20, FLOOR + 12);
  return r;
}

/** The runner: navy, bordered in gold, from the back wall to the reader. */
function drawRug(r) {
  for (let y = FLOOR + 2; y < MASTER.height; y++) {
    const z = floorZ(y);
    for (let x = 0; x < MASTER.width; x++) {
      const fx = (x - VX) * z;
      const af = Math.abs(fx);
      if (af > 17) continue;
      const edge = 17 - af;
      let key = 'N';
      if (edge < 1.2) key = 'G';
      else if (edge < 2.4) key = 'y';
      else if (edge < 3.4) key = 'n';
      else if (edge < 4.2) key = 'G';
      else {
        // A gold lozenge down the middle, one per tile's depth.
        const d = ((z * DEPTH) / TILE) % 1;
        const lozenge = Math.abs(d - 0.5) * 16 + af;
        if (lozenge < 5) key = lozenge < 2.5 ? 'Y' : 'y';
        else if (lozenge < 6.4) key = 'G';
        else if (af < 1.2) key = 'v';
      }
      r.set(x, y, key);
    }
  }
  // The fringe at the far end.
  for (let x = VX - 17; x <= VX + 17; x++) r.set(x, FLOOR + 1, x % 2 ? 'Y' : 'G');
}

/** A fluted stone pillar with a gold capital and base, at the back wall's corner, lit from the left. */
const SHAFT = 'ktLtSsStSsSsssk';
function drawPillar(r, cx) {
  const w = SHAFT.length;
  const x0 = cx - (w >> 1);
  for (let y = TOP + 9; y < FLOOR - 7; y++) [...SHAFT].forEach((key, i) => r.set(x0 + i, y, key === 'L' ? 't' : key));
  // A highlight down the lit flute, broken where the light catches it most.
  for (let y = TOP + 12; y < FLOOR - 10; y++) if ((y >> 3) % 3 !== 2) r.set(x0 + 2, y, 'S');
  // Capital: abacus, echinus, necking.
  r.rect(x0 - 3, TOP + 2, w + 6, 2, 'G');
  r.hline(x0 - 3, x0 + w + 2, TOP + 2, 'Y');
  r.hline(x0 - 3, x0 + w + 2, TOP + 3, 'g');
  r.rect(x0 - 2, TOP + 4, w + 4, 3, 'y');
  r.hline(x0 - 2, x0 + w + 1, TOP + 4, 'Y');
  r.hline(x0 - 2, x0 + w + 1, TOP + 6, 'G');
  r.set(x0 - 2, TOP + 5, 'L');
  r.rect(x0, TOP + 7, w, 2, 'G');
  r.hline(x0, x0 + w - 1, TOP + 8, 'g');
  // Base: torus and plinth.
  r.rect(x0, FLOOR - 7, w, 2, 'y');
  r.hline(x0, x0 + w - 1, FLOOR - 7, 'Y');
  r.rect(x0 - 2, FLOOR - 5, w + 4, 2, 'G');
  r.hline(x0 - 2, x0 + w + 1, FLOOR - 5, 'y');
  r.rect(x0 - 3, FLOOR - 3, w + 6, 3, 'g');
  r.hline(x0 - 3, x0 + w + 2, FLOOR - 3, 'G');
}

/**
 * A fern in a gold urn, its base at (cx, baseY): fronds arch out of the soil
 * and droop, with leaflets along each, paler on the side the light falls on.
 */
function drawPlant(r, cx, baseY) {
  const urnTop = baseY - URN.length;
  const fronds = [
    [-78, 13, 0.55], [-52, 17, 0.5], [-28, 20, 0.35], [-8, 21, 0.18],
    [12, 20, 0.25], [34, 19, 0.4], [58, 16, 0.5], [82, 12, 0.55],
  ];
  for (const [deg, len, droop] of fronds) {
    const th = (deg * Math.PI) / 180;
    const side = Math.sign(deg) || 1;
    let px = cx;
    let py = urnTop;
    for (let i = 1; i <= len; i++) {
      const t = i / len;
      const nx = Math.round(cx + Math.sin(th) * i + side * droop * t * t * 4);
      const ny = Math.round(urnTop - Math.cos(th) * i + droop * t * t * len);
      r.line(px, py, nx, ny, i < 3 ? 'f' : 'F');
      // Leaflets every other step past the stalk: up and out on the upper
      // side, down and out below.
      if (i > 3 && i % 2 === 0 && i < len) {
        const lead = t > 0.8 ? 1 : 2;
        r.line(nx, ny, nx - side * 1, ny - lead, side < 0 ? 'H' : 'h');
        r.line(nx, ny, nx + side * lead, ny - 1 + (droop > 0.3 ? 1 : 0), side < 0 ? 'h' : 'F');
      }
      px = nx;
      py = ny;
    }
    r.set(px, py, 'H');
  }
  r.draw(URN, cx - 8, urnTop);
}

/** A Dominion banner on a gold rod, the eagle in gold, a swallowtail and fringe. */
function drawBanner(r, x0) {
  const w = 16;
  const y0 = TOP + 7;
  const h = 40;
  // Rod and finials.
  r.hline(x0 - 2, x0 + w + 1, y0 - 1, 'y');
  r.hline(x0 - 2, x0 + w + 1, y0, 'G');
  r.set(x0 - 3, y0 - 1, 'Y');
  r.set(x0 + w + 2, y0 - 1, 'Y');
  for (let y = y0 + 1; y < y0 + h; y++) {
    const tail = y - (y0 + h - 7);
    for (let x = x0; x < x0 + w; x++) {
      const i = x - x0;
      // The swallowtail: a V cut out of the hem.
      if (tail > 0 && Math.abs(i - (w - 1) / 2) < tail) continue;
      let key = 'N';
      if (i === 0 || i === w - 1) key = 'G';
      else if (i === 1) key = 'v';
      else if (i === w - 2) key = 'n';
      r.set(x, y, key);
    }
  }
  // Fringe along the cut.
  for (let i = 0; i < w; i++) {
    const d = Math.abs(i - (w - 1) / 2);
    const tailY = y0 + h - 7 + Math.ceil(d) + (d < 0.6 ? 0 : 0);
    const y = Math.min(y0 + h, tailY);
    if (d >= 0.5) r.set(x0 + i, y, i % 2 ? 'Y' : 'y');
  }
  r.draw(EAGLE_11, x0 + 3, y0 + 8);
  // A gold band above the eagle.
  r.hline(x0 + 2, x0 + w - 3, y0 + 4, 'G');
}

// The pieces every page outside the room is built from: sheets, frames,
// buttons, fields and tiles, drawn on the room's palette and grid so a volume,
// a takeover or the Gallery reads as the same place as the room.
//
// Nine-slices keep their edges the same all along their length, so CSS can
// stretch an edge to any length without smearing a pixel; the ornament lives
// in the corners. Tiles repeat seamlessly. Light falls from the upper left,
// as in the room.

import { EAGLE_11 } from './glyphs.mjs';
import { Raster } from './raster.mjs';

/** The same fixed hash as the room's, for specks that land the same every build. */
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

function fromRows(rows) {
  const r = new Raster(rows[0].length, rows.length);
  r.draw(rows, 0, 0);
  return r;
}

/** A sheet of parchment: a darker deckle, gold brackets in the corners. Slice 6, no fill. */
function sheet() {
  const N = 16;
  const r = new Raster(N, N);
  r.rect(0, 0, N, N, 'p');
  r.rect(0, 0, N, 1, 'q');
  r.rect(0, 0, 1, N, 'q');
  r.rect(0, N - 1, N, 1, 'q');
  r.rect(N - 1, 0, 1, N, 'q');
  r.hline(1, N - 2, 1, 'P');
  r.vline(1, 1, N - 2, 'P');
  r.hline(1, N - 2, N - 2, 'P');
  r.vline(N - 2, 1, N - 2, 'P');
  for (const [x, y] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]) r.set(x, y, null);
  // The brackets: lit where the light reaches them, in shade where it does not.
  r.hline(2, 5, 2, 'Y');
  r.vline(2, 2, 5, 'Y');
  r.set(5, 2, 'y');
  r.set(2, 5, 'y');
  r.hline(N - 6, N - 3, 2, 'y');
  r.vline(N - 3, 2, 5, 'G');
  r.set(N - 6, 2, 'Y');
  r.vline(2, N - 6, N - 3, 'y');
  r.hline(2, 5, N - 3, 'G');
  r.set(2, N - 6, 'Y');
  r.hline(N - 6, N - 3, N - 3, 'G');
  r.vline(N - 3, N - 6, N - 3, 'G');
  r.set(N - 6, N - 3, 'y');
  r.set(N - 3, N - 6, 'y');
  return r;
}

/** Parchment's face, to tile: specks of a darker fibre here and there. */
function parchmentTile() {
  const N = 16;
  const r = new Raster(N, N);
  r.rect(0, 0, N, N, 'p');
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const h = hash(x + 31, y + 7) % 97;
      if (h < 5) r.set(x, y, 'P');
      else if (h === 5) r.set(x, y, 'q');
    }
  return r;
}

/** Dark panelling, to tile behind a page: upright boards, a lit edge, a seam, grain. */
function wallTile() {
  const W = 24;
  const H = 24;
  const r = new Raster(W, H);
  for (let b = 0; b < 3; b++) {
    const x0 = b * 8;
    r.rect(x0, 0, 8, H, 'w');
    r.vline(x0, 0, H - 1, 'K');
    r.vline(x0 + 1, 0, H - 1, 'W');
    // Long streaks of grain down each board.
    for (let i = 2; i < 8; i++) {
      const h = hash(b * 8 + i, 3);
      if (h % 3) continue;
      const start = h % H;
      const len = 4 + (h >> 4) % 9;
      for (let j = 0; j < len; j++) r.set(x0 + i, (start + j) % H, 'K');
    }
  }
  return r;
}

/** Planks laid crosswise, to tile behind the notices: staggered joints, nails at the joints. */
function plankTile() {
  const W = 32;
  const H = 16;
  const r = new Raster(W, H);
  for (let p = 0; p < 2; p++) {
    const y0 = p * 8;
    r.rect(0, y0, W, 8, 'o');
    r.hline(0, W - 1, y0, 'O');
    r.hline(0, W - 1, y0 + 7, 'w');
    for (let i = 0; i < 10; i++) {
      const h = hash(i, p + 11);
      const y = y0 + 2 + (h % 4);
      const x = (h >> 3) % W;
      const len = 3 + ((h >> 8) % 7);
      for (let j = 0; j < len; j++) r.set((x + j) % W, y, 'W');
    }
    const joint = p === 0 ? 0 : 16;
    r.vline(joint, y0 + 1, y0 + 6, 'w');
    r.set(joint + 2, y0 + 2, 'K');
    r.set(joint + 2, y0 + 5, 'K');
    r.set((joint + W - 3) % W, y0 + 2, 'K');
    r.set((joint + W - 3) % W, y0 + 5, 'K');
  }
  return r;
}

/** The hanging the chain of command is woven on: a dark weave, a gold knot at each crossing. */
const CLOTH = [
  'kKkkkKkk',
  'KKKKKKKK',
  'kKkkkKkk',
  'kKkkkKkk',
  'kKkkkKkk',
  'KKKKKgKK',
  'kKkkkKkk',
  'kKkkkKkk',
];

/** A gold frame for a picture: Ancarion's bevel, a black lip, rosettes in the corners. Slice 7, no fill. */
function frame() {
  const N = 18;
  const r = new Raster(N, N);
  const lit = ['g', 'G', 'y', 'Y', 'y', 'g', 'k'];
  const shade = ['g', 'g', 'G', 'y', 'G', 'g', 'k'];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const [dl, dt, dr, db] = [x, y, N - 1 - x, N - 1 - y];
      const d = Math.min(dl, dt, dr, db);
      if (d >= lit.length) continue;
      let isLit = dt === d || dl === d;
      if (dl === d && db === d) isLit = false;
      r.set(x, y, (isLit ? lit : shade)[d]);
    }
  for (const [x, y] of [[2, 2], [N - 5, 2], [2, N - 5], [N - 5, N - 5]]) {
    r.set(x + 1, y, 'Y');
    r.set(x, y + 1, 'Y');
    r.set(x + 1, y + 1, 'L');
    r.set(x + 2, y + 1, 'G');
    r.set(x + 1, y + 2, 'G');
  }
  return r;
}

/** A recessed box on parchment, for the figures a page keeps. Slice 2, filled. */
const INSET = [
  '.qqqqqq.',
  'qqPPPPPq',
  'qPPPPPPq',
  'qPPPPPPq',
  'qPPPPPPq',
  'qPPPPPPq',
  'qPPPPPpq',
  '.qqqqqq.',
];

/** A field to write in: cream, its top and left in shadow. Slice 2, filled. */
const FIELD = [
  '.qqqqqq.',
  'qPPPPPPq',
  'qPLLLLLq',
  'qPLLLLLq',
  'qPLLLLLq',
  'qPLLLLLq',
  'qPLLLLLq',
  '.qqqqqq.',
];

/** Brass, raised and pressed. Slice 2, filled. */
const BUTTON = [
  '.gggggg.',
  'gYYYYYyg',
  'gYyyyyGg',
  'gYyyyyGg',
  'gYyyyyGg',
  'gYyyyyGg',
  'gyGGGGGg',
  '.gggggg.',
];
const BUTTON_DOWN = [
  '.gggggg.',
  'gGGGGGGg',
  'gGyyyyyg',
  'gGyyyyyg',
  'gGyyyyyg',
  'gGyyyyyg',
  'gGyyyyYg',
  '.gggggg.',
];

/** A scrap for a notice: plainer than a sheet, no gold, shaded on its right and foot. Slice 3, no fill. */
const SCRAP = [
  '.qqqqqqqq.',
  'qppppppppq',
  'qppppppppq',
  'qpppppppPq',
  'qpppppppPq',
  'qpppppppPq',
  'qpppppppPq',
  'qppppppppq',
  'qPPPPPPPPq',
  '.qqqqqqqq.',
];

/** The seal that closes a takeover: a gold boss, its cross cut in black. */
const SEAL = [
  '....ggggg....',
  '..ggYYYYyGg..',
  '.gYYYyyyyyGg.',
  '.gYkkyyykkGg.',
  'gYyykkykkyyGg',
  'gYyyykkkyyyGg',
  'gYyyyykyyyyGg',
  'gYyyykkkyyyGg',
  'gYyykkGkkyGGg',
  '.gykkGGGkkGg.',
  '.gGyGGGGGGgg.',
  '..ggGGGGGgg..',
  '....ggggg....',
];

/** The ornament at the middle of a page's gilt rule. */
const FLEURON = [
  '.......Y.......',
  '......YyG......',
  'yYy..YyLyG..yGy',
  'gGyYYyLLLyGGyGg',
  'yGy..GyLyg..yGy',
  '......GyG......',
  '.......G.......',
];

/** A brass tack for the board, and the crimson wax pin from the room's note. */
const TACK = ['.yY.', 'yLYG', 'YYGg', '.Gg.'];
const WAX = ['.Rx.', 'RxxR', 'rRRr', '.rr.'];

/** The Dominion's seal pressed in crimson wax at the foot of a page: a lumpy disc, the eagle in gold. */
function stamp() {
  const N = 24;
  const r = new Raster(N, N);
  r.ellipse(1, 1, N - 2, N - 2, (x, y, dx, dy) => {
    const d = dx * dx + dy * dy;
    if (d > 0.82) return dx + dy < 0 ? 'x' : 'r';
    return dx + dy < -0.9 ? 'x' : 'R';
  });
  // The wax runs a little past the circle in three places.
  for (const [x, y] of [[3, 17], [19, 4], [16, 21]]) {
    r.set(x, y, 'r');
    r.set(x + 1, y, 'R');
  }
  // A ring pressed into the wax, and the eagle inside it.
  r.ellipse(4, 4, N - 8, N - 8, (x, y, dx, dy) => (dx * dx + dy * dy > 0.8 ? (dx + dy < 0 ? 'r' : 'x') : 'R'));
  r.draw(EAGLE_11, 7, 5, { y: 'y', Y: 'Y', G: 'G' });
  return r;
}

export function drawUi() {
  return [
    ['ui-sheet', sheet(), { slice: 6 }],
    ['ui-parchment', parchmentTile(), { tile: true }],
    ['ui-wall', wallTile(), { tile: true }],
    ['ui-planks', plankTile(), { tile: true }],
    ['ui-cloth', fromRows(CLOTH), { tile: true }],
    ['ui-frame', frame(), { slice: 7 }],
    ['ui-inset', fromRows(INSET), { slice: 2 }],
    ['ui-field', fromRows(FIELD), { slice: 2 }],
    ['ui-button', fromRows(BUTTON), { slice: 2 }],
    ['ui-button-down', fromRows(BUTTON_DOWN), { slice: 2 }],
    ['ui-scrap', fromRows(SCRAP), { slice: 3 }],
    ['ui-seal', fromRows(SEAL)],
    ['ui-fleuron', fromRows(FLEURON)],
    ['ui-tack', fromRows(TACK)],
    ['ui-wax', fromRows(WAX)],
    ['ui-stamp', stamp()],
  ];
}

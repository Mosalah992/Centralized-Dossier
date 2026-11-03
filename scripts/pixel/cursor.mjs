// The archive's cursor: a Thalmor gauntlet pointing one finger up, after the
// pointing gauntlet of the icon set (web/src/pixel/icons/sprites/pin-notice.ts),
// drawn on the room's palette. Black plate with stone highlights, a gold
// cuff, and a gold rim all round so it reads on the dark room and on
// parchment alike: lit along its top and left, in shade along its bottom and
// right. The fingertip is the hotspot.

import { Raster } from './raster.mjs';

/** 20 by 20; 'y' is the rim, shaded by drawCursor. */
const GAUNTLET = [
  '....yyy.............',
  '...yKtKy............',
  '...yKtKy............',
  '...ykkky............',
  '...yKtKyyyy.........',
  '...yKtKkKtKyyy......',
  '...yKtKkKtKkKtyyy...',
  '...yKtKkKtKkKtkKty..',
  '...yKSKkKSKkKSkKSy..',
  '.yyyKKKKKKKKKKKKKy..',
  'yKtkKKKKKKKKKKKKKy..',
  'yKtKkKKKKKKKKKKKKy..',
  '.yKtKkKKKKKKKKKKKy..',
  '..yKKKkKKKKKKKKKKy..',
  '...yKKKKKKKKKKKKy...',
  '..yYYYYYYYYYYYYYy...',
  '..yKGKKGKKGKKGKKy...',
  '..yKKKKKKKKKKKKKy...',
  '..yGGGGGGGGGGGGGy...',
  '..yyyyyyyyyyyyyyy...',
];

/** The fingertip, in art pixels: where the click lands. */
export const CURSOR_HOTSPOT = { x: 5, y: 0 };

export function drawCursor() {
  const r = new Raster(GAUNTLET[0].length, GAUNTLET.length);
  r.draw(GAUNTLET, 0, 0);
  const empty = (x, y) => r.get(x, y) === null;
  for (let y = 0; y < r.height; y++)
    for (let x = 0; x < r.width; x++) {
      if (r.get(x, y) !== 'y') continue;
      if (empty(x, y - 1) || empty(x - 1, y)) r.set(x, y, 'Y');
      else if (empty(x, y + 1) || empty(x + 1, y)) r.set(x, y, 'G');
    }
  return r;
}

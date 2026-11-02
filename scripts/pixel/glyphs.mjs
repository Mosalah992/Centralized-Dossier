// Small drawings placed pixel by pixel: the Dominion's eagle, leaves, the
// plants' urn. Rows of palette keys (web/src/pixel/palette.ts); '.' is empty.
//
// The eagle was traced from web/src/assets/penal/eagle.webp onto these grids
// and then cleaned by hand: raised wings round an oval, the head turned to the
// left in the gap between them, the tail beneath.

/** The eagle, 11 x 14: banners and small crests. 'Y' catches the light, 'G' is in shade. */
export const EAGLE_11 = [
  '...Y...Y...',
  '..YYy.YYy..',
  '.YYyy.Yyyy.',
  '.Yyyy.Yyyy.',
  '.Yyy...yyG.',
  '.Yyy.y.yyG.',
  '.Yy.YyG.yG.',
  '.Yy.yy..yG.',
  '.YyyyyyyyG.',
  '.yyyyyyyyG.',
  '..yyyyyyG..',
  '....yyG....',
  '...yyyyG...',
  '....yGG....',
];

/** The eagle, 15 x 19: the frame's crest and the larger emblems. */
export const EAGLE_15 = [
  '.....Y...Y.....',
  '....YY...YY....',
  '...YYy...Yyy...',
  '...Yyy...yyy...',
  '..YYyy...yyyG..',
  '..Yyyy...yyyG..',
  '.YYyyy...yyyyG.',
  '.Yyyyy...yyyyG.',
  '.Yyyy..Y..yyyG.',
  '.Yyyy.YyG.yyyG.',
  '.Yyyyy.yyyyyyG.',
  '.YyyyyyyyyyyyG.',
  '..yyyyyyyyyyG..',
  '..yyyyyyyyyyG..',
  '...yyyyyyyyG...',
  '.....yyyyG.....',
  '......yyG......',
  '.....yyyyG.....',
  '......yGG......',
];

/** A gold urn for the plants, 16 x 12, a navy band round its belly. */
export const URN = [
  '.gGGGGGGGGGGGGg.',
  'gYLYYYYYYYYYYYYG',
  '.GyyyyyyyyyyyyG.',
  '..yYyyyyyyyyyG..',
  '..GnNnNnNnNnNG..',
  '...yYyyyyyyyG...',
  '...GyyyyyyyyG...',
  '....GYyyyyyG....',
  '.....GyyyyG.....',
  '......gyyg......',
  '.....gGyyGg.....',
  '....gggggggg....',
];

/** A gold leaf for the boughs, pointing up-right; drawn at any of four turns. */
export const LEAF = ['..Y', '.YY', 'yYG', 'yG.', 'G..'];
export const LEAF_FLAT = ['.YY.', 'YyyG', '.GG.'];

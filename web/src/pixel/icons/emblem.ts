// The Aldmeri Dominion eagle, traced from web/src/assets/penal/eagle.webp and
// brought down to eleven pixels wide: the two wings raised to their tips, the
// head between them looking left, the lower feathers and the fanned tail.
// Every icon that bears the emblem carries exactly these pixels, lit from the
// upper left like everything else, and always on a dark ground (navy, crimson
// wax) so the gold reads; test/pixel-icons.test.ts holds every copy to it.

export const EAGLE = [
  '...g...g...',
  '..gG...gG..',
  '.gGG...gGG.',
  'gGGG...GGGG',
  '.GGG...GGG.',
  'GGG..g..GGG',
  '.GG.gG..GG.',
  'GGGG.GGGGGG',
  '.GGGGGGGGG.',
  '..GGGGGGG..',
  '...G.G.G...',
  '....GGG....',
  '...G.G.G...',
] as const;

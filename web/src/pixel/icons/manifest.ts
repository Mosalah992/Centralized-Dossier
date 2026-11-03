// The icon set, in the order of the team's reference sheet: five rows of
// seven, read left to right. The built sheet (sheet.png) lays the icons out in
// this same order, which is all PixelIcon needs to find one.

export const ICON_SIZE = 32;
export const SHEET_COLUMNS = 7;

export const ICON_NAMES = [
  // Row 1
  'pin-notice',
  'wax-stamp',
  'crystal-ball',
  'checklist',
  'quill-inkwell',
  'quill-writing',
  'lantern',
  // Row 2
  'magnifier',
  'goblet',
  'book-emblem',
  'books-emblem',
  'scroll-bundle',
  'book-back',
  'book-forward',
  // Row 3
  'chest-hand',
  'coin-pouch',
  'file-letter',
  'scroll-rack',
  'key-emblem',
  'letter-tray',
  'scroll-lock',
  // Row 4
  'exit-door',
  'door',
  'quills-inkpot',
  'hourglass',
  'ship-emblem',
  'map-compass',
  'globe',
  // Row 5
  'scales',
  'coin-sacks',
  'banner-assembly',
  'handshake',
  'scroll-emblem',
  'candle-books',
  'scroll-compass',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

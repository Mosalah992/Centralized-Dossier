// The shape of one hand-drawn icon. Each sprite file under sprites/ is
// nothing but data in this shape, so scripts/build-pixel-icons.mjs can load
// them straight into Node (type imports are erased) and the grid a reader
// sees in the file is exactly the picture that gets built.

export type PixelSprite = {
  /** Matches the file name and the entry in ICON_NAMES. */
  name: string;
  /**
   * Where the Dominion eagle (emblem.ts) sits, top-left corner, for the
   * icons that bear it. The test checks the eagle there is pixel-identical.
   */
  emblem: { x: number; y: number } | null;
  /** 32 rows of 32 letters from PIXEL_KEY, '.' for an empty pixel. */
  rows: readonly string[];
};

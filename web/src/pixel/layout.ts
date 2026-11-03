// Where everything stands in the pixel room, in art pixels.
//
// The room is composed in a core 180 art pixels tall. x is measured from the
// centre of the back wall (negative to the left), y down from the core's top.
// The site scales the art by the largest whole number of device pixels that
// fits (web/src/room/pixel-scale.ts): at least 420 art pixels across and all
// 180 down are always in view, and a wider or taller window sees more of the
// walls, ceiling and floor, which the master background is drawn wide enough
// to fill (scripts/pixel/scene.mjs).
//
// Read by the site and, through Node's type stripping, by the build script:
// keep this to plain, erasable syntax.

export const CORE = { width: 420, height: 180 } as const;

/** The master background: wider and taller than any window shows. */
export const MASTER = { width: 880, height: 300, originX: 440, originY: 60 } as const;

/** The room's one-point perspective. */
export const ROOM = {
  /** The back wall's half width: its corners, where the pillars stand. */
  backHalf: 124,
  /** The top of the back wall, under its cornice. */
  ceiling: -2,
  /** Where the back wall meets the floor. */
  floor: 140,
  /** The vanishing point, at the eye's height: low, as from a reader standing in the room. */
  vanish: { x: 0, y: 110 },
  /** The chair rail across the back wall. */
  rail: 104,
} as const;

export interface Place {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The furniture and fittings, each its own sprite (scripts/pixel/objects.mjs). */
export const PLACES = {
  board: { x: -58, y: 18, w: 116, h: 30 },
  portrait: { x: -32, y: 50, w: 64, h: 90 },
  archL: { x: -104, y: 48, w: 48, h: 92 },
  archR: { x: 56, y: 48, w: 48, h: 92 },
  bookshelf: { x: -206, y: 54, w: 56, h: 106 },
  cabinet: { x: 150, y: 70, w: 56, h: 90 },
  globe: { x: 163, y: 36, w: 30, h: 34 },
  scribe: { x: -38, y: 136, w: 76, h: 42 },
  candleL: { x: -56, y: 140, w: 12, h: 38 },
  candleR: { x: 44, y: 140, w: 12, h: 38 },
  sconceL: { x: -116, y: 66, w: 10, h: 18 },
  sconceR: { x: 106, y: 66, w: 10, h: 18 },
  boughL: { x: -232, y: -8, w: 96, h: 44 },
  boughR: { x: 136, y: -8, w: 96, h: 44 },
} as const satisfies Record<string, Place>;

/** Panels laid over the art in HTML (text stays live and readable). */
export const PANELS = {
  title: { x: -110, y: 0, w: 220, h: 15 },
  note: { x: -210, y: 4, w: 64, h: 46 },
  clock: { x: 148, y: 2, w: 62, h: 32 },
} as const satisfies Record<string, Place>;

/**
 * Within Ancarion's place: the door (his pixel frame, which swings open onto
 * the Solar), the opening where his painting shows, the plate hung beneath
 * the frame, and the slot in the plate where the word is spoken.
 */
export const PORTRAIT = {
  door: { x: 0, y: 0, w: 64, h: 77 },
  opening: { x: 6, y: 11, w: 52, h: 60 },
  plateArt: { x: 0, y: 77, w: 64, h: 13 },
  plate: { x: 13, y: 81, w: 38, h: 6 },
} as const satisfies Record<string, Place>;

/**
 * The Solar, behind Ancarion: the same hall (the room's scene), furnished for
 * High Command. The war table stands in the middle of the floor with the
 * realm map laid on its top; the notes are pinned on the left wall; the Clerk
 * Table and Canonreeve's Desk stand at the foot of the room; the Dominion's
 * hanging is on the back wall between two windows.
 */
export const SOLAR = {
  hanging: { x: -30, y: 20, w: 60, h: 74 },
  windowL: { x: -104, y: 18, w: 34, h: 76 },
  windowR: { x: 70, y: 18, w: 34, h: 76 },
  table: { x: -60, y: 80, w: 120, h: 96 },
  clerk: { x: -176, y: 124, w: 80, h: 50 },
  desk: { x: 96, y: 124, w: 80, h: 50 },
  notes: { x: -208, y: 4, w: 66, h: 96 },
} as const satisfies Record<string, Place>;

/** Within the war table: where the map lies on its top, at the map's own 4:3. */
export const WAR_TABLE = {
  map: { x: 16, y: 4, w: 88, h: 66 },
} as const satisfies Record<string, Place>;

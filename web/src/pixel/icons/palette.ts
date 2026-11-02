// The one palette every piece of pixel art in the Archives is drawn from:
// the icons here and the room the front page is being rebuilt as. The room
// keeps the same list, so a value changed here must change there too, and
// test/pixel-icons.test.ts pins every value so that cannot happen quietly.
//
// Each family runs dark to light. Nothing is ever blended between them:
// a pixel is one of these colours or it is empty.

export const PALETTE = {
  ink: ['#0b0806', '#1a1209'],
  wood: ['#2b1b10', '#4a2c16', '#6b4020', '#8c5a2e'],
  gold: ['#5a420c', '#8a6d1c', '#c9a227', '#e8cd7a', '#fff2c2'],
  navy: ['#10152a', '#1d2742', '#2f3d63'],
  parchment: ['#e6d6b0', '#cdb88c', '#a88c5c'],
  stone: ['#3b3a38', '#5f5b55', '#8a857c'],
  foliage: ['#2e3a16', '#55662a', '#8f9a3e', '#c9b85a'],
  blueMagic: ['#0f2a4a', '#1f5e9e', '#49a8e8', '#bfe8ff'],
  crimson: ['#4a0d10', '#7c1f24', '#b83a3a'],
  flame: ['#ffb347', '#ffe08a'],
} as const;

/** The empty pixel. */
export const CLEAR = '.';

// The letters the sprites are drawn in. Where a family has a pair of
// letters, the capital is the darker of the two.
export const PIXEL_KEY = {
  K: '#0b0806', // ink, deepest
  k: '#1a1209', // ink
  W: '#2b1b10', // wood, darkest
  w: '#4a2c16', // wood
  B: '#6b4020', // wood, brown
  b: '#8c5a2e', // wood, lit
  D: '#5a420c', // gold, darkest
  d: '#8a6d1c', // gold, dark
  G: '#c9a227', // gold
  g: '#e8cd7a', // gold, lit
  Y: '#fff2c2', // gold, glint
  N: '#10152a', // navy, darkest
  n: '#1d2742', // navy
  v: '#2f3d63', // navy, lit
  T: '#a88c5c', // parchment, shadow
  P: '#cdb88c', // parchment
  p: '#e6d6b0', // parchment, lit
  S: '#3b3a38', // stone, dark
  s: '#5f5b55', // stone
  a: '#8a857c', // stone, lit
  F: '#2e3a16', // foliage, darkest
  f: '#55662a', // foliage
  L: '#8f9a3e', // foliage, lit
  l: '#c9b85a', // foliage, dry
  M: '#0f2a4a', // blue magic, deep
  m: '#1f5e9e', // blue magic
  C: '#49a8e8', // blue magic, bright
  c: '#bfe8ff', // blue magic, glow
  R: '#4a0d10', // crimson, dark
  r: '#7c1f24', // crimson
  e: '#b83a3a', // crimson, lit
  O: '#ffb347', // flame
  o: '#ffe08a', // flame, core
} as const;

export type PixelKey = keyof typeof PIXEL_KEY;

// The Embassy's pixel palette: every pixel of the room's art is one of these
// (scripts/pixel/, test/pixel-art.test.ts). Black and gold first, the
// Dominion's navy, and blue magic used sparingly on the sconces and the
// arches. Ramps are hue-shifted: shadows lean cool, highlights warm, as a
// pixel artist would pick them rather than as a darkened copy of one colour.
//
// Keyed by single characters so sprites can be drawn as rows of letters.
// Shared word for word with the icon set (web/src/pixel/icons/palette.ts).
//
// Read by the tests and, through Node's type stripping, by the build scripts:
// keep this file to plain, erasable syntax.

export interface Swatch {
  key: string;
  name: string;
  hex: string;
}

export const PALETTE: readonly Swatch[] = [
  { key: 'k', name: 'ink-0', hex: '#0b0806' },
  { key: 'K', name: 'ink-1', hex: '#1a1209' },
  { key: 'w', name: 'wood-0', hex: '#2b1b10' },
  { key: 'W', name: 'wood-1', hex: '#4a2c16' },
  { key: 'o', name: 'wood-2', hex: '#6b4020' },
  { key: 'O', name: 'wood-3', hex: '#8c5a2e' },
  { key: 'g', name: 'gold-0', hex: '#5a420c' },
  { key: 'G', name: 'gold-1', hex: '#8a6d1c' },
  { key: 'y', name: 'gold-2', hex: '#c9a227' },
  { key: 'Y', name: 'gold-3', hex: '#e8cd7a' },
  { key: 'L', name: 'gold-4', hex: '#fff2c2' },
  { key: 'n', name: 'navy-0', hex: '#10152a' },
  { key: 'N', name: 'navy-1', hex: '#1d2742' },
  { key: 'v', name: 'navy-2', hex: '#2f3d63' },
  { key: 'p', name: 'parchment-0', hex: '#e6d6b0' },
  { key: 'P', name: 'parchment-1', hex: '#cdb88c' },
  { key: 'q', name: 'parchment-2', hex: '#a88c5c' },
  { key: 's', name: 'stone-0', hex: '#3b3a38' },
  { key: 'S', name: 'stone-1', hex: '#5f5b55' },
  { key: 't', name: 'stone-2', hex: '#8a857c' },
  { key: 'f', name: 'foliage-0', hex: '#2e3a16' },
  { key: 'F', name: 'foliage-1', hex: '#55662a' },
  { key: 'h', name: 'foliage-2', hex: '#8f9a3e' },
  { key: 'H', name: 'foliage-3', hex: '#c9b85a' },
  { key: 'b', name: 'blue-0', hex: '#0f2a4a' },
  { key: 'B', name: 'blue-1', hex: '#1f5e9e' },
  { key: 'c', name: 'blue-2', hex: '#49a8e8' },
  { key: 'C', name: 'blue-3', hex: '#bfe8ff' },
  { key: 'r', name: 'crimson-0', hex: '#4a0d10' },
  { key: 'R', name: 'crimson-1', hex: '#7c1f24' },
  { key: 'x', name: 'crimson-2', hex: '#b83a3a' },
  { key: 'e', name: 'flame-0', hex: '#ffb347' },
  { key: 'E', name: 'flame-1', hex: '#ffe08a' },
];

/** The colour a key stands for, as [r, g, b]. */
export function rgbOf(key: string): [number, number, number] {
  const swatch = PALETTE.find((s) => s.key === key);
  if (!swatch) throw new Error(`No colour "${key}" in the palette`);
  const n = Number.parseInt(swatch.hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

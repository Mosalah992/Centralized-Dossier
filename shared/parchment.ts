// Bringing the sheet's legend colours onto aged paper.
//
// The calendar parser reads its four colours from the legend at runtime and
// never hard-codes them, so that re-theming the calendar in the sheet re-themes
// the archive. That is worth keeping, and this module does not take it away —
// it is a transform, not a table. Whatever the sheet says still decides the
// result; it is only mapped into a range that can sit on parchment.
//
// WHAT WAS WRONG. The sheet's palette was audited against the page it is laid
// on (#efe6d2, hue 41, lightness 88%):
//
//   Ordinary day    #eae4d3  hue  44  sat 35%  L 87%   -2.4% vs the page
//   Morndas         #faf0d6  hue  43  sat 78%  L 91%   +9.9%
//   Festival        #e3ede8  hue 150  sat 22%  L 91%   +3.9%
//   Audit           #e7cb74  hue  45  sat 71%  L 68%  -23.4%
//
// Two of the four marks were LIGHTER than the paper they were printed on, which
// is the thing aged paper never does: ink, wash and foxing all sit darker than
// the ground, and something lighter reads as a bleached patch or a blown-out
// scan. Festivals were also the only cool hue on the page, 109 degrees away
// from everything else, so the twelve days a reader most wants to notice were
// the twelve that looked most wrong.
//
// HOW WEIGHT IS DECIDED. The obvious move — order the colours by how dark the
// sheet made them — does not work here: Morndas and Festival are both at 91%,
// so lightness carries no ranking between them. What separates them is that one
// is a saturated cream and the other is a washed-out green. So "how much ink is
// on this day" is read from BOTH how far the colour is from grey and how far
// its hue is from the paper's own. That recovers the order the calendar
// actually means — ordinary, then Morndas, then festival, then audit — from the
// sheet alone, without this file knowing any of those names.

import type { CalendarYear } from './types';

/** Hue of the page the calendar is printed on, and the lightness of it. */
const PAPER_HUE = 41;
const PAPER_LIGHTNESS = 87;

/** How far the darkest possible mark sinks below the paper. */
const INK_DEPTH = 32;

/**
 * How much of a colour's distance from the paper's hue it keeps. Kept high
 * enough that a second ink stays legibly a second ink — the festival green
 * survives as a faded verdigris rather than collapsing into the amber — and low
 * enough that everything reads as having aged on the same sheet.
 */
const HUE_RETENTION = 0.7;

/**
 * Even the faintest day keeps some warmth. A floor of zero renders the 299
 * ordinary days as a neutral grey, which is the colour of old newsprint rather
 * than old parchment.
 */
const SAT_FLOOR = 8;
const SAT_CEILING = 30;

/**
 * Bends the ink scale so faint marks stay near the paper and heavy ones still
 * sink. Straight-line mapping put every ordinary day six points below the page,
 * which turned the year into one dark panel instead of a grid drawn on it.
 */
const INK_CURVE = 1.15;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface Hsl { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl | null {
  const match = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const int = parseInt(match[1]!, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (!d) return { h: 0, s: 0, l: l * 100 };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = light - c / 2;
  return (
    '#' +
    rgb
      .map((v) => Math.round(clamp((v + m) * 255, 0, 255)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Shortest angular distance between two hues, 0..180. */
function hueDistance(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * How much ink a colour represents, 0 (bare paper) to 1 (the heaviest mark).
 *
 * Distance from grey and distance from the paper's hue both count, because
 * either one on its own gets the calendar's own ordering wrong: by chroma alone
 * the washed-out festival green ranks below an ordinary day, and by lightness
 * alone Morndas and the festivals are indistinguishable.
 */
export function inkWeight(hsl: Hsl): number {
  // Chroma, as HSL reckons it: saturation falls off toward black and white, so
  // a "saturated" near-white like #faf0d6 is correctly read as faint.
  const chroma = (hsl.s / 100) * (1 - Math.abs((2 * hsl.l) / 100 - 1));
  const offHue = hueDistance(hsl.h, PAPER_HUE) / 180;
  return clamp(chroma * 1.6 + offHue * 0.55, 0, 1);
}

/**
 * One legend colour, brought onto the paper. Unparseable input is returned
 * untouched: a colour this cannot read is one it has no business rewriting.
 */
export function parchmentise(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;

  const ink = inkWeight(hsl);

  // Hue keeps most of its distance from the paper, so a second ink stays one.
  const toward = hueDistance(hsl.h, PAPER_HUE);
  const signed = (((hsl.h - PAPER_HUE) % 360) + 360) % 360 <= 180 ? toward : -toward;

  return hslToHex({
    h: PAPER_HUE + signed * HUE_RETENTION,
    s: clamp(SAT_FLOOR + ink * 30, SAT_FLOOR, SAT_CEILING),
    // Every mark sits at or below the paper. Nothing is ever lighter than the
    // sheet it is printed on.
    l: PAPER_LIGHTNESS - Math.pow(ink, INK_CURVE) * INK_DEPTH,
  });
}

/**
 * A year whose legend has been brought onto parchment.
 *
 * Only the legend is rewritten, and that is enough: the day cells and the
 * legend swatches both take their colour by looking the day's kind up in this
 * one list, so there is a single place for the palette to live.
 */
export function withParchmentPalette(year: CalendarYear): CalendarYear {
  if (!year.legend.length) return year;
  return {
    ...year,
    legend: year.legend.map((entry) => ({ ...entry, color: parchmentise(entry.color) })),
  };
}

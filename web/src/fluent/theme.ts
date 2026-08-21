// Fluent UI's theme, dressed as the Embassy.
//
// Fluent v9 is here for its controls — a search box, a dropdown, a tooltip that
// answers the keyboard — and for nothing else. Its own palette is Microsoft 365
// blue on white, which would be a hole in the middle of a parchment page, so
// every colour it draws with is replaced here by one the archive already uses.
// Nothing in this file is decoration: a token left at Fluent's default is a
// token that will eventually show, usually in a state nobody thought to look at.
//
// The values are taken from web/src/styles/base.css and web/src/theme.ts rather
// than picked again by eye. Nothing ties the two together at build time, so if
// the palette moves there it has to be moved here by hand.

import { createDarkTheme, createLightTheme } from '@fluentui/react-components';
import type { BrandVariants, Theme } from '@fluentui/react-components';

import { BINDINGS } from '../theme';
import type { VolumeSlug } from '../../../shared/types';

/** The sixteen ramp positions Fluent asks for. Not exported by the package. */
type Brand = keyof BrandVariants;

/**
 * Fluent's brand ramp runs 10 (darkest) to 160 (lightest), and the light theme
 * paints its accent — button fills, selected rows, focus strokes — from 80.
 *
 * The archive's golds are one hue at different lightnesses: --gold is
 * hsl(46 68% 47%) and --gold-bright is hsl(45 70% 69%). So the ramp is walked
 * in lightness rather than picked sixteen times by hand, which also means a
 * volume bound in a colder gold gets a coherent ramp for free instead of
 * needing a table of its own.
 *
 * The curve is Fluent's shape: close steps through the midtones where the
 * accent actually lives, wider at the ends where almost nothing is drawn.
 */
const LIGHTNESS: Record<Brand, number> = {
  10: 6, 20: 11, 30: 16, 40: 21, 50: 26, 60: 32, 70: 39, 80: 47,
  90: 54, 100: 60, 110: 66, 120: 72, 130: 78, 140: 84, 150: 90, 160: 96,
};

/**
 * Chroma is pulled back at both ends of the ramp. A fully saturated gold at 6%
 * lightness is brown mud, and at 96% it is acid cream; both read as a mistake
 * beside real leaf. Fluent's own ramps taper the same way.
 */
const CHROMA: Record<Brand, number> = {
  10: 0.62, 20: 0.72, 30: 0.82, 40: 0.9, 50: 0.96, 60: 1, 70: 1, 80: 1,
  90: 1, 100: 1, 110: 0.98, 120: 0.94, 130: 0.88, 140: 0.8, 150: 0.7, 160: 0.58,
};

const BRAND_KEYS = Object.keys(LIGHTNESS).map(Number) as Brand[];

/** #rrggbb to hue, saturation and lightness, in the units CSS names them in. */
function toHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? (g - b) / delta + (g < b ? 6 : 0)
    : max === g ? (b - r) / delta + 2
    : (r - g) / delta + 4;

  return { h: h * 60, s: s * 100, l: l * 100 };
}

/**
 * Emitted as hex rather than as an hsl() string. These values are handed to
 * Fluent, which composes some of them into gradients and shadow stacks; a
 * colour function survives that in the browser but not in every place Fluent
 * concatenates strings, and a hex triplet cannot be got wrong.
 */
function toHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  const byte = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');

  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** A full Fluent brand ramp in the hue and chroma of one of the archive's golds. */
export function goldRamp(seed: string): BrandVariants {
  const { h, s } = toHsl(seed);
  const ramp = {} as BrandVariants;
  for (const key of BRAND_KEYS) {
    ramp[key] = toHex(h, s * CHROMA[key], LIGHTNESS[key]);
  }
  return ramp;
}

// ── The archive's own values ──────────────────────────────────────────────
// Named, so the overrides below read as the palette rather than as a wall of hex.

const PARCHMENT = '#efe6d2';
const PARCHMENT_2 = '#e4d8bf';
const PARCHMENT_3 = '#d9cbaf';
const INK = '#241d14';
const INK_SOFT = '#4d4232';
const NIGHT = '#14120f';
const NIGHT_2 = '#1c1915';
const STONE = '#cfc7b6';
const STONE_DIM = '#8d8778';
const GOLD_BRIGHT = '#e8cd7a';

/** The brown the registers are already ruled with, at a given opacity. */
const brown = (alpha: number) => `rgba(90, 70, 30, ${alpha})`;

/**
 * Shared by both themes.
 *
 * The archive is square-cornered and set in Garamond at 17px; Fluent is
 * round-cornered and set in Segoe at 14px, and a control keeping either default
 * announces itself as imported. The radius goes to 2px — the value base.css
 * already uses on :focus-visible — rather than to 0, because a hairline radius
 * survives a border better than a true corner does.
 *
 * Type is nudged to 15px rather than to the body's 17px: a control set at
 * running-text size reads as running text, and these are furniture. Per
 * invariant 5 the display face stays a tracked Roman capital, and it is applied
 * at the label rather than through fontFamilyBase — Fluent puts fontFamilyBase
 * on input values too, and Cinzel is not a face to type a search term in.
 */
const SHAPE = {
  borderRadiusNone: '0',
  borderRadiusSmall: '2px',
  borderRadiusMedium: '2px',
  borderRadiusLarge: '2px',
  borderRadiusXLarge: '3px',

  fontFamilyBase: "'EB Garamond', 'Iowan Old Style', Georgia, serif",
  fontSizeBase200: '13px',
  fontSizeBase300: '15px',
  fontSizeBase400: '16px',
} satisfies Partial<Theme>;

/**
 * The focus ring, reconciled to one — and made visible, which the archive's own
 * ring is not on this surface.
 *
 * base.css draws a single --gold-bright :focus-visible outline on everything.
 * That works in the hall, which is night. On parchment it is 1.26:1 against the
 * page, which is to say invisible: a keyboard reader inside an open volume
 * currently cannot see where they are. (That is a pre-existing bug in base.css,
 * not one Fluent introduces, and it is left for a separate decision — but this
 * theme is not going to reproduce it.)
 *
 * So the ring is set from the page it is drawn on rather than from one colour
 * everywhere: on parchment the outer stroke is ink, at 13.4:1, and at night it
 * is the archive's gold, at 10.7:1.
 *
 * Only one ring is drawn, and Fluent sees to that without help. Its focus
 * styles set `outline-style: none` on :focus-visible from a class-qualified
 * selector, which outweighs the bare `:focus-visible` rule in base.css — so the
 * global gold outline is already suppressed on anything Fluent manages. Do not
 * add a second suppression here; it would be dead, and it would also strip the
 * ring from the plain elements sharing the provider's subtree.
 *
 * colorStrokeFocus1 is the inner stroke, which only some components draw. It
 * takes the page's own colour so that where it does appear it reads as a gap
 * rather than as a second ring.
 */
const FOCUS_ON_PARCHMENT = {
  colorStrokeFocus1: PARCHMENT,
  colorStrokeFocus2: INK,
} satisfies Partial<Theme>;

const FOCUS_AT_NIGHT = {
  colorStrokeFocus1: NIGHT,
  colorStrokeFocus2: GOLD_BRIGHT,
} satisfies Partial<Theme>;

/**
 * Parchment: the theme for a volume's interior, which is a light page under
 * dark covers. See ledger.css, where .page is laid over --parchment and every
 * word on it is --ink.
 *
 * colorNeutralBackground1 stays parchment rather than going transparent — it is
 * the fill of the input fields themselves, and a transparent field on a
 * textured page gives the eye no edge to aim at. The provider's own root is
 * made transparent in Shell.tsx instead, which is the only place this token was
 * doing damage.
 */
export function archiveLight(seed: string): Theme {
  const ramp = goldRamp(seed);

  return {
    ...createLightTheme(ramp),
    ...SHAPE,
    ...FOCUS_ON_PARCHMENT,

    // Fluent paints brand-coloured *text* from ramp step 80, which on parchment
    // is 2.8:1 — below AA, and the archive's foils are muted enough that this is
    // not a near miss. Every token that ends up as a word on the page is dropped
    // two steps to 60, which measures 5.2:1. Steps 70 and 80 keep their jobs as
    // fills and strokes, where the requirement is 3:1 and they pass.
    colorBrandForeground1: ramp[60],
    colorBrandForeground2: ramp[60],
    colorBrandForeground2Hover: ramp[50],
    colorBrandForeground2Pressed: ramp[40],
    colorBrandForegroundLink: ramp[60],
    colorBrandForegroundLinkHover: ramp[50],
    colorBrandForegroundLinkPressed: ramp[40],
    colorBrandForegroundLinkSelected: ramp[60],
    colorCompoundBrandForeground1: ramp[60],
    colorCompoundBrandForeground1Hover: ramp[50],
    colorCompoundBrandForeground1Pressed: ramp[40],
    colorNeutralForeground2BrandHover: ramp[60],
    colorNeutralForeground2BrandPressed: ramp[50],
    colorNeutralForeground2BrandSelected: ramp[60],

    colorNeutralBackground1: PARCHMENT,
    colorNeutralBackground1Hover: PARCHMENT_2,
    colorNeutralBackground1Pressed: PARCHMENT_3,
    colorNeutralBackground1Selected: PARCHMENT_2,
    colorNeutralBackground2: PARCHMENT_2,
    colorNeutralBackground3: PARCHMENT_2,
    colorNeutralBackground4: PARCHMENT_3,
    colorNeutralBackgroundDisabled: '#e7dfcc',

    colorNeutralForeground1: INK,
    colorNeutralForeground1Hover: INK,
    colorNeutralForeground1Pressed: INK,
    colorNeutralForeground2: INK_SOFT,
    colorNeutralForeground2Hover: INK,
    colorNeutralForeground2Pressed: INK,
    colorNeutralForeground3: INK_SOFT,
    colorNeutralForeground4: '#6b5f4b',
    colorNeutralForegroundDisabled: 'rgba(36, 29, 20, 0.38)',

    // The same rules the registers are drawn with, so a control standing above
    // a table does not out-draw the table.
    colorNeutralStroke1: brown(0.42),
    colorNeutralStroke1Hover: brown(0.6),
    colorNeutralStroke1Pressed: brown(0.68),
    colorNeutralStroke2: brown(0.28),
    colorNeutralStroke3: brown(0.18),
    colorNeutralStrokeAccessible: brown(0.62),
    colorNeutralStrokeDisabled: brown(0.14),

    // Warm. Fluent's shadows are neutral grey and read as cold plastic on a
    // page whose own shadows are all brown.
    shadow2: '0 1px 2px rgba(60, 44, 20, 0.22)',
    shadow4: '0 2px 6px rgba(60, 44, 20, 0.26)',
    shadow8: '0 4px 14px rgba(60, 44, 20, 0.3)',
    shadow16: '0 8px 26px rgba(60, 44, 20, 0.34)',
    shadow28: '0 14px 40px rgba(60, 44, 20, 0.38)',
    shadow64: '0 26px 60px rgba(60, 44, 20, 0.42)',
  };
}

/**
 * Night. Built now and deliberately unused: the informants scry is the one
 * Fluent surface that would sit on a dark ground (chronicle.css .scry), and
 * that volume is not part of this pass. Keeping it here means the decision
 * about that volume stays a decision about one component rather than a reopening
 * of the theme layer.
 */
export function archiveDark(seed: string): Theme {
  return {
    ...createDarkTheme(goldRamp(seed)),
    ...SHAPE,
    ...FOCUS_AT_NIGHT,

    colorNeutralBackground1: NIGHT_2,
    colorNeutralBackground1Hover: '#232019',
    colorNeutralBackground1Pressed: NIGHT,
    colorNeutralBackground2: NIGHT,
    colorNeutralBackground3: NIGHT,

    colorNeutralForeground1: STONE,
    colorNeutralForeground2: STONE_DIM,
    colorNeutralForeground3: STONE_DIM,
    colorNeutralForegroundDisabled: 'rgba(207, 199, 182, 0.35)',

    colorNeutralStroke1: 'rgba(201, 162, 39, 0.34)',
    colorNeutralStroke2: 'rgba(201, 162, 39, 0.16)',
    colorNeutralStroke3: 'rgba(201, 162, 39, 0.1)',
    colorNeutralStrokeAccessible: 'rgba(201, 162, 39, 0.55)',
  };
}

/**
 * The theme for a volume's interior, keyed to the gold that volume is actually
 * lettered in.
 *
 * Seeded from the binding's foil rather than from --gold, because inside a
 * volume the foil is the gold: informants is bound in a colder, older leaf than
 * the rest, and a search box glinting in the hall's gold on that page would be
 * the one thing in the room that did not match.
 *
 * --cover is never read here. Per invariant 6 it has to stay dark, and Fluent
 * would put it behind text.
 */
export function fluentThemeFor(slug: VolumeSlug): Theme {
  return archiveLight(BINDINGS[slug].foil);
}

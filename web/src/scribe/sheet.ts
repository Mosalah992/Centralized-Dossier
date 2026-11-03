// The parchment's measures: the pages and hands a body is fitted to, where the
// fit starts, and the torn edge. Parchment.tsx draws with them; they are pure,
// so the tests run them in Node.
//
// The same request always draws the same parchment. The torn edge is seeded
// from the filing, never from a clock or Math.random, so the Clerk's stamp
// changes the stamp and nothing else.

import type { ParchmentRequest } from '../../../shared/filing';

/** The sheet is laid out at this width and scaled to fit its frame. */
export const WIDTH = 1100;

export const MARGIN = 112;
export const TEXT_WIDTH = WIDTH - MARGIN * 2;
/** Where the writing starts: below the Cataclysm banner when there is one. */
export const TOP = 100;
export const CATACLYSM_TOP = 168;
/**
 * Kept clear at the foot for the signature and the Clerk's seal, stamped or
 * not, so stamping a parchment never moves a word of it.
 */
export const FOOT = 400;
/** From the top margin to the body: house line, header, rules, ribbon and their gaps (the title aside). */
const HEAD = 305;

// ── Fitting the body ────────────────────────────────────────────────────────

/**
 * The pages a parchment comes in. scripts/make-scribe-parchment.mjs makes a
 * sheet for each, so the sheet is laid at 1:1 and never stretched.
 */
export const PAGE_HEIGHTS = [1200, 1500, 1850, 2200] as const;
export type PageHeight = (typeof PAGE_HEIGHTS)[number];

export interface Fit {
  height: PageHeight;
  size: number;
}

/**
 * The page and the hand a body is written at: the shortest page first, then the
 * largest hand. The first try is an estimate (estimateFit); the browser then
 * measures where the body really ended, and a body that ran into the foot is
 * laid out again at the next fit.
 */
export const FITS: readonly Fit[] = [
  { height: 1200, size: 36 },
  { height: 1500, size: 36 },
  { height: 1500, size: 32 },
  { height: 1850, size: 32 },
  { height: 1850, size: 29 },
  { height: 2200, size: 29 },
  { height: 2200, size: 26 },
  { height: 2200, size: 24 },
];

export const LINE_HEIGHT = 1.34;
/** Caveat's average advance in prose, measured on the samples at 0.355em. The layout checks the guess. */
const AVERAGE_ADVANCE = 0.36;

export function bodyLines(body: string, size: number): number {
  const perLine = Math.max(1, Math.floor(TEXT_WIDTH / (size * AVERAGE_ADVANCE)));
  return body.split('\n').reduce((total, paragraph) => {
    if (!paragraph.trim()) return total + 1;
    // Wrapping breaks at spaces, so a line averages a little short of full.
    return total + Math.ceil(paragraph.length / (perLine * 0.94));
  }, 0);
}

export function titleSize(title: string): number {
  if (title.length <= 32) return 58;
  if (title.length <= 60) return 48;
  return 40;
}

/**
 * Everything above and below the body. The head (the house, category, hour,
 * rules and ribbon) measures 305 at every size; only the title's lines vary.
 */
function chrome(request: ParchmentRequest): number {
  const size = titleSize(request.filing.title);
  // IM Fell English SC averages about 0.46em a letter; 0.52 leaves headroom.
  const perLine = Math.floor(TEXT_WIDTH / (size * 0.52));
  const titleLines = Math.ceil(request.filing.title.length / perLine);
  const top = request.filing.importance === 'cataclysm' ? CATACLYSM_TOP : TOP;
  return top + HEAD + titleLines * size * 1.15 + FOOT;
}

/** The first fit the estimate says the body fills without overrunning: an index into FITS. */
export function estimateFit(request: ParchmentRequest): number {
  const room = (height: number) => height - chrome(request);
  const index = FITS.findIndex((fit) => bodyLines(request.filing.body, fit.size) * fit.size * LINE_HEIGHT <= room(fit.height));
  return index === -1 ? FITS.length - 1 : index;
}

/**
 * The fit to try after one that overran, or null when there is none: the last
 * fit is kept however it falls, as FILING_LIMITS.body is set so that it holds.
 */
export const nextFit = (index: number): number | null => (index < FITS.length - 1 ? index + 1 : null);

/**
 * The signature's size. Mr De Haviland's capitals swash wide, so a long rank
 * and name is written smaller rather than broken across two lines.
 */
export function signatureSize(signature: string): number {
  return Math.round(Math.max(44, Math.min(74, 600 / (signature.length * 0.32))));
}

// ── The torn edge ───────────────────────────────────────────────────────────

/** FNV-1a, so a filing always tears the same way. */
export function seedOf(request: ParchmentRequest): number {
  const text = `${request.filing.title}|${request.filing.name}|${request.serial ?? ''}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The outline of a sheet with a deckled edge: small, irregular bites inward of a rectangle. */
export function deckle(width: number, height: number, seed: number): string {
  const next = random(seed);
  const inset = 6;
  const bite = 10;
  const step = 11;
  const points: [number, number][] = [];
  // A gently wandering depth plus a little tooth, so it reads as torn rather than as noise.
  let wander = next() * bite;
  const depth = () => {
    wander = Math.min(bite, Math.max(0, wander + (next() - 0.5) * 4));
    return inset + wander * 0.7 + next() * 3;
  };
  for (let x = inset; x < width - inset; x += step) points.push([x, depth()]);
  for (let y = inset; y < height - inset; y += step) points.push([width - depth(), y]);
  for (let x = width - inset; x > inset; x -= step) points.push([x, height - depth()]);
  for (let y = height - inset; y > inset; y -= step) points.push([depth(), y]);
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}

/** A darker shade of an ink, for a ribbon's folds. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

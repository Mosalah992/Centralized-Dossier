// The parchment, drawn from a filing's fields.
//
// satori lays the sheet out (it word-wraps and centres, which hand-placed SVG
// text cannot) and returns an SVG; this module then tears the sheet's edge and
// resvg draws the PNG. Nothing here knows how it was loaded: the Worker
// (index.ts) hands over its statically imported fonts and pictures, and the
// tests read the same files from disk, so both draw the same picture.
//
// The same request always draws the same parchment. The torn edge is seeded
// from the filing, never from a clock or Math.random, so a re-render for the
// Clerk's stamp changes the stamp and nothing else.

import satori, { type SatoriNode } from 'satori/standalone';
import { Resvg } from '@resvg/resvg-wasm';

import {
  CATEGORY_INFO,
  IMPORTANCE_INFO,
  incidentClock,
  incidentDate,
  type Importance,
  type ParchmentRequest,
} from '../../shared/filing';
import { BOARD_INFO } from '../../shared/room';
import { WING_INFO } from '../../shared/wings';

export interface ScribeAssets {
  /** The rank and name, as a signature. */
  signature: ArrayBuffer;
  /** The category, the date and the title, as printed. */
  printed: ArrayBuffer;
  /** The body, in a clear hand: regular and bold. */
  hand: ArrayBuffer;
  handBold: ArrayBuffer;
  /** scribe/assets/parchment-<height>.jpg, one sheet per page height. */
  parchment: Record<PageHeight, ArrayBuffer>;
  /** scribe/assets/seal-aldmeri.png */
  seal: ArrayBuffer;
}

export const WIDTH = 1100;

/** The Cabinet's own severity inks (web/src/styles/cabinet.css), so a level reads the same in both places. */
const RIBBON: Record<Importance, string> = {
  routine: '#58703c',
  nominal: '#496b76',
  notable: '#8b6c1d',
  strategic: '#a85824',
  cataclysm: '#8b251d',
};

const INK = '#2a1a0c';
const PRINT = '#3b2814';
const FADED = 'rgba(59, 40, 20, 0.62)';
const CRIMSON = '#8b1a1a';
const ON_RIBBON = '#f6ead0';

const MARGIN = 112;
const TEXT_WIDTH = WIDTH - MARGIN * 2;
/** Where the writing starts: below the Cataclysm banner when there is one. */
const TOP = 100;
const CATACLYSM_TOP = 168;
/**
 * Kept clear at the foot for the signature and the Clerk's seal, stamped or
 * not, so stamping a parchment never moves a word of it.
 */
const FOOT = 400;
/** From the top margin to the body: house line, header, rules, ribbon and their gaps (the title aside). */
const HEAD = 305;

// ── A tiny element builder, so satori needs no React ────────────────────────

type Style = Record<string, string | number>;
interface El {
  type: string;
  key?: string;
  props: Record<string, unknown>;
}
type Child = El | string | null | false;

function h(type: string, { key, ...props }: Record<string, unknown> & { key?: string; style?: Style }, ...children: Child[]): El {
  const kept = children.filter((c): c is El | string => c !== null && c !== false);
  const el: El = { type, props: { ...props, children: kept.length === 0 ? undefined : kept.length === 1 ? kept[0] : kept } };
  if (key) el.key = key;
  return el;
}

const box = (style: Style, ...children: Child[]) => h('div', { style: { display: 'flex', ...style } }, ...children);

// ── Fitting the body ────────────────────────────────────────────────────────

/**
 * The pages a parchment comes in. scripts/make-scribe-parchment.mjs makes a
 * sheet for each, so the sheet is drawn at 1:1 and never resampled.
 */
export const PAGE_HEIGHTS = [1200, 1500, 1850, 2200] as const;
export type PageHeight = (typeof PAGE_HEIGHTS)[number];

/**
 * The page and the hand a body is written at: the shortest page first, then the
 * largest hand. satori cannot measure before it lays out, so the first try is
 * an estimate (estimateFit); the layout then says where the body really ended,
 * and a body that ran into the foot is laid out again at the next fit.
 */
const FITS: readonly { height: PageHeight; size: number }[] = [
  { height: 1200, size: 36 },
  { height: 1500, size: 36 },
  { height: 1500, size: 32 },
  { height: 1850, size: 32 },
  { height: 1850, size: 29 },
  { height: 2200, size: 29 },
  { height: 2200, size: 26 },
  { height: 2200, size: 24 },
];

const LINE_HEIGHT = 1.34;
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

function titleSize(title: string): number {
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

// ── Pictures drawn as SVG ───────────────────────────────────────────────────

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** A heraldic ribbon: a band across, its two tails folded behind. */
function ribbon(width: number, height: number, colour: string, label: string, size: number): El {
  const tail = Math.round(height * 0.95);
  const drop = Math.round(height * 0.24);
  const notch = Math.round(tail * 0.36);
  const back = shade(colour, 0.28);
  const fold = shade(colour, 0.5);
  const w = width;
  const bandH = height;
  const total = height + drop;
  return box(
    { position: 'relative', width: w, height: total, alignItems: 'flex-start', justifyContent: 'center' },
    h(
      'svg',
      { width: w, height: total, viewBox: `0 0 ${w} ${total}`, style: { position: 'absolute', left: 0, top: 0 } },
      h('path', { d: `M0 ${drop} H${tail + 10} V${total} H0 L${notch} ${drop + bandH / 2}Z`, fill: back }),
      h('path', { d: `M${w} ${drop} H${w - tail - 10} V${total} H${w} L${w - notch} ${drop + bandH / 2}Z`, fill: back }),
      h('path', { d: `M${tail - 12} ${bandH} L${tail + 10} ${total} V${bandH}Z`, fill: fold }),
      h('path', { d: `M${w - tail + 12} ${bandH} L${w - tail - 10} ${total} V${bandH}Z`, fill: fold }),
      h('rect', { x: tail - 12, y: 0, width: w - 2 * (tail - 12), height: bandH, fill: colour }),
      h('rect', {
        x: tail - 4,
        y: 6,
        width: w - 2 * (tail - 4),
        height: bandH - 12,
        fill: 'none',
        stroke: ON_RIBBON,
        'stroke-opacity': 0.4,
        'stroke-width': 1.5,
        'stroke-dasharray': '5 4',
      }),
    ),
    box(
      {
        position: 'absolute',
        left: tail - 12,
        top: 0,
        width: w - 2 * (tail - 12),
        height: bandH,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Printed',
        fontSize: size,
        color: ON_RIBBON,
        letterSpacing: 2,
      },
      label,
    ),
  );
}

/** A rule with a lozenge at its middle. */
function rule(width: number, colour = FADED): El {
  const mid = width / 2;
  return h(
    'svg',
    { width, height: 18, viewBox: `0 0 ${width} 18` },
    h('path', { d: `M0 9 H${mid - 22} M${mid + 22} 9 H${width}`, stroke: colour, 'stroke-width': 1.5 }),
    h('path', { d: `M${mid} 2 L${mid + 12} 9 L${mid} 16 L${mid - 12} 9Z`, fill: colour }),
    h('circle', { cx: mid - 18, cy: 9, r: 2.2, fill: colour }),
    h('circle', { cx: mid + 18, cy: 9, r: 2.2, fill: colour }),
  );
}

/** The red wax of a denial, after web/src/room/takeovers/Stamp.tsx. */
function deniedWax(size: number): El {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 100 100' },
    h('path', {
      d: 'M50 4c8 0 10 5 17 7s11 1 14 8 1 11 5 17 7 9 4 16-7 8-8 15-6 11-13 14-9 6-19 6-12-2-19-6-11-6-13-14-6-9-8-15 1-10 4-16 1-11 5-17 6-5 13-8 11-7 18-7z',
      fill: '#5e1212',
    }),
    h('circle', { cx: 50, cy: 50, r: 36, fill: '#a01c1c' }),
    h('circle', { cx: 50, cy: 50, r: 30, fill: 'none', stroke: '#5e1212', 'stroke-width': 2, 'stroke-dasharray': '3 3' }),
    h('path', { d: 'M32 32 68 68M68 32 32 68', stroke: '#f2dccb', 'stroke-width': 9, 'stroke-linecap': 'round' }),
  );
}

// ── The sheet ───────────────────────────────────────────────────────────────

function destination(request: ParchmentRequest): string {
  const { category, section } = request.filing;
  const to = CATEGORY_INFO[category].destination;
  switch (to.kind) {
    case 'board':
      return `For the Board · ${section ? BOARD_INFO[section].title : ''}`;
    case 'cabinet':
      return `To the ${WING_INFO[to.wing].name}`;
    case 'clerk':
      return 'For the Clerk’s Table';
  }
}

function stampSpace(request: ParchmentRequest, seal: string): El {
  const size = 230;
  const { stamp } = request;
  if (!stamp) {
    return box(
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        border: '2px dashed rgba(70, 45, 20, 0.42)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Printed',
        fontSize: 21,
        color: 'rgba(59, 40, 20, 0.5)',
        textAlign: 'center',
      },
      box({}, 'For the'),
      box({}, 'Clerk’s seal'),
    );
  }
  const approved = stamp.mark === 'approved';
  return box(
    { width: size, height: size + 70, flexDirection: 'column', alignItems: 'center' },
    box(
      { transform: approved ? 'rotate(-9deg)' : 'rotate(7deg)' },
      approved ? h('img', { src: seal, width: size, height: size }) : deniedWax(size),
    ),
    box(
      {
        marginTop: 6,
        fontFamily: 'Printed',
        fontSize: 32,
        letterSpacing: 3,
        color: approved ? '#6e5410' : CRIMSON,
      },
      approved ? 'Approved' : 'Denied',
    ),
    box({ fontFamily: 'Printed', fontSize: 18, color: FADED }, incidentDate(stamp.at)),
  );
}

function cataclysmFrame(height: number): El[] {
  return [
    box({ position: 'absolute', left: 40, top: 40, width: WIDTH - 80, height: height - 80, border: `6px solid ${CRIMSON}` }),
    box({
      position: 'absolute',
      left: 54,
      top: 54,
      width: WIDTH - 108,
      height: height - 108,
      border: `2px solid ${CRIMSON}`,
      opacity: 0.75,
    }),
    box(
      { position: 'absolute', left: 0, top: 58, width: WIDTH, justifyContent: 'center' },
      ribbon(WIDTH - 120, 70, '#7d1414', 'Cataclysm  ·  All hands on deck', 34),
    ),
  ];
}

/**
 * The signature's size. Mr De Haviland's capitals swash wide, so a long rank
 * and name is written smaller rather than broken across two lines.
 */
function signatureSize(signature: string): number {
  return Math.round(Math.max(44, Math.min(74, 600 / (signature.length * 0.32))));
}

/** The sheet's layout. The parchment itself is laid under it by `tear`. */
function sheet(request: ParchmentRequest, fit: { height: number; size: number }, seal: string): El {
  const { filing } = request;
  const level = IMPORTANCE_INFO[filing.importance];
  const cataclysm = filing.importance === 'cataclysm';
  const signature = [filing.rank, filing.name].filter(Boolean).join(' ');

  return box(
    {
      position: 'relative',
      width: WIDTH,
      height: fit.height,
      flexDirection: 'column',
      fontFamily: 'Hand',
      color: INK,
    },
    ...(cataclysm ? cataclysmFrame(fit.height) : []),

    box(
      {
        flexDirection: 'column',
        paddingTop: cataclysm ? CATACLYSM_TOP : TOP,
        paddingBottom: FOOT,
        paddingLeft: MARGIN,
        paddingRight: MARGIN,
        width: WIDTH,
        flexGrow: 1,
      },
      // The printed head: the house, the entry, the category and the hour.
      box(
        { justifyContent: 'center', fontFamily: 'Printed', fontSize: 20, letterSpacing: 4, color: FADED },
        request.serial === null ? 'Thalmor Embassy  ·  Draft' : `Thalmor Embassy  ·  Entry No. ${request.serial}`,
      ),
      box(
        { marginTop: 18, justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: 'Printed', color: PRINT },
        box(
          { flexDirection: 'column' },
          box({ fontSize: 34 }, CATEGORY_INFO[filing.category].name),
          box({ fontSize: 20, color: FADED }, destination(request)),
        ),
        box(
          { flexDirection: 'column', alignItems: 'flex-end' },
          box({ fontSize: 24 }, incidentDate(filing.time)),
          box({ fontSize: 20, color: FADED }, incidentClock(filing.time)),
        ),
      ),
      box({ marginTop: 14 }, rule(TEXT_WIDTH)),
      // The title, centred.
      box(
        {
          marginTop: 22,
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'Printed',
          fontSize: titleSize(filing.title),
          lineHeight: 1.15,
          color: INK,
        },
        filing.title,
      ),
      // The level, as a ribbon.
      box({ marginTop: 18, justifyContent: 'center' }, ribbon(440, 52, RIBBON[filing.importance], level.name, 27)),
      box({ marginTop: 18 }, rule(TEXT_WIDTH)),
      // The body, in the filer's hand. The frame stops at the foot and clips, so
      // a body the estimate misjudged loses its last line rather than running
      // under the signature; the tests hold every sample inside it.
      box(
        { marginTop: 22, flexGrow: 1, overflow: 'hidden', alignItems: 'flex-start' },
        h(
          'div',
          { key: 'body', style: { display: 'flex', fontSize: fit.size, lineHeight: LINE_HEIGHT, whiteSpace: 'pre-wrap' } },
          filing.body,
        ),
      ),
    ),

    // The foot: the signature on the left, the Clerk's seal on the right.
    box(
      {
        position: 'absolute',
        left: MARGIN,
        right: MARGIN,
        bottom: cataclysm ? 96 : 84,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      },
      box(
        { flexDirection: 'column', width: 620 },
        box({ fontFamily: 'Printed', fontSize: 20, color: FADED }, 'Signed'),
        box(
          { fontFamily: 'Signature', fontSize: signatureSize(signature), lineHeight: 1.1, color: INK, paddingLeft: 12 },
          signature,
        ),
        box({ height: 2, width: 560, backgroundColor: 'rgba(59, 40, 20, 0.45)', marginTop: -6 }),
        box(
          { marginTop: 8, fontFamily: 'Printed', fontSize: 21, color: PRINT },
          filing.superior ? `Answering to ${filing.superior}` : 'Answering to no superior',
        ),
      ),
      stampSpace(request, seal),
    ),
  );
}

// ── The torn edge ───────────────────────────────────────────────────────────

/** FNV-1a, so a filing always tears the same way. */
function seedOf(request: ParchmentRequest): number {
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

/**
 * Lays the parchment under satori's drawing and tears its edge. The sheet is
 * placed here rather than as an <img> in the layout, because satori wraps an
 * image in a full-page mask and clip that cost resvg more than the text does.
 */
function tear(svg: string, width: number, height: number, seed: number, parchment: string): string {
  const edge = deckle(width, height, seed);
  // Browned where it tore: three soft strokes along the edge, clipped to the sheet so only their inner halves show.
  const scorch = [
    { w: 34, o: 0.08 },
    { w: 18, o: 0.12 },
    { w: 6, o: 0.3 },
  ]
    .map(({ w, o }) => `<path d="${edge}" fill="none" stroke="#4a2c10" stroke-opacity="${o}" stroke-width="${w}"/>`)
    .join('');
  const open = svg.indexOf('>') + 1;
  const close = svg.lastIndexOf('</svg>');
  return (
    `${svg.slice(0, open)}<defs><clipPath id="deckle"><path d="${edge}"/></clipPath></defs>` +
    `<g clip-path="url(#deckle)"><image x="0" y="0" width="${width}" height="${height}" href="${parchment}"/>` +
    `${svg.slice(open, close)}${scorch}</g></svg>`
  );
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function dataUri(type: string, buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(binary)}`;
}

interface Pictures {
  parchment: Record<PageHeight, string>;
  seal: string;
}

/** Encoded once per set of assets, which in the Worker is once per isolate. */
const pictureCache = new WeakMap<ScribeAssets, Pictures>();

function picturesOf(assets: ScribeAssets): Pictures {
  let pictures = pictureCache.get(assets);
  if (!pictures) {
    const parchment = {} as Record<PageHeight, string>;
    for (const height of PAGE_HEIGHTS) parchment[height] = dataUri('image/jpeg', assets.parchment[height]);
    pictures = { parchment, seal: dataUri('image/png', assets.seal) };
    pictureCache.set(assets, pictures);
  }
  return pictures;
}

/** The parchment as SVG. satori and its layout engine must already be initialised. */
export async function parchmentSvg(
  request: ParchmentRequest,
  assets: ScribeAssets,
  /** Sees every box of the final layout; the tests use it to find where the body ends. */
  inspect?: (node: SatoriNode) => void,
): Promise<{ svg: string; width: number; height: number; size: number; overrun: number }> {
  const pictures = picturesOf(assets);
  const fonts = [
    { name: 'Signature', data: assets.signature, weight: 400 as const, style: 'normal' as const },
    { name: 'Printed', data: assets.printed, weight: 400 as const, style: 'normal' as const },
    { name: 'Hand', data: assets.hand, weight: 400 as const, style: 'normal' as const },
    { name: 'Hand', data: assets.handBold, weight: 700 as const, style: 'normal' as const },
  ];
  for (let index = estimateFit(request); ; index++) {
    const fit = FITS[index]!;
    const nodes: SatoriNode[] = [];
    let bodyEnd = 0;
    const svg = await satori(sheet(request, fit, pictures.seal) as unknown as Parameters<typeof satori>[0], {
      width: WIDTH,
      height: fit.height,
      fonts,
      onNodeDetected: (node) => {
        if (node.key === 'body') bodyEnd = node.top + node.height;
        if (inspect) nodes.push(node);
      },
    });
    const overrun = Math.max(0, bodyEnd - (fit.height - FOOT));
    // The last fit is kept however it falls: FILING_LIMITS.body is set so that it holds.
    if (overrun > 0 && index < FITS.length - 1) continue;
    if (inspect) nodes.forEach(inspect);
    return {
      svg: tear(svg, WIDTH, fit.height, seedOf(request), pictures.parchment[fit.height]),
      width: WIDTH,
      height: fit.height,
      size: fit.size,
      overrun,
    };
  }
}

/** The parchment as PNG. resvg must already be initialised. */
export async function parchmentPng(request: ParchmentRequest, assets: ScribeAssets): Promise<Uint8Array> {
  const { svg } = await parchmentSvg(request, assets);
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' }, font: { loadSystemFonts: false } });
  try {
    const image = resvg.render();
    try {
      return image.asPng();
    } finally {
      image.free();
    }
  } finally {
    resvg.free();
  }
}

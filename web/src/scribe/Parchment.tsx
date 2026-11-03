// The parchment, drawn in the reader's browser from a filing's fields. The
// browser lays the sheet out as ordinary HTML over a torn sheet of paper, so
// the writing is real text: it wraps, selects and reads aloud like any page,
// and nothing but the fonts and the paper is downloaded to draw it.
//
// The sheet is laid out at a fixed 1100 wide and scaled to its frame, so it
// looks the same at every size. The body's page and hand are fitted in two
// steps: an estimate first (sheet.ts), then, once the fonts are in, the
// browser measures where the body ends and steps to the next fit while it
// runs into the foot.

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-ext-400.css';
import '@fontsource/im-fell-english-sc/latin-400.css';
import '@fontsource/mr-de-haviland/latin-400.css';
import '@fontsource/mr-de-haviland/latin-ext-400.css';

import { CATEGORY_INFO, IMPORTANCE_INFO, destinationLabel, incidentClock, incidentDate, type ParchmentRequest } from '../../../shared/filing';
import paper1200 from '../assets/scribe/parchment-1200.jpg';
import paper1500 from '../assets/scribe/parchment-1500.jpg';
import paper1850 from '../assets/scribe/parchment-1850.jpg';
import paper2200 from '../assets/scribe/parchment-2200.jpg';
import sealUrl from '../assets/scribe/seal-aldmeri.png';
import {
  CATACLYSM_TOP,
  FITS,
  FOOT,
  LINE_HEIGHT,
  MARGIN,
  TEXT_WIDTH,
  TOP,
  WIDTH,
  deckle,
  estimateFit,
  nextFit,
  seedOf,
  shade,
  signatureSize,
  titleSize,
  type Fit,
  type PageHeight,
} from './sheet';
import '../styles/parchment.css';

/** scripts/make-scribe-parchment.mjs makes one sheet per page height. */
const PAPER: Record<PageHeight, string> = { 1200: paper1200, 1500: paper1500, 1850: paper1850, 2200: paper2200 };

const INK = '#2a1a0c';
const PRINT = '#3b2814';
const FADED = 'rgba(59, 40, 20, 0.62)';
const CRIMSON = '#8b1a1a';
const ON_RIBBON = '#f6ead0';

/** The rank and name, as a signature. */
const SIGNATURE = '"Mr De Haviland", cursive';
/** The category, the date and the title, as printed. */
const PRINTED = '"IM Fell English SC", Georgia, serif';
/** The body, in a clear hand. */
const HAND = 'Caveat, cursive';

// ── The pieces ──────────────────────────────────────────────────────────────

/** Every box on the sheet is a flex box, as the sheet was first laid out. */
function Box({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ display: 'flex', ...style }}>{children}</div>;
}

/** A heraldic ribbon: a band across, its two tails folded behind. */
function Ribbon({ width: w, height: bandH, colour, label, size }: { width: number; height: number; colour: string; label: string; size: number }) {
  const tail = Math.round(bandH * 0.95);
  const drop = Math.round(bandH * 0.24);
  const notch = Math.round(tail * 0.36);
  const back = shade(colour, 0.28);
  const fold = shade(colour, 0.5);
  const total = bandH + drop;
  return (
    <Box style={{ position: 'relative', flexShrink: 0, width: w, height: total, alignItems: 'flex-start', justifyContent: 'center' }}>
      <svg width={w} height={total} viewBox={`0 0 ${w} ${total}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
        <path d={`M0 ${drop} H${tail + 10} V${total} H0 L${notch} ${drop + bandH / 2}Z`} fill={back} />
        <path d={`M${w} ${drop} H${w - tail - 10} V${total} H${w} L${w - notch} ${drop + bandH / 2}Z`} fill={back} />
        <path d={`M${tail - 12} ${bandH} L${tail + 10} ${total} V${bandH}Z`} fill={fold} />
        <path d={`M${w - tail + 12} ${bandH} L${w - tail - 10} ${total} V${bandH}Z`} fill={fold} />
        <rect x={tail - 12} y={0} width={w - 2 * (tail - 12)} height={bandH} fill={colour} />
        <rect
          x={tail - 4}
          y={6}
          width={w - 2 * (tail - 4)}
          height={bandH - 12}
          fill="none"
          stroke={ON_RIBBON}
          strokeOpacity={0.4}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      </svg>
      <Box
        style={{
          position: 'absolute',
          left: tail - 12,
          top: 0,
          width: w - 2 * (tail - 12),
          height: bandH,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: PRINTED,
          fontSize: size,
          color: ON_RIBBON,
          letterSpacing: 2,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** A rule with a lozenge at its middle. */
function Rule({ width, colour = FADED }: { width: number; colour?: string }) {
  const mid = width / 2;
  return (
    <svg width={width} height={18} viewBox={`0 0 ${width} 18`} aria-hidden="true">
      <path d={`M0 9 H${mid - 22} M${mid + 22} 9 H${width}`} stroke={colour} strokeWidth={1.5} />
      <path d={`M${mid} 2 L${mid + 12} 9 L${mid} 16 L${mid - 12} 9Z`} fill={colour} />
      <circle cx={mid - 18} cy={9} r={2.2} fill={colour} />
      <circle cx={mid + 18} cy={9} r={2.2} fill={colour} />
    </svg>
  );
}

/** The red wax of a denial, after web/src/room/takeovers/Stamp.tsx. */
function DeniedWax({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 4c8 0 10 5 17 7s11 1 14 8 1 11 5 17 7 9 4 16-7 8-8 15-6 11-13 14-9 6-19 6-12-2-19-6-11-6-13-14-6-9-8-15 1-10 4-16 1-11 5-17 6-5 13-8 11-7 18-7z"
        fill="#5e1212"
      />
      <circle cx={50} cy={50} r={36} fill="#a01c1c" />
      <circle cx={50} cy={50} r={30} fill="none" stroke="#5e1212" strokeWidth={2} strokeDasharray="3 3" />
      <path d="M32 32 68 68M68 32 32 68" stroke="#f2dccb" strokeWidth={9} strokeLinecap="round" />
    </svg>
  );
}

function StampSpace({ request }: { request: ParchmentRequest }) {
  const size = 230;
  const { stamp } = request;
  if (!stamp) {
    return (
      <Box
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: size / 2,
          border: '2px dashed rgba(70, 45, 20, 0.42)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: PRINTED,
          fontSize: 21,
          color: 'rgba(59, 40, 20, 0.5)',
          textAlign: 'center',
        }}
      >
        <Box>For the</Box>
        <Box>Clerk’s seal</Box>
      </Box>
    );
  }
  const approved = stamp.mark === 'approved';
  return (
    <Box style={{ width: size, height: size + 70, flexShrink: 0, flexDirection: 'column', alignItems: 'center' }}>
      <Box style={{ transform: approved ? 'rotate(-9deg)' : 'rotate(7deg)' }}>
        {approved ? <img src={sealUrl} width={size} height={size} alt="" /> : <DeniedWax size={size} />}
      </Box>
      <Box style={{ marginTop: 6, fontFamily: PRINTED, fontSize: 32, letterSpacing: 3, color: approved ? '#6e5410' : CRIMSON }}>
        {approved ? 'Approved' : 'Denied'}
      </Box>
      <Box style={{ fontFamily: PRINTED, fontSize: 18, color: FADED }}>{incidentDate(stamp.at)}</Box>
    </Box>
  );
}

function CataclysmFrame({ height }: { height: number }) {
  return (
    <>
      <Box style={{ position: 'absolute', left: 40, top: 40, width: WIDTH - 80, height: height - 80, border: `6px solid ${CRIMSON}` }} />
      <Box
        style={{ position: 'absolute', left: 54, top: 54, width: WIDTH - 108, height: height - 108, border: `2px solid ${CRIMSON}`, opacity: 0.75 }}
      />
      <Box style={{ position: 'absolute', left: 0, top: 58, width: WIDTH, justifyContent: 'center' }}>
        <Ribbon width={WIDTH - 120} height={70} colour="#7d1414" label="Cataclysm  ·  All hands on deck" size={34} />
      </Box>
    </>
  );
}

// ── The sheet ───────────────────────────────────────────────────────────────

/**
 * One parchment at one fit, at full size (WIDTH by the fit's height). The
 * body's frame stops at the foot and clips, so a body the fit misjudged loses
 * its last line rather than running under the signature; `Parchment` measures
 * the two refs and moves to the next fit until it holds.
 */
export function ParchmentSheet({
  request,
  fit,
  frameRef,
  bodyRef,
}: {
  request: ParchmentRequest;
  fit: Fit;
  frameRef?: Ref<HTMLDivElement>;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  const { filing } = request;
  const clip = `scribe-deckle-${useId().replace(/[^\w-]/g, '')}`;
  const edge = deckle(WIDTH, fit.height, seedOf(request));
  const cataclysm = filing.importance === 'cataclysm';
  const signature = [filing.rank, filing.name].filter(Boolean).join(' ');

  return (
    <div className="scribe-paper__page" style={{ width: WIDTH, height: fit.height }}>
      <svg className="scribe-paper__sheet" width={WIDTH} height={fit.height} viewBox={`0 0 ${WIDTH} ${fit.height}`} aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <path d={edge} />
          </clipPath>
        </defs>
        <image href={PAPER[fit.height]} x={0} y={0} width={WIDTH} height={fit.height} clipPath={`url(#${clip})`} />
      </svg>

      <div className="scribe-paper__writing" style={{ fontFamily: HAND, color: INK }}>
        {cataclysm && <CataclysmFrame height={fit.height} />}

        <Box
          style={{
            flexDirection: 'column',
            paddingTop: cataclysm ? CATACLYSM_TOP : TOP,
            paddingBottom: FOOT,
            paddingLeft: MARGIN,
            paddingRight: MARGIN,
            width: WIDTH,
            flexGrow: 1,
            minHeight: 0,
          }}
        >
          {/* The printed head: the house, the entry, the category and the hour. */}
          <Box style={{ justifyContent: 'center', fontFamily: PRINTED, fontSize: 20, letterSpacing: 4, color: FADED }}>
            {request.serial === null ? 'Thalmor Embassy  ·  Draft' : `Thalmor Embassy  ·  Entry No. ${request.serial}`}
          </Box>
          <Box style={{ marginTop: 18, justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: PRINTED, color: PRINT }}>
            <Box style={{ flexDirection: 'column' }}>
              <Box style={{ fontSize: 34 }}>{CATEGORY_INFO[filing.category].name}</Box>
              <Box style={{ fontSize: 20, color: FADED }}>{destinationLabel(filing)}</Box>
            </Box>
            <Box style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
              <Box style={{ fontSize: 24 }}>{incidentDate(filing.time)}</Box>
              <Box style={{ fontSize: 20, color: FADED }}>{incidentClock(filing.time)}</Box>
            </Box>
          </Box>
          <Box style={{ marginTop: 14 }}>
            <Rule width={TEXT_WIDTH} />
          </Box>
          {/* The title, centred. */}
          <Box
            style={{
              marginTop: 22,
              justifyContent: 'center',
              textAlign: 'center',
              fontFamily: PRINTED,
              fontSize: titleSize(filing.title),
              lineHeight: 1.15,
              color: INK,
            }}
          >
            {filing.title}
          </Box>
          {/* The level, as a ribbon. */}
          <Box style={{ marginTop: 18, justifyContent: 'center' }}>
            <Ribbon width={440} height={52} colour={IMPORTANCE_INFO[filing.importance].ink} label={IMPORTANCE_INFO[filing.importance].name} size={27} />
          </Box>
          <Box style={{ marginTop: 18 }}>
            <Rule width={TEXT_WIDTH} />
          </Box>
          {/* The body, in the filer's hand. */}
          <div ref={frameRef} style={{ display: 'flex', marginTop: 22, flexGrow: 1, minHeight: 0, overflow: 'hidden', alignItems: 'flex-start' }}>
            <div ref={bodyRef} style={{ width: '100%', fontSize: fit.size, lineHeight: LINE_HEIGHT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {filing.body}
            </div>
          </div>
        </Box>

        {/* The foot: the signature on the left, the Clerk's seal on the right. */}
        <Box
          style={{
            position: 'absolute',
            left: MARGIN,
            right: MARGIN,
            bottom: cataclysm ? 96 : 84,
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <Box style={{ flexDirection: 'column', width: 620 }}>
            <Box style={{ fontFamily: PRINTED, fontSize: 20, color: FADED }}>Signed</Box>
            <Box style={{ fontFamily: SIGNATURE, fontSize: signatureSize(signature), lineHeight: 1.1, color: INK, paddingLeft: 12, whiteSpace: 'nowrap' }}>
              {signature}
            </Box>
            <Box style={{ height: 2, width: 560, backgroundColor: 'rgba(59, 40, 20, 0.45)', marginTop: -6 }} />
            <Box style={{ marginTop: 8, fontFamily: PRINTED, fontSize: 21, color: PRINT }}>
              {filing.superior ? `Answering to ${filing.superior}` : 'Answering to no superior'}
            </Box>
          </Box>
          <StampSpace request={request} />
        </Box>
      </div>

      {/* Browned where it tore: three soft strokes along the edge, clipped to the sheet so only their inner halves show. */}
      <svg className="scribe-paper__scorch" width={WIDTH} height={fit.height} viewBox={`0 0 ${WIDTH} ${fit.height}`} aria-hidden="true">
        <g clipPath={`url(#${clip})`}>
          {[
            { w: 34, o: 0.08 },
            { w: 18, o: 0.12 },
            { w: 6, o: 0.3 },
          ].map(({ w, o }) => (
            <path key={w} d={edge} fill="none" stroke="#4a2c10" strokeOpacity={o} strokeWidth={w} />
          ))}
        </g>
      </svg>
    </div>
  );
}

// ── Fitting and scaling ─────────────────────────────────────────────────────

/** True once the sheet's three faces have arrived (or could not), so the body can be measured in its own hand. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const fonts = document.fonts;
    void Promise.all([fonts.load(`36px ${HAND}`), fonts.load(`20px ${PRINTED}`), fonts.load(`60px ${SIGNATURE}`)])
      .catch(() => undefined)
      .then(() => fonts.ready)
      .then(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/**
 * A filing's parchment, as wide as its frame. The writing is hidden until the
 * fit has settled, so the reader never watches the body change size.
 */
export function Parchment({ request }: { request: ParchmentRequest }) {
  const key = useMemo(() => JSON.stringify(request), [request]);
  const [fit, setFit] = useState(() => ({ key, index: estimateFit(request), settled: false }));
  if (fit.key !== key) setFit({ key, index: estimateFit(request), settled: false });

  // Zero while the frame is not laid out (a closed dialog, say).
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fontsReady = useFontsReady();
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!fontsReady || scale === 0 || fit.settled || fit.key !== key || !frame.current || !body.current) return;
    // Layout sizes, which the scale does not enter into.
    const overrun = body.current.offsetHeight - frame.current.clientHeight;
    const next = overrun > 0 ? nextFit(fit.index) : null;
    setFit(next === null ? { ...fit, settled: true } : { ...fit, index: next });
  }, [fontsReady, scale, fit, key]);

  const shown = FITS[fit.index]!;
  return (
    <div ref={outer} className="scribe-paper" data-settled={fit.settled || undefined} style={{ aspectRatio: `${WIDTH} / ${shown.height}` }}>
      <div className="scribe-paper__scale" style={{ transform: `scale(${scale})` }}>
        <ParchmentSheet request={request} fit={shown} frameRef={frame} bodyRef={body} />
      </div>
    </div>
  );
}

// The Solar's furniture, drawn: the Clerk Table and Canonreeve's Desk, after
// the Bruma Joint Archives' clerk's trestle and officers' writing box, re-cut
// in the Embassy's lacquer and gold like the room's own pieces (room/art.tsx).
// Flat fills only; depth comes from the CSS beneath.

import type { PinKind } from '../../../../shared/solar';

const EBONY = '#120d08';
const LACQUER = '#2b1b10';
const WOOD = '#4a2c16';
const WOOD_LIGHT = '#6b4020';
const GOLD = '#c9a227';
const GOLD_DIM = '#8a6d1c';
const PARCH = '#e6d6b0';
const PARCH_OLD = '#cdb88c';
const INK = '#4d3b26';
const WAX = '#7c1f24';

/** The Clerk Table: a trestle with the bundle of filings, a candle, the two stamps and the wax. */
export function ClerkTableArt() {
  return (
    <svg viewBox="0 0 230 140" aria-hidden="true" className="solar-art">
      {/* the trestle table */}
      <rect x="4" y="60" width="222" height="14" fill={WOOD_LIGHT} />
      <rect x="4" y="60" width="222" height="1.6" fill={GOLD} />
      <rect x="4" y="74" width="222" height="4" fill={EBONY} />
      <path d="M24 78l-10 60h10l12-60zM206 78l10 60h-10l-12-60z" fill={WOOD} />
      <rect x="20" y="112" width="190" height="6" fill={LACQUER} />
      <rect x="20" y="112" width="190" height="1.2" fill={GOLD_DIM} />
      {/* the bundle of filings awaiting a stamp, tied with red tape */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={22 + i * 2}
          y={50 - i * 5}
          width="66"
          height="9"
          fill={i % 2 ? PARCH_OLD : PARCH}
          transform={`rotate(${i % 2 ? 2.5 : -2.5} 55 ${54 - i * 5})`}
        />
      ))}
      <rect x="52" y="30" width="5" height="30" fill={WAX} />
      {/* a candle in a gold dish */}
      <rect x="100" y="34" width="10" height="26" fill="#efe3c4" />
      <path d="M105 18c5 7 5 12 0 15-5-3-5-8 0-15z" fill="#f5b83a" />
      <rect x="94" y="58" width="22" height="3" fill={GOLD_DIM} />
      {/* the two hand stamps, Denied and Approved: turned knob, neck, block */}
      {(
        [
          [138, '#a01c1c'],
          [168, GOLD],
        ] as const
      ).map(([x, ink]) => (
        <g key={x}>
          <circle cx={x} cy="22" r="6" fill={WOOD} />
          <rect x={x - 2.5} y="27" width="5" height="12" fill={EBONY} />
          <rect x={x - 10} y="39" width="20" height="9" fill={WOOD} />
          <rect x={x - 10} y="48" width="20" height="3" fill={ink} />
        </g>
      ))}
      {/* a stick of sealing wax */}
      <rect x="186" y="50" width="26" height="6" fill={WAX} transform="rotate(-10 199 53)" />
    </svg>
  );
}

/**
 * Canonreeve's Desk: a broad writing desk with drawers, a decree under the
 * Embassy's seal, the register open, books stacked, a quill in its well, and
 * a box of new pieces for the war table.
 */
export function CanonreeveDeskArt() {
  return (
    <svg viewBox="0 0 300 150" aria-hidden="true" className="solar-art">
      {/* the desk */}
      <rect x="6" y="66" width="288" height="12" fill={WOOD_LIGHT} />
      <rect x="6" y="66" width="288" height="1.6" fill={GOLD} />
      <rect x="14" y="78" width="78" height="66" fill={LACQUER} />
      <rect x="208" y="78" width="78" height="66" fill={LACQUER} />
      {[86, 108, 130].map((y) => (
        <g key={y}>
          <rect x="18" y={y} width="70" height="18" fill={WOOD} />
          <rect x="212" y={y} width="70" height="18" fill={WOOD} />
          <rect x="48" y={y + 7} width="10" height="3" fill={GOLD} />
          <rect x="242" y={y + 7} width="10" height="3" fill={GOLD} />
        </g>
      ))}
      <rect x="92" y="78" width="116" height="8" fill={EBONY} />
      <rect x="10" y="144" width="280" height="4" fill={EBONY} />
      {/* books, stacked */}
      <rect x="18" y="52" width="46" height="14" fill="#3a1e1a" />
      <rect x="22" y="40" width="40" height="12" fill="#152a33" />
      <rect x="20" y="30" width="44" height="10" fill="#26331b" />
      <path d="M18 59h46M22 46h40M20 35h44" stroke={GOLD_DIM} strokeWidth="1" />
      {/* the register, open */}
      <path d="M88 64 118 50l32 8 32-8 30 14z" fill={PARCH} />
      <path d="M150 58v6" stroke={INK} strokeWidth="1.2" />
      <path d="M100 60l18-7M104 63l16-6M160 57l20-5M162 61l18-5" stroke={INK} strokeWidth="1.2" opacity=".55" />
      {/* a decree, under the Embassy's seal */}
      <rect x="196" y="40" width="34" height="24" fill={PARCH_OLD} transform="rotate(6 213 52)" />
      <circle cx="216" cy="58" r="5" fill={WAX} />
      <circle cx="216" cy="58" r="2.6" fill="none" stroke={GOLD} strokeWidth=".9" />
      {/* a box of new pieces for the war table */}
      <rect x="240" y="48" width="44" height="18" fill={WOOD} />
      <rect x="240" y="48" width="44" height="3" fill={GOLD_DIM} />
      <path d="M252 46a3 3 0 1 1 0.1 0zM262 46a3 3 0 1 1 0.1 0zM272 46a3 3 0 1 1 0.1 0z" fill={GOLD} />
      {/* the inkwell and quill */}
      <rect x="170" y="54" width="14" height="10" fill="#141210" />
      <path d="M178 54C184 36 196 22 212 12c-5 13-13 28-30 42z" fill="#efe6d2" />
      <path d="M179 54 208 16" stroke="#9a8a6a" strokeWidth="1" />
    </svg>
  );
}

/** A Dominion pawn: a chess pawn in black and gold, with the Dominion's triangle on its collar. */
export function PawnMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 40" width={size * 0.75} height={size} aria-hidden="true" className="pin-mark pin-mark--pawn">
      <ellipse cx="15" cy="37" rx="11" ry="2.6" fill="rgb(0 0 0 / 0.45)" />
      <path d="M5 36c0-4 3-6 5-7l1-9h8l1 9c2 1 5 3 5 7z" fill="#15100a" stroke={GOLD} strokeWidth="1.3" />
      <rect x="8" y="17" width="14" height="3.4" rx="1" fill="#15100a" stroke={GOLD} strokeWidth="1.2" />
      <circle cx="15" cy="10" r="6.6" fill="#15100a" stroke={GOLD} strokeWidth="1.3" />
      <path d="M15 27.5l3 5h-6z" fill={GOLD} />
    </svg>
  );
}

/** A point of interest: a gold pin through a scrap of parchment. */
export function InterestMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 40" width={size * 0.75} height={size} aria-hidden="true" className="pin-mark pin-mark--interest">
      <ellipse cx="15" cy="37.5" rx="6" ry="1.8" fill="rgb(0 0 0 / 0.45)" />
      <path d="M15 37V20" stroke="#3a2a08" strokeWidth="1.6" />
      <path d="M4 9l22-2 1 13-23 2z" fill={PARCH} stroke="#8a6d1c" strokeWidth=".8" />
      <path d="M8 12.5h14M8 16h10" stroke={INK} strokeWidth="1" opacity=".6" />
      <circle cx="15" cy="7.5" r="4" fill="#7c1f24" stroke={GOLD} strokeWidth="1.2" />
    </svg>
  );
}

/** Either piece, by kind. */
export function PinMark({ kind, size = 30 }: { kind: PinKind; size?: number }) {
  return kind === 'pawn' ? <PawnMark size={size} /> : <InterestMark size={size} />;
}

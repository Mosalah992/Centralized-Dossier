// The pieces on the Solar's war table: the Dominion's pawn and the point of
// interest, in the Embassy's lacquer and gold. The Clerk Table and Canonreeve's
// Desk they once shared this file with are pixel sprites now
// (scripts/pixel/solar.mjs).

import type { PinKind } from '../../../../shared/solar';

const GOLD = '#c9a227';
const PARCH = '#e6d6b0';
const INK = '#4d3b26';

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

// Wax stamps, after the Bruma Joint Archives' set. The Dominion presses the
// gold seal that already stands at High Command's door (gate-seal.webp); the
// Imperial and Bruma marks, which a notice copied from the Joint Archives may
// carry, are drawn; a denial is a red cross.

import { useState } from 'react';

import goldSeal from '../../assets/gate-seal.webp';
import type { Stamp as StampKind } from '../../../../shared/room';

export type StampMark = StampKind | 'denied';

const WAX: Record<StampMark, { fill: string; edge: string; ink: string }> = {
  imperial: { fill: '#8e1f1f', edge: '#5e1212', ink: '#e8c7a8' },
  aldmeri: { fill: '#b8902a', edge: '#6e5410', ink: '#3a2a08' },
  bruma: { fill: '#e2b313', edge: '#8a6a06', ink: '#141210' },
  denied: { fill: '#a01c1c', edge: '#5e1212', ink: '#f2dccb' },
};

export const STAMP_NAMES: Record<StampMark, string> = {
  imperial: 'Imperial stamp',
  aldmeri: 'Seal of the Aldmeri Dominion',
  bruma: 'Bruma sigil',
  denied: 'Denied',
};

function Emblem({ mark, ink }: { mark: StampMark; ink: string }) {
  switch (mark) {
    case 'imperial':
      return (
        <g fill={ink}>
          <path d="M50 30l5 8 14-6-6 12 12 2-12 6 4 10-12-4-5 12-5-12-12 4 4-10-12-6 12-2-6-12 14 6z" />
          <rect x="47" y="58" width="6" height="14" />
        </g>
      );
    case 'aldmeri':
      return (
        <g fill="none" stroke={ink} strokeWidth="4" strokeLinejoin="round">
          <path d="M50 28 72 68H28Z" />
          <path d="M34 46c6-6 11-2 16 4 5-6 10-10 16-4" />
        </g>
      );
    case 'bruma':
      return (
        <g fill={ink}>
          <path d="M24 70 42 40l8 10 10-18 16 38Z" />
          <path d="M45 70v-10a5 5 0 0 1 10 0v10Z" fill="none" stroke={ink} strokeWidth="3" />
        </g>
      );
    case 'denied':
      return <path d="M32 32 68 68M68 32 32 68" stroke={ink} strokeWidth="9" strokeLinecap="round" />;
  }
}

export function Stamp({ mark, size = 64, title }: { mark: StampMark; size?: number; title?: string }) {
  const [missing, setMissing] = useState(false);
  if (mark === 'aldmeri' && !missing) {
    return (
      <img
        className="stamp stamp--aldmeri stamp--art"
        src={goldSeal}
        width={size}
        height={size}
        alt={title ?? STAMP_NAMES.aldmeri}
        draggable={false}
        decoding="async"
        onError={() => setMissing(true)}
      />
    );
  }
  const w = WAX[mark];
  return (
    <svg className={`stamp stamp--${mark}`} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? STAMP_NAMES[mark]}>
      <path
        d="M50 4c8 0 10 5 17 7s11 1 14 8 1 11 5 17 7 9 4 16-7 8-8 15-6 11-13 14-9 6-19 6-12-2-19-6-11-6-13-14-6-9-8-15 1-10 4-16 1-11 5-17 6-5 13-8 11-7 18-7z"
        fill={w.edge}
      />
      <circle cx="50" cy="50" r="36" fill={w.fill} />
      <circle cx="50" cy="50" r="30" fill="none" stroke={w.edge} strokeWidth="2" strokeDasharray="3 3" />
      <Emblem mark={mark} ink={w.ink} />
    </svg>
  );
}

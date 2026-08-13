// Line-art marks for the volumes and the Dominion seal. Altmer geometry —
// symmetrical, angular, drawn in gold line rather than filled heraldry, so the
// affiliation is implied rather than stamped everywhere.

import type { VolumeSlug } from '../../../shared/types';

interface Props {
  size?: number;
  className?: string;
}

const frame = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

/** The Dominion seal: a rayed sun over a downturned point. */
export function Seal({ size = 54, className }: Props) {
  return (
    <svg {...frame(size)} className={className}>
      <circle cx="24" cy="20" r="8.5" />
      <circle cx="24" cy="20" r="3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="24"
          y1="20"
          x2="24"
          y2="7.5"
          transform={`rotate(${angle} 24 20)`}
          strokeWidth="0.9"
        />
      ))}
      <path d="M13 32 L24 44 L35 32" />
      <path d="M17 32 L24 39.5 L31 32" strokeWidth="0.8" />
    </svg>
  );
}

const MARKS: Record<VolumeSlug, JSX.Element> = {
  // Ranks stacked under a spear — the muster.
  roster: (
    <>
      <path d="M24 4 L24 44" strokeWidth="1" />
      <path d="M15 13 L24 8 L33 13" />
      <path d="M13 23 L24 17 L35 23" />
      <path d="M11 33 L24 26 L37 33" />
    </>
  ),
  // Tallies rising within a frame.
  statistics: (
    <>
      <path d="M9 38 L39 38" />
      <path d="M9 10 L9 38" />
      <rect x="13" y="27" width="6" height="11" />
      <rect x="21" y="19" width="6" height="19" />
      <rect x="29" y="24" width="6" height="14" />
      <path d="M13 14 L24 8 L35 14" strokeWidth="0.9" />
    </>
  ),
  // A balance.
  ledger: (
    <>
      <path d="M24 9 L24 38" />
      <path d="M12 15 L36 15" />
      <path d="M12 15 L7 26 A5.6 5.6 0 0 0 17 26 Z" />
      <path d="M36 15 L31 26 A5.6 5.6 0 0 0 41 26 Z" />
      <path d="M16 39.5 L32 39.5" />
      <circle cx="24" cy="11" r="2.2" />
    </>
  ),
  // A rayed coin.
  stipends: (
    <>
      <circle cx="24" cy="24" r="10.5" />
      <circle cx="24" cy="24" r="5" />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          x1="24"
          y1="10"
          x2="24"
          y2="5.5"
          transform={`rotate(${angle} 24 24)`}
          strokeWidth="0.9"
        />
      ))}
    </>
  ),
  // A star above laurels.
  honor: (
    <>
      <path d="M24 6 L27.4 17 L38 17 L29.5 23.6 L32.8 34 L24 27.6 L15.2 34 L18.5 23.6 L10 17 L20.6 17 Z" />
      <path d="M13 34 Q24 45 35 34" strokeWidth="0.9" />
      <path d="M17 36 Q24 42 31 36" strokeWidth="0.75" />
    </>
  ),
  // Sun and moon over a ruled grid.
  calendar: (
    <>
      <rect x="8" y="14" width="32" height="28" />
      <path d="M8 23 L40 23" />
      <path d="M18.7 23 L18.7 42 M29.3 23 L29.3 42" strokeWidth="0.8" />
      <path d="M8 32.5 L40 32.5" strokeWidth="0.8" />
      <circle cx="16" cy="8.5" r="3.5" />
      <path d="M35 5.5 A3.6 3.6 0 1 0 35 12.5 A4.6 4.6 0 0 1 35 5.5 Z" />
    </>
  ),
};

export function Insignia({ slug, size = 42, className }: Props & { slug: VolumeSlug }) {
  return (
    <svg {...frame(size)} className={className}>
      {MARKS[slug]}
    </svg>
  );
}

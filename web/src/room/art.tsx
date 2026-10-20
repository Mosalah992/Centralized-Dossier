// Drawn stand-ins for the room's furniture, each inside an ImageSlot so a
// painted piece at web/src/assets/room/{name}.webp replaces it. Ported from the
// Bruma Joint Archives' oak furniture and re-cut for the Embassy: dark
// lacquered wood, gold inlay instead of iron, the Dominion's pointed crests
// instead of Nordic cornices, and the volumes' own leathers on the shelf.
//
// Flat fills only, as in Bruma: depth comes from the CSS beneath (drop
// shadows, the room's light), not from gradients drawn into the art.

import { BINDINGS } from '../theme';

const EBONY = '#120d08';
const LACQUER = '#2b1b10';
const WOOD = '#4a2c16';
const WOOD_LIGHT = '#6b4020';
const SHADOW = '#070504';
const GOLD = '#c9a227';
const GOLD_DIM = '#8a6d1c';
const GOLD_BRIGHT = '#e8cd7a';
const PARCH = '#e6d6b0';
const PARCH_OLD = '#cdb88c';
const INK = '#4d3b26';

/** The leathers of the archive's volumes, then a few unlettered ones. */
const LEATHERS = [
  ...Object.values(BINDINGS).map((b) => b.cover),
  '#2b2216', '#3a1e1a', '#1c1a16', '#2f3a2a', '#4a3418', '#22180f',
];

/** A pointed Altmer crest: the gold cresting along a cabinet's top. */
function Crest({ x, y, w, h = 14 }: { x: number; y: number; w: number; h?: number }) {
  const mid = x + w / 2;
  return (
    <g>
      <path d={`M${x} ${y}L${mid} ${y - h}L${x + w} ${y}Z`} fill={LACQUER} />
      <path d={`M${x + 6} ${y}L${mid} ${y - h + 4}L${x + w - 6} ${y}`} fill="none" stroke={GOLD} strokeWidth="1.6" />
      <circle cx={mid} cy={y - h - 2} r="2.6" fill={GOLD} />
    </g>
  );
}

/**
 * A cabinet of `tiers` shelves, each 76 units tall: four for the short case on
 * narrow walls, five for the tall one that stands floor to arch on a wide wall.
 */
export function BookshelfArt({ tiers = 4, className }: { tiers?: number; className?: string }) {
  // Spines graded by height, tallest at the left.
  const widths = [13, 11, 15, 10, 12, 14, 11, 13, 10, 12, 14, 11];
  const shelves = Array.from({ length: tiers }, (_, i) => 96 + i * 76);
  const plinth = shelves[shelves.length - 1]! + 10;
  const height = plinth + 26;
  const row = (base: number, r: number) => {
    let x = 26;
    return widths.map((w, i) => {
      const h = 58 - ((i * 3 + r * 5) % 14);
      const leather = LEATHERS[(i * 5 + r * 3) % LEATHERS.length]!;
      const g = (
        <g key={i}>
          <rect x={x} y={base - h} width={w} height={h} fill={leather} />
          <rect x={x} y={base - h + 6} width={w} height="1.6" fill={GOLD_DIM} />
          <rect x={x} y={base - 10} width={w} height="1.6" fill={GOLD_DIM} />
          {i % 4 === 1 && <rect x={x + 2} y={base - h + 14} width={w - 4} height="7" fill={GOLD} opacity=".85" />}
        </g>
      );
      x += w + 1;
      return g;
    });
  };
  return (
    <svg viewBox={`0 0 220 ${height}`} className={className} aria-hidden="true">
      <Crest x={20} y={20} w={180} h={16} />
      <rect x="6" y="20" width="208" height="10" fill={WOOD_LIGHT} />
      <rect x="6" y="28" width="208" height="2" fill={GOLD} />
      <rect x="12" y="30" width="196" height={plinth - 28} fill={LACQUER} />
      <rect x="12" y="30" width="10" height={plinth - 28} fill={WOOD} />
      <rect x="198" y="30" width="10" height={plinth - 28} fill={WOOD} />
      <rect x="22" y="36" width="176" height={plinth - 40} fill={SHADOW} />
      {shelves.map((base, r) => (
        <g key={base}>
          {row(base, r)}
          <rect x="20" y={base} width="180" height="7" fill={WOOD_LIGHT} />
          <rect x="20" y={base + 6} width="180" height="1.4" fill={GOLD_DIM} />
        </g>
      ))}
      {/* gold inlay on the stiles */}
      <path d={`M17 40V${plinth - 4}M203 40V${plinth - 4}`} stroke={GOLD_DIM} strokeWidth="1.2" />
      <rect x="6" y={plinth} width="208" height="10" fill={WOOD} />
      <rect x="6" y={plinth} width="208" height="1.6" fill={GOLD} />
      <path d={`M12 ${plinth + 10}h22l-4 14h-14zM186 ${plinth + 10}h22l-4 14h-14z`} fill={EBONY} />
    </svg>
  );
}

/**
 * The notice board. `wide` is the long board that runs along the top of a
 * wall fitted to one screen: the same planks and pent, four more notices.
 */
export function BoardArt({ wide = false, className }: { wide?: boolean; className?: string }) {
  const W = wide ? 540 : 360;
  const notices: [number, number, number, number, number, string][] = [
    [26, 44, 52, 62, -3, PARCH],
    [92, 38, 46, 44, 2, PARCH_OLD],
    [150, 48, 58, 70, -1.5, PARCH],
    [222, 40, 48, 52, 2.5, PARCH],
    [284, 46, 52, 64, -2, PARCH_OLD],
    [96, 92, 50, 48, 3, PARCH],
    [218, 100, 46, 40, -3.5, PARCH_OLD],
    ...(wide
      ? ([
          [352, 40, 50, 58, 2, PARCH],
          [414, 48, 54, 66, -2.5, PARCH_OLD],
          [476, 38, 46, 50, 3, PARCH],
          [356, 106, 46, 40, -2, PARCH_OLD],
        ] as [number, number, number, number, number, string][])
      : []),
  ];
  return (
    <svg viewBox={`0 0 ${W} 170`} className={className} aria-hidden="true">
      {/* a lacquered frame under a gold-edged pent */}
      <path d={`M0 20 ${W / 2} 2l${W / 2} 18v8H0z`} fill={LACQUER} />
      <path d={`M0 20h${W}v8H0z`} fill={WOOD_LIGHT} />
      <path d={`M0 27.5h${W}`} stroke={GOLD} strokeWidth="1.4" />
      <rect x="8" y="28" width={W - 16} height="132" fill={WOOD} />
      {Array.from({ length: Math.floor((W - 16) / 43) }, (_, i) => i + 1).map((i) => (
        <rect key={i} x={8 + i * 43} y="28" width="1.4" height="132" fill={SHADOW} opacity=".7" />
      ))}
      {/* scraps of older notices */}
      <path d="M60 140h18l-3 10h-15z" fill={PARCH_OLD} opacity=".6" />
      <path d="M320 70h16v14l-10-4z" fill={PARCH_OLD} opacity=".55" />
      {wide && <path d="M470 132h20l-3 11h-16z" fill={PARCH_OLD} opacity=".55" />}
      {notices.map(([x, y, w, h, r, c], i) => (
        <g key={i} transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
          <path d={`M${x} ${y}h${w}v${h - 5}l-6 5h-${w - 10}l-4-3z`} fill={c} />
          {i === 2 ? (
            // the wanted poster: a portrait box, then lines
            <>
              <rect x={x + 6} y={y + 7} width={w - 12} height="6" fill={INK} opacity=".8" />
              <rect x={x + 14} y={y + 17} width={w - 28} height="28" fill="none" stroke={INK} strokeWidth="1.4" />
              <circle cx={x + w / 2} cy={y + 28} r="5" fill={INK} opacity=".7" />
              <path d={`M${x + w / 2 - 9} ${y + 45}q9 -12 18 0`} fill={INK} opacity=".7" />
              <rect x={x + 8} y={y + 52} width={w - 16} height="3" fill={INK} opacity=".55" />
            </>
          ) : (
            <>
              <rect x={x + 6} y={y + 9} width={w - 12} height="3" fill={INK} opacity=".6" />
              <rect x={x + 6} y={y + 17} width={w - 16} height="2" fill={INK} opacity=".45" />
              <rect x={x + 6} y={y + 23} width={w - 12} height="2" fill={INK} opacity=".45" />
            </>
          )}
          <rect x={x + w / 2 - 2} y={y + 1} width="4" height="4" fill={GOLD} />
        </g>
      ))}
      {/* the Embassy's gold seal on a decree */}
      <circle cx="246" cy="128" r="5.5" fill={GOLD} />
      <circle cx="246" cy="128" r="3" fill="none" stroke={GOLD_DIM} strokeWidth="1" />
      <rect x="0" y="28" width="9" height="142" fill={LACQUER} />
      <rect x={W - 9} y="28" width="9" height="142" fill={LACQUER} />
      <path d={`M8 160h${W - 16}`} stroke={GOLD} strokeWidth="1.4" />
    </svg>
  );
}

/**
 * The Scroll Rack: an armarium of pigeonholes, each holding tagged rolls, behind
 * two lacquered doors. The doors are separate drawings so the room can swing
 * them open (room.css) when Ancarion lets the reader through.
 */
export function RackInside() {
  return (
    <svg viewBox="0 0 200 260" aria-hidden="true" className="rack__inside">
      <rect x="0" y="0" width="200" height="260" fill={EBONY} />
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 2 }, (_, c) => {
          const x = 10 + c * 92;
          const y = 10 + r * 61;
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width="88" height="56" fill={SHADOW} />
              <rect x={x} y={y} width="88" height="56" fill="none" stroke={GOLD_DIM} strokeWidth="1.4" />
              {[0, 1, 2, 3, 4].map((k) => (
                <g key={k}>
                  <circle cx={x + 12 + k * 16} cy={y + 40 - (k % 2) * 13} r="7" fill={k % 2 ? PARCH_OLD : PARCH} />
                  <circle cx={x + 12 + k * 16} cy={y + 40 - (k % 2) * 13} r="2.4" fill={INK} opacity=".4" />
                </g>
              ))}
              <path d={`M${x + 20} ${y + 47}l4 8`} stroke="#7c1f24" strokeWidth="1.4" />
            </g>
          );
        }),
      )}
    </svg>
  );
}

export function RackDoor({ side }: { side: 'l' | 'r' }) {
  // Drawn as the left door; the right is its mirror.
  return (
    <svg viewBox="0 0 100 260" aria-hidden="true" className={`rack__door rack__door--${side}`} preserveAspectRatio="none">
      <g transform={side === 'r' ? 'translate(100 0) scale(-1 1)' : undefined}>
        <rect x="0" y="0" width="100" height="260" fill={WOOD} />
        <rect x="0" y="0" width="100" height="260" fill="none" stroke={LACQUER} strokeWidth="6" />
        {[0, 1].map((p) => (
          <g key={p}>
            <rect x="14" y={18 + p * 120} width="72" height="104" fill={LACQUER} />
            <rect x="18" y={22 + p * 120} width="64" height="96" fill="none" stroke={GOLD} strokeWidth="1.3" />
            <path d={`M50 ${36 + p * 120}l14 34-14 34-14-34z`} fill="none" stroke={GOLD_DIM} strokeWidth="1.2" />
          </g>
        ))}
        {/* gold strap hinges on the outer edge */}
        {[40, 220].map((y) => (
          <path key={y} d={`M0 ${y}h30l5 3-5 3H0z`} fill={GOLD_DIM} />
        ))}
        {/* half of the lock plate, on the meeting stile */}
        <rect x="88" y="112" width="12" height="36" fill={GOLD} />
        <circle cx="96" cy="126" r="2.4" fill={SHADOW} />
      </g>
    </svg>
  );
}

export function RackCornice() {
  return (
    <svg viewBox="0 0 220 34" aria-hidden="true" className="rack__cornice" preserveAspectRatio="none">
      <Crest x={20} y={22} w={180} h={14} />
      <rect x="0" y="22" width="220" height="10" fill={WOOD_LIGHT} />
      <rect x="0" y="30" width="220" height="2" fill={GOLD} />
    </svg>
  );
}

export function LecternArt() {
  return (
    <svg viewBox="0 0 260 260" aria-hidden="true">
      {/* cross feet */}
      <path d="M66 246h128l-10 9H76z" fill={EBONY} />
      <rect x="112" y="236" width="36" height="12" fill={WOOD} />
      {/* turned post, banded in gold */}
      <rect x="120" y="128" width="20" height="110" fill={WOOD} />
      <rect x="114" y="150" width="32" height="7" fill={WOOD_LIGHT} />
      <rect x="114" y="156" width="32" height="1.4" fill={GOLD} />
      <rect x="114" y="206" width="32" height="7" fill={WOOD_LIGHT} />
      <rect x="114" y="212" width="32" height="1.4" fill={GOLD} />
      <rect x="116" y="178" width="28" height="6" fill={LACQUER} />
      {/* sloped desk with a book ledge */}
      <path d="M22 116 128 70l110 46-6 14H28z" fill={WOOD_LIGHT} />
      <path d="M28 130h204v8H28z" fill={LACQUER} />
      <path d="M22 116h216v6H22z" fill={WOOD} />
      <path d="M22 116 128 70l110 46" fill="none" stroke={GOLD} strokeWidth="1.6" />
      {/* the register, open, and its gold ribbon */}
      <path d="M40 112 124 78l2 36H44z" fill={PARCH} />
      <path d="M56 104 114 82M58 110 118 88" stroke={INK} strokeWidth="2" opacity=".55" />
      <path d="M62 114 104 98" stroke={INK} strokeWidth="2" opacity=".4" />
      <path d="M96 108v24" stroke={GOLD} strokeWidth="2.4" />
      {/* inkwell and quill */}
      <rect x="168" y="92" width="28" height="22" fill="#141210" />
      <rect x="174" y="86" width="16" height="8" fill={GOLD_DIM} />
      <path d="M184 90C194 62 212 38 238 20c-8 20-22 46-50 72z" fill="#efe6d2" />
      <path d="M186 90 234 24" stroke="#9a8a6a" strokeWidth="1.2" />
      <path d="M200 66l-8-2M206 56l-8-2M212 46l-8-2" stroke="#9a8a6a" strokeWidth="1" />
    </svg>
  );
}

/** A signpost at the room's edge, its board pointing west. */
export function SignpostArt() {
  return (
    <svg viewBox="0 0 200 240" aria-hidden="true">
      <rect x="112" y="40" width="12" height="196" fill={WOOD} />
      <rect x="112" y="40" width="3" height="196" fill={WOOD_LIGHT} />
      <path d="M100 236h36l-4-8h-28z" fill={EBONY} />
      <circle cx="118" cy="34" r="6" fill={GOLD} />
      {/* the board, an arrow pointing left */}
      <path d="M16 92 44 64h140v56H44z" fill={WOOD_LIGHT} />
      <path d="M22 92 46 70h132v44H46z" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="118" cy="92" r="3" fill={GOLD_DIM} />
    </svg>
  );
}

/** A fleuron for title pages and notes. Drawn, so it never falls back to an emoji. */
export function Fleuron({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 24" width={size * 1.6} height={size} aria-hidden="true" className="fleuron">
      <path d="M20 4c-4 6-10 8-16 6 4 3 10 4 14 1-2 4-1 8 2 11 3-3 4-7 2-11 4 3 10 2 14-1-6 2-12 0-16-6z" fill="currentColor" />
    </svg>
  );
}

export { GOLD, GOLD_BRIGHT };

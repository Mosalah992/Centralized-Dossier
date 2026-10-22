// Summerset boughs: a golden-leaved branch reaching in over each top corner of
// the room, framing the Embassy's name, as the First Emissary drew them
// (2026-10-22). Decoration only: hidden from assistive technology, never in
// the way of a click, behind every object on the wall. The twigs sway a
// little, as if in a draught from the arches; not for readers who ask for
// less motion (room.css).
//
// One bough is drawn; the right-hand one is its mirror.

type Point = readonly [number, number];
type Curve = readonly [Point, Point, Point, Point];

function at([p0, p1, p2, p3]: Curve, t: number) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const d = ([p0, p1, p2, p3]: Curve) => `M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;

/** The bough, from the corner across the top of the wall and down. */
const MAIN: Curve = [[-12, 14], [150, -4], [330, 26], [560, 150]];
/** Twigs hanging from it, each swaying on its own. */
const TWIGS: Curve[] = [
  [[96, 8], [118, 40], [128, 70], [116, 104]],
  [[214, 10], [250, 44], [266, 80], [252, 124]],
  [[330, 34], [372, 62], [394, 104], [382, 150]],
  [[446, 84], [480, 112], [494, 150], [484, 196]],
  [[170, 4], [214, -12], [262, -10], [300, 6]],
];

/** An almond leaf, 14 long, pointing along +x from its stalk. */
const LEAF = 'M0 0C3.2-4.4 9-4.8 14 0C9 4.8 3.2 4.4 0 0Z';
const GOLDS = ['#e8c25a', '#d4a83a', '#f0d27a', '#a57c1b', '#c99a2e'];

/** A repeatable scatter, so the bough is the same at every visit. */
const jitter = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

type Leaf = { x: number; y: number; angle: number; scale: number; fill: string };

function leavesAlong(curve: Curve, seed: number, from: number, step: number, hang: number): Leaf[] {
  const out: Leaf[] = [];
  let i = 0;
  for (let t = from; t <= 1.0001; t += step, i++) {
    const p = at(curve, Math.min(t, 1));
    const side = i % 2 ? 1 : -1;
    const r = jitter(seed + i);
    out.push({
      x: p.x,
      y: p.y,
      angle: p.angle + side * (38 + r * 32) + hang,
      scale: 1 + jitter(seed + i + 50) * 0.7,
      fill: GOLDS[(seed + i) % GOLDS.length]!,
    });
  }
  // A cluster at the tip.
  const tip = at(curve, 1);
  for (let k = 0; k < 5; k++) {
    out.push({
      x: tip.x,
      y: tip.y,
      angle: tip.angle - 70 + k * 35 + jitter(seed + 90 + k) * 12,
      scale: 1.1 + jitter(seed + 70 + k) * 0.6,
      fill: GOLDS[(seed + k + 2) % GOLDS.length]!,
    });
  }
  return out;
}

const MAIN_LEAVES = leavesAlong(MAIN, 1, 0.1, 0.05, 20);
const TWIG_LEAVES = TWIGS.map((twig, n) => leavesAlong(twig, 11 * (n + 2), 0.25, 0.14, 25));

function LeafSet({ leaves }: { leaves: Leaf[] }) {
  return (
    <>
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(1)}) scale(${l.scale.toFixed(2)})`}>
          <path d={LEAF} fill={l.fill} />
          <path d="M1 0H12.5" stroke="#6b4a10" strokeWidth=".55" opacity=".55" />
        </g>
      ))}
    </>
  );
}

function Bough({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`bough bough--${side}`} viewBox="0 0 600 260" aria-hidden="true" focusable="false">
      {/* The wood, dark, with a thread of gold along it. */}
      <g className="bough__wood" fill="none" strokeLinecap="round">
        <path d={d(MAIN)} stroke="#1c120a" strokeWidth="9" />
        <path d={d(MAIN)} stroke="#4a2c16" strokeWidth="3.2" />
        <path d={d(MAIN)} stroke="#c9a227" strokeWidth=".9" opacity=".55" />
      </g>
      <LeafSet leaves={MAIN_LEAVES} />
      {TWIGS.map((twig, n) => (
        <g
          key={n}
          className="bough__sway"
          style={{ transformOrigin: `${twig[0][0]}px ${twig[0][1]}px`, animationDelay: `${-n * 1.7}s` }}
        >
          <path d={d(twig)} fill="none" stroke="#1c120a" strokeWidth="3.6" strokeLinecap="round" />
          <LeafSet leaves={TWIG_LEAVES[n]!} />
        </g>
      ))}
    </svg>
  );
}

export function Boughs() {
  return (
    <div className="boughs" aria-hidden="true">
      <Bough side="left" />
      <Bough side="right" />
    </div>
  );
}

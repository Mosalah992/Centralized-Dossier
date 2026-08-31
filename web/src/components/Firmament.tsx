// The Firmament: the thirteen signs, in three dimensions.
//
// WHY DEPTH IS HONEST HERE and not a gimmick. A constellation is not an object.
// It is a pattern that exists from one viewpoint only — stars at wildly
// different distances, which happen to line up when seen from Nirn. Drawing the
// asterism flat says the opposite: that the Warrior is a shape. Giving the
// stars depth and drifting the view a few degrees says the true thing, because
// the pattern visibly loosens as the view moves and closes again as it returns.
//
// The depths themselves are a drawing device and nothing is claimed by them: no
// source gives distances to these stars. They are derived from each star's own
// coordinates by a fixed hash, so a sign looks the same every time it is opened
// rather than shuffling on each visit — the same reason the wood texture's
// phases are hard-coded.
//
// THE PROJECTION IS DONE IN JS, NOT IN CSS 3D. CSS can rotate a box in space
// but it cannot draw a line between two points that are both moving in it, and
// the asterism is mostly lines. So the rotation and the perspective divide are
// arithmetic here, written into ordinary SVG attributes each frame — which also
// keeps the whole thing in the engraved language the rest of the archive uses,
// rather than turning into a stack of transformed divs.

import { useEffect, useMemo, useRef, useState } from 'react';

import { animate, createTimer, stagger, utils } from 'animejs';

import { CONSTELLATIONS, type Constellation, standing } from '../../../shared/constellations';
import { reckon } from '../../../shared/reckoning';

import { Astrolabe } from './Astrolabe';

/** Focal length for the perspective divide. Larger is a flatter, longer lens. */
const FOCAL = 260;
/** How far the view swings either side of straight on, in degrees. */
const SWING = 26;
/** How far it nods, which is much less — a sky tips less than it turns. */
const NOD = 9;
/** One full there-and-back of the view, in ms. */
const DRIFT_MS = 26_000;

/**
 * A star's depth, from its own position.
 *
 * Deterministic on purpose. A random z would mean the Warrior looked different
 * every time a reader opened it, which for a chart is close to lying.
 */
function depthOf(x: number, y: number, i: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + i * 37.719) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 64;
}

export function Firmament() {
  const season = useMemo(() => {
    const month = reckon().monthIndex;
    return Math.max(0, CONSTELLATIONS.findIndex((c) => c.monthIndex === month));
  }, []);

  const [chosen, setChosen] = useState(season);
  const sign: Constellation = CONSTELLATIONS[chosen]!;

  const stage = useRef<SVGSVGElement>(null);
  /*
   * Where the reader has pushed the view, -1..1 on each axis.
   *
   * A ref rather than state: it is written on every pointer move and read on
   * every frame, and neither of those wants a React render.
   */
  const nudge = useRef({ x: 0, y: 0 });

  /** The star field with its depths, recomputed only when the sign changes. */
  const points = useMemo(
    () => sign.stars.map(([x, y], i) => ({ x: x - 50, y: y - 50, z: depthOf(x, y, i) })),
    [sign],
  );

  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;

    const stars = Array.from(el.querySelectorAll<SVGCircleElement>('.firm-star'));
    const joins = Array.from(el.querySelectorAll<SVGLineElement>('.firm-join'));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still) {
      utils.set([...stars, ...joins], { opacity: 1 });
    } else {
      // The sign arrives: stars first, then the lines drawn between them. Only
      // opacity — position belongs to the projection below and the two must not
      // both write it.
      animate(stars, { opacity: [0, 1], duration: 520, ease: 'outQuad', delay: stagger(48) });
      animate(joins, {
        opacity: [0, 1],
        duration: 620,
        ease: 'inOutQuad',
        delay: stagger(55, { start: 260 }),
      });
    }

    const started = performance.now();

    const project = (p: { x: number; y: number; z: number }, yaw: number, pitch: number) => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      // Yaw about the vertical, then nod about the horizontal.
      const x1 = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const y1 = p.y * cp - z1 * sp;
      const z2 = p.y * sp + z1 * cp;
      const scale = FOCAL / (FOCAL + z2);
      return { x: 50 + x1 * scale, y: 50 + y1 * scale, scale };
    };

    const timer = createTimer({
      duration: Infinity,
      onUpdate: () => {
        /*
         * The view drifts, and the reader can push it.
         *
         * A sine rather than a spin: a constellation turned all the way round
         * is unreadable for half of every revolution, and this is a chart
         * before it is an ornament. Twenty-six degrees is enough to show that
         * the stars are not on one plane and not enough to lose the shape.
         *
         * It is NOT driven by the in-world clock, unlike the astrolabe beside
         * it. This is a viewpoint, not a reading, and dressing it up as one
         * would be claiming the sky turns at a rate the archive knows.
         */
        const t = still ? 0 : ((performance.now() - started) % DRIFT_MS) / DRIFT_MS;
        const yaw = ((Math.sin(t * Math.PI * 2) * SWING + nudge.current.x * 16) * Math.PI) / 180;
        const pitch = ((Math.cos(t * Math.PI * 2) * NOD + nudge.current.y * 10) * Math.PI) / 180;

        const flat = points.map((p) => project(p, yaw, pitch));

        for (let i = 0; i < stars.length; i++) {
          const f = flat[i];
          const node = stars[i];
          if (!f || !node) continue;
          node.setAttribute('cx', f.x.toFixed(2));
          node.setAttribute('cy', f.y.toFixed(2));
          // Nearer stars are larger and brighter, which is the depth cue that
          // actually reads at this size — the perspective divide alone is far
          // too subtle across sixty units of z.
          node.setAttribute('r', ((i === 0 ? 1.9 : 1.35) * f.scale).toFixed(2));
          node.style.opacity = String(Math.min(1, 0.42 + (f.scale - 0.8) * 2.1));
        }

        for (let i = 0; i < joins.length; i++) {
          const pair = sign.lines[i];
          const node = joins[i];
          if (!pair || !node) continue;
          const a = flat[pair[0]];
          const b = flat[pair[1]];
          if (!a || !b) continue;
          node.setAttribute('x1', a.x.toFixed(2));
          node.setAttribute('y1', a.y.toFixed(2));
          node.setAttribute('x2', b.x.toFixed(2));
          node.setAttribute('y2', b.y.toFixed(2));
        }
      },
    });

    return () => {
      timer.pause();
      utils.remove([...stars, ...joins]);
    };
  }, [points, sign]);

  return (
    <section className="firmament" aria-label="The Firmament">
      <div className="firmament__body">
        {/* The instrument keeps the hour. Its own asterism is off: the sky is
            the whole right-hand side of this plate now, and an object that
            repeats the thing beside it is the same reading twice. */}
        <div className="firmament__instrument">
          <Astrolabe size={230} legend={false} asterism={false} />
        </div>

        <div
          className="firmament__stage"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            nudge.current = {
              x: ((e.clientX - r.left) / r.width - 0.5) * 2,
              y: ((e.clientY - r.top) / r.height - 0.5) * 2,
            };
          }}
          onPointerLeave={() => { nudge.current = { x: 0, y: 0 }; }}
        >
          <svg
            ref={stage}
            viewBox="0 0 100 100"
            className="firmament__field"
            role="img"
            aria-label={`The sign of ${sign.name}, drawn in the round`}
          >
            {sign.lines.map((pair, i) => (
              <line key={`${sign.name}-l-${i}`} className="firm-join" x1="50" y1="50" x2="50" y2="50" />
            ))}
            {sign.stars.map((_, i) => (
              <circle key={`${sign.name}-s-${i}`} className="firm-star" cx="50" cy="50" r="1" />
            ))}
          </svg>

          <div className="firmament__reading">
            <p className="firmament__name">{sign.name}</p>
            <p className="firmament__standing">{standing(sign)}</p>
            <p className="firmament__born">{sign.born}</p>
          </div>
        </div>
      </div>

      {/* The thirteen, along the foot — the sign in season carries a mark. */}
      <nav className="firmament__signs" aria-label="The thirteen signs">
        {CONSTELLATIONS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`firmament__sign${i === chosen ? ' is-chosen' : ''}${i === season ? ' is-season' : ''}`}
            aria-pressed={i === chosen}
            onClick={() => setChosen(i)}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <p className="firmament__note">
        The stars of a sign do not stand together; they stand in a line from
        Nirn, and nowhere else. The chart is turned a little either way so that
        this can be seen — the depths are the draughtsman's, not the Firmament's,
        and no distance is recorded here.
      </p>
    </section>
  );
}

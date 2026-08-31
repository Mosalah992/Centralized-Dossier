// The Wheel of Mundus.
//
// A geocentric orrery — Nirn at the middle, everything else around it — which
// is not a drawing convenience but the arrangement itself.
//
// THREE BODIES MOVE AND EIGHT DO NOT, and that asymmetry is the point rather
// than an unfinished job. Masser and Secunda have written periods and the sun
// has a stated relationship to Masser; the eight Divine planets have neither,
// so they are drawn where they stand and left there. shared/mundus.ts carries
// the sources and the disagreements between them. An orrery that spun all
// eleven at speeds chosen to look right would be asserting eight numbers this
// archive has no business asserting.
//
// It is the astrolabe's sibling and deliberately looks it: same night ground,
// same foil, same rubric at the centre of things. The astrolabe answers "what
// hour is it"; this answers "what is the sky doing".
//
// anime.js drives it, as it drives the astrolabe, and for the same reason it
// may: both live inside the calendar's already-lazy view, so the library that
// is too heavy for the gate chunk costs this page nothing it was not already
// paying. test/bundle.test.ts holds that line.

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { animate, createTimer, stagger, utils } from 'animejs';

import { constellationOf } from '../../../shared/constellations';
import { DIVINE_PLANETS, conjunction, phases, revolutions } from '../../../shared/mundus';
import { MONTH_LENGTHS, reckon } from '../../../shared/reckoning';

/** The rings the eight stand on, innermost first. Spacing is drawing, not distance. */
const RING_INNER = 18;
const RING_STEP = 2.5;

const R_SECUNDA = 9.5;
const R_MASSER = 14.2;
const R_MAGNUS = 40.5;
const R_RIM = 45;

const TAU = Math.PI * 2;
const on = (r: number, turn: number) => [50 + Math.sin(turn * TAU) * r, 50 - Math.cos(turn * TAU) * r] as const;

/*
 * No size prop. The wheel fills the plate it is given — orrery.css sets the
 * width and the viewBox does the rest — so a number here would be a second
 * place to change it and a chance for the two to disagree.
 */
export function Orrery() {
  const root = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/:/g, '');

  /*
   * The legend is React state on a slow tick; the wheel itself is not.
   *
   * Phase names change once every three in-world days and re-rendering for them
   * is free. The bodies move every frame and must never go through React — the
   * same split the sandglass settled on, and for the same reason.
   */
  const [reading, setReading] = useState(() => ({ ...phases(), close: conjunction() }));
  useEffect(() => {
    const id = window.setInterval(() => setReading({ ...phases(), close: conjunction() }), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const month = useMemo(() => reckon().monthIndex, []);
  const sign = useMemo(() => constellationOf(month), [month]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = (sel: string) => Array.from(el.querySelectorAll(sel));

    if (still) {
      utils.set(q('.wheel-ring, .wheel-planet, .wheel-tick'), { opacity: 1, scale: 1 });
    } else {
      // The rings are drawn first, outward, then the eight settle onto them.
      animate(q('.wheel-ring'), {
        opacity: [0, 1],
        scale: [0.6, 1],
        duration: 900,
        ease: 'outQuad',
        delay: stagger(60),
      });
      animate(q('.wheel-planet'), {
        opacity: [0, 1],
        scale: [0, 1],
        duration: 700,
        ease: 'outCubic',
        delay: stagger(55, { start: 500 }),
      });
      animate(q('.wheel-tick'), {
        opacity: [0, 1],
        duration: 600,
        ease: 'outQuad',
        delay: stagger(30, { start: 300, from: 'center' }),
      });
    }

    /*
     * The three that move.
     *
     * Position is written as a transform on a group whose child sits at the
     * ring's radius, so the body's own drawing — the phase terminator, the
     * craters — never rotates with the orbit. A moon that spins as it goes
     * round is a moon drawn by somebody who did not look at one.
     */
    const arm = (sel: string) => el.querySelector(sel) as SVGGElement | null;
    const masser = arm('.wheel-arm--masser');
    const secunda = arm('.wheel-arm--secunda');
    const magnus = arm('.wheel-arm--magnus');
    const masserShade = el.querySelector('.wheel-shade--masser') as SVGCircleElement | null;
    const secundaShade = el.querySelector('.wheel-shade--secunda') as SVGCircleElement | null;

    const timer = createTimer({
      duration: Infinity,
      onUpdate: () => {
        const turn = revolutions();
        if (masser) utils.set(masser, { rotate: turn.masser * 360 });
        if (secunda) utils.set(secunda, { rotate: turn.secunda * 360 });
        if (magnus) utils.set(magnus, { rotate: turn.magnus * 360 });

        /*
         * The phase, as a shadow disc slid across the moon.
         *
         * Crude next to a real terminator, and right for this: the archive
         * draws in engraved line, and a soft photographic terminator would be
         * the one thing on the page rendered in a different hand.
         *
         * THE OFFSET IS NOT LINEAR IN THE PHASE, which is what the first
         * version got wrong — it slid the shadow evenly from one side to the
         * other, which puts the shadow dead centre at fraction 0.5 and draws a
         * BLACK disc at exactly the moment the legend says "Full".
         *
         * The shadow is the same size as the moon, so what matters is how far
         * its centre stands from the moon's: zero covers the moon completely
         * (new), and two radii clears it entirely (full). Waxing and waning are
         * the same distances approached from opposite sides, which is what the
         * sign change at half a cycle is.
         */
        const p = phases();
        const shadeAt = (fraction: number, r: number) =>
          fraction <= 0.5 ? -4 * r * fraction : 4 * r * (1 - fraction);
        if (masserShade) masserShade.setAttribute('cx', String(shadeAt(p.masser.fraction, 3.6)));
        if (secundaShade) secundaShade.setAttribute('cx', String(shadeAt(p.secunda.fraction, 2.35)));
      },
    });

    return () => {
      timer.pause();
      utils.remove(el.querySelectorAll('*'));
    };
  }, []);

  return (
    <figure className="wheel">
      <svg
        ref={root}
        viewBox="0 0 100 100"
        className="wheel__face"
        role="img"
        aria-label="A wheel of Mundus: Nirn at the centre, the two moons, the sun, and the eight planets of the Divines"
      >
        <defs>
          <radialGradient id={`wheel-night-${gid}`} cx="50%" cy="42%">
            <stop offset="0%" stopColor="#1c1b26" />
            <stop offset="70%" stopColor="#0c0b12" />
            <stop offset="100%" stopColor="#07060a" />
          </radialGradient>
          {/* Each moon is clipped to its own disc, so the shadow that gives it a
              phase cannot spill onto the sky beside it. */}
          <clipPath id={`clip-masser-${gid}`}><circle cx="0" cy="0" r="3.6" /></clipPath>
          <clipPath id={`clip-secunda-${gid}`}><circle cx="0" cy="0" r="2.35" /></clipPath>
        </defs>

        <circle className="wheel-field" cx="50" cy="50" r={R_RIM + 2.5} fill={`url(#wheel-night-${gid})`} />

        {/* The rim, and the twelve months around it. The month in season is lit
            — the one place this wheel says what time of year it is. */}
        <circle className="wheel-rim" cx="50" cy="50" r={R_RIM} />
        {MONTH_LENGTHS.map((_, i) => {
          const t = i / 12;
          const [x1, y1] = on(R_RIM - 2.4, t);
          const [x2, y2] = on(R_RIM, t);
          return (
            <line
              key={i}
              className={`wheel-tick${i + 1 === month ? ' wheel-tick--season' : ''}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
            />
          );
        })}

        {/* The eight, on their rings, standing still. */}
        {DIVINE_PLANETS.map((planet, i) => {
          const r = RING_INNER + i * RING_STEP;
          const [x, y] = on(r, i / DIVINE_PLANETS.length);
          return (
            <g key={planet.name}>
              {/* Each ring's dashes are offset from its neighbour's, or all
                  eight line up radially and the rings stop reading as rings —
                  they become one starburst hatching the whole field. */}
              <circle className="wheel-ring" cx="50" cy="50" r={r} strokeDashoffset={i * 1.7} />
              <circle className="wheel-planet" cx={x} cy={y} r={1.15}
                style={{ transformOrigin: `${x}px ${y}px` }}>
                <title>{`${planet.name}, of ${planet.of}`}</title>
              </circle>
            </g>
          );
        })}

        {/* Magnus, on the outermost ring, opposite Masser. */}
        <circle className="wheel-ring wheel-ring--sun" cx="50" cy="50" r={R_MAGNUS} />
        <g className="wheel-arm wheel-arm--magnus" style={{ transformOrigin: '50px 50px' }}>
          <g transform={`translate(50 ${50 - R_MAGNUS})`}>
            <circle className="wheel-sun" r="2.6" />
            <circle className="wheel-sun-halo" r="4.4" />
          </g>
        </g>

        {/* The two moons. Masser is the larger and ruddy; Secunda the small pale
            one — as they hang over Skyrim. */}
        <circle className="wheel-ring wheel-ring--moon" cx="50" cy="50" r={R_MASSER} />
        <g className="wheel-arm wheel-arm--masser" style={{ transformOrigin: '50px 50px' }}>
          <g transform={`translate(50 ${50 - R_MASSER})`}>
            <circle className="wheel-moon wheel-moon--masser" r="3.6" />
            <g clipPath={`url(#clip-masser-${gid})`}>
              <circle className="wheel-shade wheel-shade--masser" cx="-6.4" cy="0" r="3.6" />
            </g>
            <circle className="wheel-moon-rim" r="3.6" />
          </g>
        </g>

        <circle className="wheel-ring wheel-ring--moon" cx="50" cy="50" r={R_SECUNDA} />
        <g className="wheel-arm wheel-arm--secunda" style={{ transformOrigin: '50px 50px' }}>
          <g transform={`translate(50 ${50 - R_SECUNDA})`}>
            <circle className="wheel-moon wheel-moon--secunda" r="2.35" />
            <g clipPath={`url(#clip-secunda-${gid})`}>
              <circle className="wheel-shade wheel-shade--secunda" cx="-4.2" cy="0" r="2.35" />
            </g>
            <circle className="wheel-moon-rim" r="2.35" />
          </g>
        </g>

        {/* Nirn. The rubric at the centre, as on the astrolabe. */}
        <circle className="wheel-nirn" cx="50" cy="50" r="4.2" />
        <circle className="wheel-nirn-rim" cx="50" cy="50" r="4.2" />
      </svg>

      <figcaption className="wheel__legend">
        <p className="wheel__title">The Wheel of Mundus</p>
        <dl className="wheel__readings">
          <div>
            <dt>Masser</dt>
            <dd>{reading.masser.name}</dd>
          </div>
          <div>
            <dt>Secunda</dt>
            <dd>{reading.secunda.name}</dd>
          </div>
          <div>
            <dt>The moons</dt>
            <dd>{reading.close > 0.94 ? 'In conjunction' : 'Apart'}</dd>
          </div>
          {sign && (
            <div>
              <dt>The season</dt>
              <dd>{sign.name}</dd>
            </div>
          )}
        </dl>
        {/*
          * THE NOTE IS NOT DECORATION. The eight are held still because nobody
          * recorded how they move, and a reader looking at a wheel where three
          * bodies turn and eight do not is owed the reason on the page rather
          * than in a source comment.
          */}
        <p className="wheel__note">
          Masser and Secunda keep their reckoned courses, and Magnus stands
          opposite Masser as it is written. The eight planets of the Divines are
          set where they are held to stand; the Embassy has no reckoning of their
          courses and does not invent one.
        </p>
      </figcaption>
    </figure>
  );
}

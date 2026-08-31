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
// It is the Firmament's sibling and deliberately looks it: same night ground,
// same foil, same rubric at the centre of things. The Firmament answers "what
// does the sign look like"; this answers "what is the sky doing".
//
// anime.js drives it, as it drives the Firmament, and for the same reason it
// may: both live inside the calendar's already-lazy view, so the library that
// is too heavy for the gate chunk costs this page nothing it was not already
// paying. test/bundle.test.ts holds that line.

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { animate, createTimer, stagger, utils } from 'animejs';

import { constellationOf } from '../../../shared/constellations';
import { DIVINE_PLANETS, conjunction, phases, revolutions } from '../../../shared/mundus';
import { MONTH_LENGTHS, reckon } from '../../../shared/reckoning';

import amberUrl from '../assets/mundus/amber.webp';
import ashUrl from '../assets/mundus/ash.webp';
import azureUrl from '../assets/mundus/azure.webp';
import cinderUrl from '../assets/mundus/cinder.webp';
import magnusUrl from '../assets/mundus/magnus.webp';
import masserUrl from '../assets/mundus/masser.webp';
import nirnUrl from '../assets/mundus/nirn.webp';
import paleUrl from '../assets/mundus/pale.webp';
import roseUrl from '../assets/mundus/rose.webp';
import rustUrl from '../assets/mundus/rust.webp';
import secundaUrl from '../assets/mundus/secunda.webp';
import verdantUrl from '../assets/mundus/verdant.webp';

/*
 * WHICH SPHERE STANDS FOR WHICH DIVINE IS A CONVENTION, exactly as the
 * alphabetical ring order is, and for the same reason: nothing records what any
 * of them looks like. The list is fixed here so the wheel is the same wheel
 * every time it is opened, and ordered so that no two neighbouring rings carry
 * bodies that read alike.
 *
 * `azure` and `amber` are `pale` and `rust` turned in hue — the supplied sheet
 * held ten bodies and the wheel needs twelve. scripts/prepare-orrery.mjs makes
 * them and says so.
 */
const DIVINE_SPRITES: Record<string, string> = {
  Akatosh: rustUrl,
  Arkay: verdantUrl,
  Dibella: roseUrl,
  Julianos: ashUrl,
  Kynareth: azureUrl,
  Mara: paleUrl,
  Stendarr: cinderUrl,
  Zenithar: amberUrl,
};

/** The rings the eight stand on, innermost first. Spacing is drawing, not distance. */
const RING_INNER = 16;
const RING_STEP = 3.1;

const R_SECUNDA = 9.5;
const R_MASSER = 14.2;
const R_MAGNUS = 42;
const R_RIM = 45;

const TAU = Math.PI * 2;

/*
 * THE WHEEL IS TILTED, which is the difference between a diagram of the system
 * and a view of it.
 *
 * Drawn face-on, every orbit is a circle and every body slides around a flat
 * disc: it reads as a chart of where things are. Tilted, the orbits become
 * ellipses, the bodies pass in front of Nirn and behind it, and the far side of
 * each ring sits visibly further away — which is what makes it a system.
 *
 * Fifty-four degrees off face-on. This was tried at sixty-two first and the
 * eight rings, squashed to under half their height, closed up into a band of
 * hatching in the middle of the field — the tilt cost exactly the thing the
 * rings were there to show. Flatter still and they collapse completely;
 * squarer and it barely reads as tilted at all.
 *
 * The tilt is FIXED and does not drift. It is a viewpoint rather than a
 * reading, and this wheel's whole discipline is that what moves on it is what
 * the archive can source — so the viewpoint stays put and only the three bodies
 * with written courses move.
 */
const TILT = (54 * Math.PI) / 180;
const COS_TILT = Math.cos(TILT);
const SIN_TILT = Math.sin(TILT);
/** Focal length for the perspective divide. Larger is a longer, flatter lens. */
const FOCAL = 300;

/**
 * A point on the wheel's own plane, projected to the page.
 *
 * `depth` is positive on the far side, which is what dims a body when it goes
 * round the back, and `scale` is the perspective divide that makes the near
 * half of every ring larger than the far half.
 */
function project(x: number, y: number) {
  const depth = -y * SIN_TILT;
  const scale = FOCAL / (FOCAL + depth);
  return { x: 50 + x * scale, y: 50 + y * COS_TILT * scale, scale, depth };
}

/** A body's place on its ring, at `turn` of a revolution. */
function on(r: number, turn: number) {
  return project(Math.sin(turn * TAU) * r, -Math.cos(turn * TAU) * r);
}

/**
 * One ring, as a closed path.
 *
 * Sampled rather than drawn as an <ellipse>, because under perspective the
 * projection of a circle is not quite an ellipse — the near half is larger than
 * the far half, and an ellipse is symmetric. At ninety-six points the departure
 * from the true curve is far under a pixel at this size.
 */
function ringPath(r: number): string {
  let d = '';
  for (let i = 0; i <= 96; i++) {
    const p = on(r, i / 96);
    d += (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
  }
  return d + 'Z';
}

/*
 * No size prop. The wheel fills the plate it is given — orrery.css sets the
 * width and the viewBox does the rest — so a number here would be a second
 * place to change it and a chance for the two to disagree.
 */
interface Props {
  /**
   * Render the face alone, with no figure, legend or note around it.
   *
   * The wheel moved inside the Firmament's stage, where it is one layer of a
   * scene rather than a plate of its own, and the readings it used to carry sit
   * with the sign's reading there instead.
   */
  bare?: boolean;
}

export function Orrery({ bare = false }: Props) {
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

    /*
     * Placed by transform ATTRIBUTE rather than by anime's `utils.set`.
     *
     * A tilted system needs translate and scale together — a body on the near
     * side of its ring is genuinely larger — and writing that as the SVG
     * transform attribute keeps it out of the inline `style.transform` anime
     * would use, so the arrival animation above and this can never end up
     * fighting over one property.
     */
    const place = (node: SVGGElement | null, r: number, turn: number) => {
      if (!node) return;
      const p = on(r, turn);
      node.setAttribute(
        'transform',
        'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ') scale(' + p.scale.toFixed(3) + ')',
      );
      // Round the back is further off and reads dimmer. Only a little: this is
      // a chart, and a moon that vanishes for half its orbit is not useful.
      node.style.opacity = String(p.depth > 0 ? 0.72 : 1);
    };

    /*
     * THE WHEEL WINDS INTO PLACE, and this is the only reason it is watchable.
     *
     * At their reckoned courses these bodies crawl. Masser turns once an
     * in-world day, which at the archive's two-to-one rate is one turn every
     * twelve real hours — about half a degree a minute. A reader who looks for
     * five seconds sees a still picture, and the sandglass already taught this
     * archive that lesson the expensive way: a level measuring a whole day
     * moves a pixel every twenty-one minutes and can never be seen to move.
     *
     * So the wheel arrives spun back and settles: a quadratic ease that is a
     * turn and a half out at the start and exactly zero after three seconds.
     * It is an ENTRANCE, not a rate. Nothing is claimed by it, the positions it
     * settles on are the true ones, and after three seconds the wheel is
     * telling the same slow truth it always was.
     */
    const opened = performance.now();
    const WIND_MS = 3000;
    const wind = () => {
      const t = (performance.now() - opened) / WIND_MS;
      if (t >= 1 || still) return 0;
      const ease = (1 - t) * (1 - t);
      return ease * 1.5;
    };

    const timer = createTimer({
      duration: Infinity,
      onUpdate: () => {
        const turn = revolutions();
        const w = wind();
        place(masser, R_MASSER, turn.masser - w);
        place(secunda, R_SECUNDA, turn.secunda - w * 1.2);
        place(magnus, R_MAGNUS, turn.magnus - w);

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

  const face = (
    <svg
      ref={root}
      // Cropped to what the tilt actually occupies: a projected ring of 48
      // reaches about 28 units either side of centre vertically, and framing
      // the full square would letterbox the wheel inside its own plate.
      viewBox="0 19 100 62"
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

      {/*
        * The wheel brings its own night ONLY when it stands alone.
        *
        * On its own plate the field is what lifts the system off the parchment.
        * Inside the Firmament there is already a sky — a starfield behind and
        * the sign's own stars between — and an opaque disc here painted over
        * both of them, which is the whole reason the wheel was moved into that
        * scene in the first place.
        *
        * Tilted with everything else when it is drawn: a round field behind an
        * elliptical system leaves a third of the plate empty above and below
        * and reads as a system painted on a coin.
        */}
      {!bare && (
        <path className="wheel-field" d={ringPath(R_RIM + 3)} fill={`url(#wheel-night-${gid})`} />
      )}

      {/* The rim, and the twelve months around it. The month in season is lit
          — the one place this wheel says what time of year it is. */}
      <path className="wheel-rim" d={ringPath(R_RIM)} />
      {MONTH_LENGTHS.map((_, i) => {
        const t = i / 12;
        const a = on(R_RIM - 2.4, t);
        const b = on(R_RIM, t);
        return (
          <line
            key={i}
            className={`wheel-tick${i + 1 === month ? ' wheel-tick--season' : ''}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          />
        );
      })}

      {/* The eight, on their rings, standing still. */}
      {DIVINE_PLANETS.map((planet, i) => {
        const r = RING_INNER + i * RING_STEP;
        const p = on(r, i / DIVINE_PLANETS.length);
        return (
          <g key={planet.name}>
            {/* Each ring's dashes are offset from its neighbour's, or all
                eight line up radially and the rings stop reading as rings —
                they become one starburst hatching the whole field. */}
            <path className="wheel-ring" d={ringPath(r)} strokeDashoffset={i * 1.7} />
            <image
              className="wheel-planet"
              href={DIVINE_SPRITES[planet.name]}
              x={p.x - 2.5 * p.scale} y={p.y - 2.5 * p.scale}
              width={5 * p.scale} height={5 * p.scale}
              style={{ opacity: p.depth > 0 ? 0.72 : 1 }}
            >
              <title>{`${planet.name}, of ${planet.of}`}</title>
            </image>
          </g>
        );
      })}

      {/* Magnus, on the outermost ring, opposite Masser. */}
      <path className="wheel-ring wheel-ring--sun" d={ringPath(R_MAGNUS)} />
      <g className="wheel-arm wheel-arm--magnus">
        <circle className="wheel-sun-halo" r="5.6" />
        <image className="wheel-sun" href={magnusUrl} x="-3.6" y="-3.6" width="7.2" height="7.2" />
      </g>

      {/* The two moons. Masser is the larger and ruddy; Secunda the small pale
          one — as they hang over Skyrim. */}
      <path className="wheel-ring wheel-ring--moon" d={ringPath(R_MASSER)} />
      <path className="wheel-ring wheel-ring--moon" d={ringPath(R_SECUNDA)} />

      {/* Nirn sits BETWEEN the rings and the moons in document order, so a
          moon on the near side of its orbit passes in front of the world and
          one on the far side is drawn behind it. That occlusion is most of
          what sells the tilt; the dimming only helps it. */}
      <image className="wheel-nirn" href={nirnUrl} x="45.2" y="45.2" width="9.6" height="9.6" />
      <circle className="wheel-nirn-rim" cx="50" cy="50" r="4.9" />

      {/*
        * The moons keep their phase shadows over the photographs.
        *
        * The sphere in the sheet is lit from its own direction and knows
        * nothing about where Magnus is standing; the shadow is the reading,
        * and it has to survive the body underneath it changing from a flat
        * disc to a picture. Clipped to the moon's circle so it cannot spill
        * onto the stars.
        */}
      <g className="wheel-arm wheel-arm--secunda">
        <image className="wheel-moon" href={secundaUrl} x="-2.35" y="-2.35" width="4.7" height="4.7" />
        <g clipPath={`url(#clip-secunda-${gid})`}>
          <circle className="wheel-shade wheel-shade--secunda" cx="-4.2" cy="0" r="2.35" />
        </g>
      </g>

      <g className="wheel-arm wheel-arm--masser">
        <image className="wheel-moon" href={masserUrl} x="-3.6" y="-3.6" width="7.2" height="7.2" />
        <g clipPath={`url(#clip-masser-${gid})`}>
          <circle className="wheel-shade wheel-shade--masser" cx="-6.4" cy="0" r="3.6" />
        </g>
      </g>
    </svg>
  );

  // Inside the Firmament the wheel is a layer of somebody else's scene.
  if (bare) return face;

  return (
    <figure className="wheel">
      {face}
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

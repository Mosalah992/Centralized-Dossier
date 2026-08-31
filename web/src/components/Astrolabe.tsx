// The Astrolabe of the Realm.
//
// An instrument rather than an ornament: it reads the archive's own data and it
// keeps time. The outer ring carries the whole day and turns through it; the
// inner ring carries the hour; the field holds the season's own constellation,
// drawn from the star positions in shared/constellations.ts; and the Dominion's
// seal assembles at the centre out of the marks that surround it.
//
// ANIME.JS DRIVES IT, and it is the only thing in the archive that anime.js
// touches. GSAP remains the motion language everywhere else — see motion.ts and
// the note in CLAUDE.md. The two never animate the same element, which is the
// only rule that matters when two engines share a page: whichever wrote last
// wins, and a property owned by both is a property that flickers.
//
// IT MUST NEVER REACH THE GATE CHUNK. anime.js is larger than the headroom the
// entry bundle has left, and Shelf is a static import — so the shelf loads this
// through a dynamic import and the calendar gets it inside its own lazy view.
// test/bundle.test.ts fails if anime.js appears in the entry chunk, because
// invariant 7 is exactly this and it has been broken once already.

import { useEffect, useId, useMemo, useRef } from 'react';

import { animate, createTimer, stagger, svg, utils } from 'animejs';

import { constellationOf, SERPENT, type Constellation } from '../../../shared/constellations';
import { dayProgress, minuteProgress, reckon } from '../../../shared/reckoning';

/** Ticks around the outer bezel — one per ten in-world minutes. */
const TICKS = 144;
/** Marks that fly in to build the seal at the centre. */
const MARKS = 28;

const R_OUTER = 46;
const R_TICK_IN = 40;
const R_HOUR = 33;
/** The seal's ring — clear of the hour ring above it and the asterism inside. */
const R_SEAL = 26;

interface Props {
  /** The instrument is drawn at whatever size its container gives it. */
  size?: number;
  /** The shelf wants a quieter one than the calendar's centrepiece. */
  quiet?: boolean;
  /**
   * Whether the instrument names its own sign.
   *
   * Off on the calendar, where the plate beside it already gives the sign, its
   * standing and what the Firmament says of those born under it. An instrument
   * that repeats the caption next to it is not a second reading, it is the same
   * reading twice.
   */
  legend?: boolean;
}

export function Astrolabe({ size = 260, quiet = false, legend = true }: Props) {
  const root = useRef<SVGSVGElement>(null);
  // The gradient is referenced by url(#id), which is document-global — two
  // instruments on one page sharing an id would have the second silently
  // repaint the first.
  const gid = useId().replace(/:/g, '');

  /*
   * The season's sign, or the Serpent when the month has none.
   *
   * reckon() rather than a prop: this instrument is a clock, and a clock that
   * has to be told the time by its parent is a dial.
   */
  const sign: Constellation = useMemo(
    () => constellationOf(reckon().monthIndex) ?? SERPENT,
    [],
  );

  // Stars are given in a 100x100 field; the instrument works in a 100x100
  // viewBox centred on 50,50, so the asterism is scaled into the inner disc
  // rather than laid over the whole face.
  const stars = useMemo(
    () => sign.stars.map(([x, y]) => [50 + (x - 50) * 0.42, 50 + (y - 50) * 0.42] as const),
    [sign],
  );

  const ticks = useMemo(() => Array.from({ length: TICKS }, (_, i) => i), []);
  const marks = useMemo(() => Array.from({ length: MARKS }, (_, i) => i), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;

    /*
     * A reader who asked for stillness gets the instrument, drawn and readable,
     * and nothing that moves. Same contract as the rest of the archive: the
     * information survives, the motion does not.
     */
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      utils.set(el.querySelectorAll('.astro-tick, .astro-star, .astro-mark'), { opacity: 1, scale: 1 });
      utils.set(el.querySelectorAll('.astro-join'), { strokeDashoffset: 0 });
      return undefined;
    }

    const q = (sel: string) => Array.from(el.querySelectorAll(sel));

    /*
     * THE ARRIVAL, in the order an instrument would be assembled: the bezel's
     * ticks strike outward from the centre, the asterism's stars come up, the
     * lines between them are drawn, and the seal's marks fly in last.
     */
    animate(q('.astro-tick'), {
      opacity: [0, 1],
      scaleY: [0, 1],
      duration: 900,
      ease: 'outQuad',
      // `from: 'center'` walks outward from the middle of the list, which on a
      // ring laid out clockwise reads as the bezel striking open from the top.
      delay: stagger(7, { from: 'center' }),
    });

    animate(q('.astro-star'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 700,
      ease: 'outBack',
      delay: stagger(45, { start: 500 }),
    });

    // createDrawable turns each line into a stroke that can be drawn on, which
    // is anime.js's equivalent of the dash-offset trick the tapestry uses.
    const joins = q('.astro-join').map((line) => svg.createDrawable(line as SVGLineElement));
    if (joins.length) {
      animate(joins, {
        draw: ['0 0', '0 1'],
        duration: 900,
        ease: 'inOutQuad',
        delay: stagger(70, { start: 900 }),
      });
    }

    animate(q('.astro-mark'), {
      opacity: [0, 1],
      scale: [0, 1],
      // Each mark starts where it sits on the bezel and flies to the centre,
      // so the seal is built out of the instrument rather than dropped onto it.
      x: [() => utils.random(-30, 30), 0],
      y: [() => utils.random(-30, 30), 0],
      duration: 1100,
      ease: 'outCubic',
      delay: stagger(22, { start: 1400, from: 'random' }),
    });

    /*
     * AND THEN IT KEEPS TIME.
     *
     * One timer, reading the same clock the rest of the archive reads. The
     * bezel carries the whole day and turns once through it; the hour ring runs
     * at sixty times that, so it is the one a reader can actually watch move.
     * Nothing here is a decorative loop — every angle on the face is the time.
     */
    const bezel = el.querySelector('.astro-bezel') as SVGGElement | null;
    const hourRing = el.querySelector('.astro-hours') as SVGGElement | null;
    const needle = el.querySelector('.astro-needle') as SVGGElement | null;

    const timer = createTimer({
      duration: Infinity,
      onUpdate: () => {
        const day = dayProgress();
        const minute = minuteProgress();
        if (bezel) utils.set(bezel, { rotate: day * 360 });
        if (hourRing) utils.set(hourRing, { rotate: -day * 360 * 24 });
        // The needle sweeps a minute, which is the fast hand — the same reading
        // the sandglass runs on, so the two agree on the page.
        if (needle) utils.set(needle, { rotate: minute * 360 });
      },
    });

    return () => {
      timer.pause();
      utils.remove(el.querySelectorAll('*'));
    };
  }, [sign]);

  const cx = 50;
  const cy = 50;

  return (
    <figure className={`astro${quiet ? ' astro--quiet' : ''}`} style={{ width: size }}>
      <svg
        ref={root}
        viewBox="0 0 100 100"
        className="astro__face"
        role="img"
        aria-label={`An astrolabe of the realm, showing the sign of ${sign.name}`}
      >
        {/*
          * NIGHT, under everything.
          *
          * The asterism this replaced sat on its own dark disc, and the note in
          * ledger.css said why: "an asterism drawn as dark dots on cream reads
          * as a stain rather than a sky." That is exactly right, and drawing
          * the instrument in bronze on the parchment ignored it — the stars
          * became nine dark specks on paper and the whole face washed out into
          * the plate behind it.
          *
          * So the instrument brings its own night with it, and can then be
          * lettered in the same foil the covers are. The shelf's copy hides
          * this: the cabinet is already dark, and a second dark disc there
          * would be a grey plate floating behind the books.
          */}
        <defs>
          <radialGradient id={`astro-night-${gid}`} cx="50%" cy="45%">
            <stop offset="0%" stopColor="#1b1a24" />
            <stop offset="72%" stopColor="#0c0b11" />
            <stop offset="100%" stopColor="#08070c" />
          </radialGradient>
        </defs>
        <circle
          className="astro-field"
          cx={cx} cy={cy} r={R_OUTER + 2.5}
          fill={`url(#astro-night-${gid})`}
        />

        {/* The bezel: ticks around the rim, turning with the day. */}
        <g className="astro-bezel" style={{ transformOrigin: '50px 50px' }}>
          {ticks.map((i) => {
            const a = (i / TICKS) * Math.PI * 2;
            const long = i % 12 === 0;
            const r1 = long ? R_TICK_IN - 3 : R_TICK_IN;
            return (
              <line
                key={i}
                className={`astro-tick${long ? ' astro-tick--hour' : ''}`}
                x1={cx + Math.sin(a) * r1}
                y1={cy - Math.cos(a) * r1}
                x2={cx + Math.sin(a) * R_OUTER}
                y2={cy - Math.cos(a) * R_OUTER}
                style={{ transformOrigin: `${cx + Math.sin(a) * R_OUTER}px ${cy - Math.cos(a) * R_OUTER}px` }}
              />
            );
          })}
        </g>

        <circle className="astro-rim" cx={cx} cy={cy} r={R_OUTER} />
        <circle className="astro-rim astro-rim--inner" cx={cx} cy={cy} r={R_TICK_IN - 4} />

        {/* The hour ring, running against the bezel so the two shear apart. */}
        <g className="astro-hours" style={{ transformOrigin: '50px 50px' }}>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <circle
                key={i}
                className={`astro-hour${i % 6 === 0 ? ' astro-hour--quarter' : ''}`}
                cx={cx + Math.sin(a) * R_HOUR}
                cy={cy - Math.cos(a) * R_HOUR}
                r={i % 6 === 0 ? 0.9 : 0.5}
              />
            );
          })}
        </g>

        {/* The season's asterism, drawn from its own stars. */}
        <g className="astro-sign">
          {sign.lines.map(([a, b], i) => {
            const s1 = stars[a];
            const s2 = stars[b];
            if (!s1 || !s2) return null;
            return (
              <line
                key={`${a}-${b}-${i}`}
                className="astro-join"
                x1={s1[0]} y1={s1[1]} x2={s2[0]} y2={s2[1]}
              />
            );
          })}
          {stars.map(([x, y], i) => (
            <circle key={i} className="astro-star" cx={x} cy={y} r={i === 0 ? 1.5 : 1.05}
              style={{ transformOrigin: `${x}px ${y}px` }} />
          ))}
        </g>

        {/* The seal, assembled from marks that fly in from the rim. */}
        <g className="astro-seal">
          {marks.map((i) => {
            const a = (i / MARKS) * Math.PI * 2;
            /*
             * The seal's own ring, OUTSIDE the asterism rather than inside it.
             *
             * It sat at r 9-14 first, which on the dark shelf looked like a
             * seal and on the calendar's parchment looked like a tangle: that
             * is exactly the radius the constellation's body occupies, so the
             * marks fell among the stars and the joining lines ran through the
             * core. The face now reads strictly outward — bezel, hours, seal,
             * asterism, core — and no two rings share a radius.
             *
             * ONE radius, not three. The first attempt stepped the radius by
             * i % 3 for texture and got the opposite: twenty-eight marks at
             * three radii read as scatter, not as a ring somebody punched. The
             * rhythm comes from size instead — every seventh is larger, which
             * gives the ring four quarter-marks a reader can count by.
             */
            const r = R_SEAL;
            const big = i % 7 === 0;
            const w = big ? 1.6 : 1.05;
            const x = cx + Math.sin(a) * r;
            const y = cy - Math.cos(a) * r;
            return (
              <rect
                key={i}
                className={`astro-mark${big ? ' astro-mark--quarter' : ''}`}
                x={x - w / 2} y={y - w / 2} width={w} height={w}
                transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`}
                style={{ transformOrigin: `${x}px ${y}px` }}
              />
            );
          })}
          <circle className="astro-core" cx={cx} cy={cy} r={3.2} />
        </g>

        {/* The fast hand: one turn per in-world minute, as the sandglass runs. */}
        <g className="astro-needle" style={{ transformOrigin: '50px 50px' }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - (R_HOUR - 4)} />
        </g>
      </svg>

      {legend && (
        <figcaption className="astro__legend">
          <span className="astro__sign">{sign.name}</span>
          <span className="astro__note">
            {sign.isGuardian ? 'A Guardian' : `Charge of the ${sign.guardian}`}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

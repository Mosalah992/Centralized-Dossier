// Hall of Honor and the Tamrielic Calendar.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { D, gsap, staged } from '../motion';
import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import type { CalendarDay } from '../../../shared/types';
import { MONTHS } from '../../../shared/parsers/calendar';
import { RATE, clockParts, machineHour, minuteProgress, reckon, type InWorldMoment } from '../../../shared/reckoning';
import { EMBASSY_OBSERVANCES, withObservances } from '../../../shared/observances';
import { TAMRIELIC_HOLIDAYS } from '../../../shared/holidays';
import { constellationOf, standing } from '../../../shared/constellations';
import type { Constellation } from '../../../shared/constellations';
import { withParchmentPalette } from '../../../shared/parchment';
import indumoril from '../assets/indumoril.jpg';
import ganaril from '../assets/ganaril.jpg';
import malen from '../assets/malen.jpg';
import celerielElvander from '../assets/celeriel-elvander.webp';
import akira from '../assets/akira.webp';
import canonreeve from '../assets/canonreeve.webp';

/* The First Emissaries are the hall's own record, kept here rather than in the
   sheet: their deeds are settled history, and one of them is deliberately
   expunged — a state the citation rows cannot express. */
interface Emissary {
  name: string;
  epithet: string;
  deeds: string[];
  /** Absent when the record is expunged. */
  portrait?: string;
  /** Where the frame crops the portrait; faces sit differently in each. */
  focus?: string;
}

const FIRST_EMISSARIES: Emissary[] = [
  {
    name: 'Indumoril Lourinien',
    epithet: 'The Purifier',
    portrait: indumoril,
    focus: '36% 22%',
    deeds: [
      'Led the Thalmor to glorious victory in the war against the heretic alliance of Windhelm and Voshu-Agra.',
      'Rooted out and destroyed the heretic cult leaders of the Sons of Skyrim, leaving them splintered and leaderless to this day.',
    ],
  },
  {
    name: 'Ganaril Athiath',
    epithet: 'The Reformer',
    portrait: ganaril,
    focus: 'top',
    deeds: [
      'Restructured the ranks and procedures of the Thalmor, establishing a more orderly rule of law, and saving the Thalmor from financial ruin.',
      "Oversaw and spearheaded the redrafting of the White-Gold Concordat, to the increase of the Dominion's legal authority and power over the Empire.",
      'Freed the people of Riften from the tyranny of the heretic Jarl, Einar Blackwater.',
    ],
  },
  {
    name: 'Verux Valen',
    epithet: 'The Shadow',
    deeds: [],
  },
  {
    name: 'Malen Velrith',
    epithet: 'The Patriarch',
    portrait: malen,
    focus: 'center 18%',
    deeds: [
      'Successfully re-established the Thalmor Embassy in Skyrim after 25 years of diminished Thalmor presence in the province.',
      'Bestowed the rights of full Thalmor membership to our honored allies, the Bosmer and the Khajiit.',
      'He died with honor, protecting his beloved wife from a rampaging Dremora.',
    ],
  },
];

/* Honoured servants: those below the First Emissary's office. Some sat alone
   and some sat together, so the section carries both a single-plate row and
   the pair's shared portrait. */
interface Honoree {
  name: string;
  deeds: string[];
}

interface Servant extends Honoree {
  portrait: string;
  /** Where the 3:4 plate crops a full-length painting. */
  focus?: string;
  /** A wry hand in the margin, kept out of the roll of deeds. */
  aside?: string;
}

const HONORED_SERVANTS: Servant[] = [
  {
    name: 'Advisor Akira Frey',
    portrait: akira,
    focus: 'top',
    deeds: [
      'Brought forth the intelligence that ended the war with Windhelm against the Sons of Skyrim and the Orcs of Voshu-Agra, bringing peace to the realm.',
      'Veteran of the Thalmor, distinguished by years of loyal and dedicated service to the Dominion.',
      "Advisor of unmatched diplomatic skill, renowned for building relationships and navigating the delicate politics of Skyrim's Holds.",
      'Unwaveringly loyal to the Thalmor, serving the Dominion with consistency and distinction, even when her heart may occasionally favor Riften.',
    ],
    aside: 'Champion of Riften, apparently.',
  },
  {
    name: 'Canonreeve Ancarion Saelthar',
    portrait: canonreeve,
    // The plate is 3:4 and this painting is square, so it is the SIDES that
    // are cut rather than the head. Centred is right: the figure stands in the
    // middle of it, and the staff can lose an inch at the edge.
    focus: 'center',
    deeds: [
      "Established the backbone of the Embassy's Archives, creating the ledgers, records, and reporting systems that preserved the history of the Skyrim mission.",
      'Rose from soldier to Canonreeve, distinguished through years of military service, administration, and unwavering dedication to the Dominion.',
      "Restored discipline and accountability to the Embassy's administration, ensuring its treasury, personnel, and duties could function beyond the mer who held command.",
    ],
  },
];

const HONORED_PAIR: Honoree[] = [
  {
    name: 'Lady Celeriel',
    deeds: [
      "Established the backbone of the Embassy's archives, creating the foundation for its records and intelligence.",
      'Distinguished herself as a brilliant inspector and hunter, pursuing threats with precision and determination.',
      'Remained devoted to her husband until the very end, embodying loyalty both in duty and in her personal life.',
    ],
  },
  {
    name: 'Justiciar Elvander',
    deeds: [
      "Served the Dominion with distinction, upholding the authority and duties entrusted to the Justiciar's office.",
      'Demonstrated discipline and commitment in carrying out his responsibilities within the Embassy.',
      'Contributed to the security and stability of the Embassy, leaving his mark through continued service to the Dominion.',
    ],
  },
];

export function HonorView() {
  const volume = useVolume('honor');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The hall could not be read" body={volume.message} />;
  }

  return (
    <Page
      title="Hall of Honor"
      subtitle="Those Remembered by the Dominion"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      {/* "emissaries", not "hall": the shelf owns .hall, and the torches it
          hangs off that class followed it onto this page. */}
      <section aria-label="The First Emissaries">
        <h2 className="page__heading">The First Emissaries</h2>
        <ol className="emissaries">
          {FIRST_EMISSARIES.map((emissary) => (
            <li className="emissary" key={emissary.name}>
              <figure className="emissary__portrait">
                {emissary.portrait ? (
                  <img
                    src={emissary.portrait}
                    alt={`Portrait of Emissary ${emissary.name}`}
                    loading="lazy"
                    style={{ objectPosition: emissary.focus }}
                  />
                ) : (
                  <div className="emissary__expunged" role="img" aria-label="Portrait expunged">
                    <span className="emissary__stamp">Redacted</span>
                  </div>
                )}
              </figure>
              <div className="emissary__record">
                <h3 className="emissary__name">Emissary {emissary.name}</h3>
                <p className="emissary__epithet">&ldquo;{emissary.epithet}&rdquo;</p>
                {emissary.deeds.length > 0 ? (
                  <ul className="emissary__deeds">
                    {emissary.deeds.map((deed) => (
                      <li key={deed}>{deed}</li>
                    ))}
                  </ul>
                ) : (
                  /* Verux. The record exists; its contents do not. */
                  <div className="emissary__redaction" aria-label="Deeds redacted">
                    <span className="emissary__bar" style={{ width: '84%' }} />
                    <span className="emissary__bar" style={{ width: '61%' }} />
                    <span className="emissary__bar" style={{ width: '72%' }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Honored Servants">
        <h2 className="page__heading">Honored Servants</h2>

        {HONORED_SERVANTS.map((servant) => (
          <div className="honoree" key={servant.name}>
            <figure className="honoree__portrait">
              <img
                src={servant.portrait}
                alt={`Portrait of ${servant.name}`}
                loading="lazy"
                style={{ objectPosition: servant.focus }}
              />
            </figure>
            <div>
              <h3 className="honoree__name">{servant.name}</h3>
              <ul className="honoree__deeds">
                {servant.deeds.map((deed) => (
                  <li key={deed}>{deed}</li>
                ))}
              </ul>
              {servant.aside && <p className="honoree__aside">&mdash; {servant.aside}</p>}
            </div>
          </div>
        ))}

        <div className="pair">
          {/* One portrait, two records. It is close to square, so it keeps its
              own aspect instead of being cropped to the 3:4 plates above. */}
          <figure className="pair__portrait">
            <img
              src={celerielElvander}
              alt="Portrait of Lady Celeriel and Justiciar Elvander"
              loading="lazy"
            />
          </figure>
          <ol className="pair__records">
            {HONORED_PAIR.map((honoree) => (
              <li key={honoree.name}>
                <h3 className="honoree__name">{honoree.name}</h3>
                <ul className="honoree__deeds">
                  {honoree.deeds.map((deed) => (
                    <li key={deed}>{deed}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="page__credits">
        <p>
          Portraits by <strong>Akira Frey</strong>.
        </p>
        <p>
          The Hall of Honor is kept by{' '}
          <strong>First Emissary Ganaril &ldquo;the Reformer&rdquo;</strong>.
        </p>
      </footer>
    </Page>
  );
}

/** Tooltip text for a day carrying a note. */
function dayTitle(day: CalendarDay): string {
  if (!day.event) return `${day.weekday} — ${day.kind}`;
  return [day.event.name, day.event.date, day.event.caution]
    .filter(Boolean)
    .join('\n');
}

/**
 * The in-world moment, re-reckoned on an interval.
 *
 * The period is a parameter, but nothing asks for a fast one any more. It used
 * to: the hourglass wanted a tick a second so its sand could step, and the
 * comment here explained why the calendar grid was not made to pay for that.
 * The sand is written by a GSAP ticker now and needs no render at all, so both
 * callers run slow and this only has to answer which of 365 cells is today —
 * a question whose answer changes at midnight.
 */
function useInWorldNow(periodMs: number): InWorldMoment {
  const [now, setNow] = useState(() => reckon());

  useEffect(() => {
    const id = setInterval(() => setNow(reckon()), periodMs);
    return () => clearInterval(id);
  }, [periodMs]);

  return now;
}

/**
 * A sand clock, drawn rather than drafted in: the sand stands for the day
 * itself, the upper bulb draining from midnight to midnight and the lower one
 * filling by the same measure, so a reader can see the hour at a glance before
 * reading it. It turns over at midnight because the day does.
 *
 * The geometry is in one 60x100 space and the two bulbs are mirrored about the
 * neck at y=50, so the sand levels are a single interpolation read in opposite
 * directions rather than two sets of numbers to keep in agreement.
 */
/*
 * THE TWO SURFACES, AND WHY THEY ARE CURVED.
 *
 * The sand used to be two flat-topped rectangles cut to the bulbs. At a glass
 * three and a half rem wide that reads as a vessel draining LIQUID: liquid is
 * the thing whose surface stays level. Sand does not. It funnels where it
 * leaves and it cones where it lands, and those two curves are the whole of
 * what tells the eye which material it is looking at.
 *
 * They are also the only detail worth adding at this size. Individual grains
 * were considered and rejected: the stream is about seventeen pixels tall, so a
 * grain would be smaller than a pixel and the work would go into something
 * nobody can see. A silhouette survives being small. A particle does not.
 *
 * Both curves are quadratics whose apex sits at the midpoint, so the control
 * point is twice the depth: `Q 30 (y ± 2d) 48 y` peaks at exactly `y ∓ d`.
 * The paths are still clipped to the bulbs, which is why they can run the full
 * width and overshoot without being trimmed by hand.
 */
export function upperPath(surface: number, top: number, neck: number): string {
  const remaining = Math.max(0, neck - surface);
  const drained = neck === top ? 1 : (surface - top) / (neck - top);

  /*
   * THE FUNNEL DEEPENS AS THE BULB DRAINS, and getting that the wrong way
   * round is what the first version did. Keying the depth off how much sand
   * REMAINS gives a glass that is deeply cratered the moment it is turned and
   * almost flat by evening — which is precisely backwards, and obvious the
   * instant the two are drawn side by side rather than reasoned about.
   *
   * It keys off progress instead. Flat at the turn, cratering through the day,
   * and clamped by the sand still in the bulb so the dip can never cut below
   * the neck it drains into.
   */
  const dip = Math.min(0.6 + 3.4 * drained, remaining * 0.45);
  return `M 12 ${surface} Q 30 ${surface + dip * 2} 48 ${surface} L 48 ${neck} L 12 ${neck} Z`;
}

/**
 * How high the heap stands above the level around it.
 *
 * THREE LIMITS, and the third is one a test found rather than one I foresaw.
 * A cone builds under the neck from the first grains and then stops growing,
 * because a real heap keeps its angle and only widens — that is the 2.8. It
 * cannot be taller than the sand that has actually landed, or the first grains
 * would arrive as a spike — that is the `filled` term. And near the end of the
 * day, when the surface has climbed almost to the neck, it must not go on
 * rising THROUGH the neck into the bulb above. The clip was hiding that last
 * one, so it looked right while being wrong, which is exactly the sort of thing
 * that stops being hidden the moment somebody redraws the glass.
 */
function moundHeight(surface: number, floor: number, neck: number): number {
  return Math.min(2.8, Math.max(0, floor - surface) * 0.42, Math.max(0, surface - neck));
}

export function lowerPath(surface: number, floor: number, neck: number): string {
  const mound = moundHeight(surface, floor, neck);
  return `M 12 ${surface} Q 30 ${surface - mound * 2} 48 ${surface} L 48 ${floor} L 12 ${floor} Z`;
}

/**
 * Has the glass run out between these two readings?
 *
 * The reading runs 0 to 1 and then starts again, so the turn is the one moment
 * it goes DOWN. Any fall would do as a test except that a reader switching
 * tabs can leave the ticker unread for a while, so the threshold is half the
 * measure — which only a rollover can produce.
 *
 * Pure and exported so the turn can be tested without waiting for one.
 */
export const turned = (previous: number, now: number): boolean =>
  previous > 0.5 && now < previous - 0.5;

/** The apex of the heap — where the falling stream should land. */
export const moundPeak = (surface: number, floor: number, neck: number): number =>
  surface - moundHeight(surface, floor, neck);

function Hourglass({ fraction }: { fraction: number }) {
  const NECK = 50;
  const TOP = 12;
  const FLOOR = 88;

  const upper = useRef<SVGPathElement>(null);
  const lower = useRef<SVGPathElement>(null);
  const fall = useRef<SVGLineElement>(null);
  /** The whole glass, so midnight can turn it over. */
  const root = useRef<SVGSVGElement>(null);

  /*
   * The sand moves; React does not.
   *
   * This plate used to re-render once a second so the two rects could step to
   * a new height — one full React render, for a surface that moves one part in
   * 86,400 of a bulb. It looked like what it was: a clock ticking, not sand
   * falling.
   *
   * Now the component renders once and a ticker callback writes the four
   * attributes directly. `quickSetter` resolves the property lookup a single
   * time and hands back a function that just assigns, which is what makes
   * doing this every frame cheaper than doing it once a second through React.
   *
   * Net: continuous sand AND zero re-renders per second where there was one.
   * Better on both axes, which is rare enough to be worth stating.
   */
  useGSAP(() => staged(({ moving }) => {
    if (!upper.current || !lower.current) return;

    /*
     * setAttribute, NOT gsap.quickSetter('attr'), and the difference is the
     * whole reason the glass stood still.
     *
     * quickSetter with "attr" is built for numeric attributes — the docs
     * demonstrate cx and cy, and its values go through GSAP's parser so that
     * "+=100" and "random(-100,100)" work. A path's `d` is a string of
     * commands and it is not a number, so the write was quietly dropped: the
     * ticker ran, the grains fell, and the shape on screen stayed whatever
     * React had rendered at mount. Nothing threw, nothing warned, and the
     * hourglass froze the moment it appeared.
     *
     * A plain setAttribute is also the fastest thing available — quickSetter's
     * whole purpose is to get closer to this, not further from it. GSAP is
     * still what drives the loop; it just is not what writes the string.
     */
    const upperEl = upper.current;
    const lowerEl = lower.current;
    const fallEl = fall.current;

    const draw = () => {
      // minuteProgress, not the day — see the note on it. A day's worth of
      // sand moves one pixel every twenty-one minutes; a minute's worth falls
      // at better than a pixel a second, which is the difference between a
      // clock and a picture of one.
      const at = minuteProgress();
      const top = TOP + (NECK - TOP) * at;
      const bottom = FLOOR - (FLOOR - NECK) * at;
      upperEl.setAttribute('d', upperPath(top, TOP, NECK));
      lowerEl.setAttribute('d', lowerPath(bottom, FLOOR, NECK));
      // The stream ends on the APEX of the heap, not on the level it would
      // have had if it were flat — otherwise the last few pixels of the fall
      // disappear behind the cone it is building.
      if (fallEl) {
        fallEl.setAttribute('y2', String(Math.max(NECK, moundPeak(bottom, FLOOR, NECK))));
      }
    };

    draw();

    // A reader who asked for stillness gets the hour, drawn once. It is a
    // clock face, not an animation: the level still says what time it is.
    if (!moving) return;

    /*
     * THE GLASS TURNS AT MIDNIGHT, because that is what an hourglass does when
     * its sand runs out and it is the only moment in the day this clock has to
     * mark. Everything else it does is a millimetre an hour.
     *
     * A half turn rather than a full one: the frame is symmetrical, so 180
     * degrees is indistinguishable from where it started, and the rotation is
     * reset to zero the moment it lands. The sand redraws to full through the
     * turn on its own — `draw` is still running — so the bulb fills as the
     * glass comes over, which is the part that sells it.
     *
     * `swing`, not `break` or `shut`: this is a hinged object being tipped, and
     * the motion language has a curve for exactly that.
     */
    let previous = minuteProgress();
    const glass = root.current;

    const turn = () => {
      if (!glass) return;
      gsap.fromTo(glass,
        { rotate: 0 },
        {
          rotate: 180,
          duration: D.page,
          ease: 'swing',
          transformOrigin: '50% 50%',
          // Cleared rather than left at 180: a symmetrical frame makes the two
          // states identical, and leaving a transform on means the NEXT turn
          // starts from 180 and goes to 360.
          onComplete: () => gsap.set(glass, { clearProps: 'rotate,transformOrigin' }),
        });
    };

    // The grains: a dashed stroke whose offset travels, which reads as falling
    // where a solid bar would just sit there. Its own tween rather than part of
    // `draw`, because the sand level tracks the clock and the grains do not.
    // Exactly one dash period (1.6 + 2.6) per half second, so the stream
    // repeats seamlessly and reads as a continuous fall rather than a loop.
    /*
     * ONE GRAIN PER IN-WORLD SECOND, derived rather than guessed.
     *
     * The dash is 1.6 on, 2.6 off — one period is 4.2 units — and the stream
     * travels exactly one period per second of realm time. That used to be
     * written as a flat 0.5s with a comment explaining that it happened to be
     * right at the current rate. It is the rate that makes it right, so it now
     * says so: change RATE in shared/reckoning.ts and the sand keeps pace with
     * the clock instead of quietly falling at the wrong speed.
     */
    const grains = fall.current
      ? gsap.to(fall.current, {
        strokeDashoffset: -4.2, duration: 1 / RATE, ease: 'none', repeat: -1,
      })
      : null;

    // The turn is decided on the same tick that draws, so the glass and the
    // sand never disagree about whether it has run out.
    const tick = () => {
      const at = minuteProgress();
      if (turned(previous, at)) turn();
      previous = at;
      draw();
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      grains?.kill();
      if (glass) gsap.killTweensOf(glass);
    };
  }), []);

  // Upper sand drains toward the neck; lower sand climbs from the floor.
  // These are the FIRST FRAME only — the ticker owns them after that, and the
  // attributes below exist so the plate is correct before it is ever ticked.
  const upperSurface = TOP + (NECK - TOP) * fraction;
  const lowerSurface = FLOOR - (FLOOR - NECK) * fraction;
  const draining = fraction > 0.002 && fraction < 0.998;

  return (
    /* Hidden from the reading order: the hour is written out beside it, and a
       description of the sand would only say the same thing twice. */
    <svg ref={root} className="sandglass" viewBox="0 0 60 100" aria-hidden focusable="false">
      <defs>
        {/* The sand is cut to the bulbs, so its two curved surfaces can run the
            full width of the glass and let the clip decide where they end. */}
        <clipPath id="sandglass-upper">
          <path d="M 13 12 L 47 12 C 47 29 33 44 31 49 L 29 49 C 27 44 13 29 13 12 Z" />
        </clipPath>
        <clipPath id="sandglass-lower">
          <path d="M 13 88 L 47 88 C 47 71 33 56 31 51 L 29 51 C 27 56 13 71 13 88 Z" />
        </clipPath>
      </defs>

      {/* Frame: two turned posts between a capped top and foot. */}
      <g className="sandglass__frame">
        <rect x="3" y="2" width="54" height="7" rx="2.5" />
        <rect x="3" y="91" width="54" height="7" rx="2.5" />
        <rect x="7" y="7" width="5" height="86" rx="2.5" />
        <rect x="48" y="7" width="5" height="86" rx="2.5" />
      </g>

      <g className="sandglass__glass">
        <path d="M 13 12 L 47 12 C 47 29 33 44 31 49 L 29 49 C 27 44 13 29 13 12 Z" />
        <path d="M 13 88 L 47 88 C 47 71 33 56 31 51 L 29 51 C 27 56 13 71 13 88 Z" />
      </g>

      <g className="sandglass__sand">
        <path ref={upper} d={upperPath(upperSurface, TOP, NECK)} clipPath="url(#sandglass-upper)" />
        <path ref={lower} d={lowerPath(lowerSurface, FLOOR, NECK)} clipPath="url(#sandglass-lower)" />
      </g>

      {/* Grains rather than a bar: a dashed stroke whose offset is animated
          reads as falling, where a solid rectangle would just sit there. */}
      {draining && (
        <line
          ref={fall}
          className="sandglass__fall"
          x1="30" y1="49" x2="30" y2={Math.max(NECK, moundPeak(lowerSurface, FLOOR, NECK))}
        />
      )}
    </svg>
  );
}

/**
 * The sign whose season it is, drawn from its own stars.
 *
 * The asterism is data, not art: shared/constellations.ts gives each sign star
 * positions in a 100x100 field and pairs of indices to join, so this draws
 * whatever is in the table rather than carrying thirteen hand-made pictures
 * that would drift from it.
 */
function Asterism({ sign }: { sign: Constellation }) {
  return (
    <svg className="sign__field" viewBox="-8 -8 116 116" aria-hidden focusable="false">
      {sign.lines.map(([a, b], i) => {
        const from = sign.stars[a];
        const to = sign.stars[b];
        if (!from || !to) return null;
        return (
          <line key={i} className="sign__line" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} />
        );
      })}
      {sign.stars.map(([x, y], i) => (
        // The first star of each sign is its brightest, by the table's own
        // ordering, so it carries the larger disc.
        <circle key={i} className="sign__star" cx={x} cy={y} r={i === 0 ? 3.4 : 2.2} />
      ))}
    </svg>
  );
}

/** The plate above the year: what day it is in the realm, and what hour. */
function InWorldPlate({ today }: { today: CalendarDay | null }) {
  /*
   * Half an in-world minute, which is the finest this plate can ever need.
   *
   * It used to tick once a second, and the comment said why: the sand moved in
   * steps and a coarser tick made the stepping visible. The sand is written by
   * a GSAP ticker now, so the only thing left on this clock is the time TEXT —
   * and that changes once an in-world minute, which at RATE 2:1 is every thirty
   * real seconds. Polling at half of it keeps the reading at most fifteen
   * seconds stale and derives from the rate rather than assuming it.
   */
  const now = useInWorldNow(30_000 / RATE);
  const month = MONTHS[now.monthIndex - 1] ?? '';
  const { clock, meridiem } = clockParts(now);
  const sign = constellationOf(now.monthIndex);

  return (
    <aside className="reckoning">
      <Hourglass fraction={minuteProgress()} />

      <div className="reckoning__reading">
        <p className="reckoning__eyebrow">The hour in the realm</p>
        <p className="reckoning__date">
          {month} {now.day}, 4E {now.year}
        </p>
        <p className="reckoning__hour">
          {/* A real space, not just the margin below: the gap has to survive
              being read aloud and being copied, and CSS does neither. */}
          <time dateTime={machineHour(now)}>
            {clock}{' '}
            <span className="reckoning__meridiem">{meridiem}</span>
          </time>
          {today && <span className="reckoning__weekday">{today.weekday}</span>}
        </p>
        {today?.event && (
          <p className="reckoning__observance">
            <strong>{today.event.name}</strong>
            {today.event.caution && <> — {today.event.caution}</>}
          </p>
        )}
      </div>

      {/* The sign in season. It belongs on this plate rather than in the grid
          because it is a property of the month rather than of any day, and the
          plate is already where the archive says what time it is. */}
      {sign && (
        <div className="sign">
          <Asterism sign={sign} />
          <div className="sign__reading">
            <p className="sign__name">{sign.name}</p>
            <p className="sign__standing">{standing(sign)}</p>
            <p className="sign__born">{sign.born}</p>
          </div>
        </div>
      )}
    </aside>
  );
}

export function CalendarView() {
  const volume = useVolume('calendar');
  // Slow: this only decides which cell wears the mark, and that changes at
  // midnight. The plate below keeps the fast clock.
  const now = useInWorldNow(30_000);

  /**
   * The day the reader has asked about.
   *
   * A marked day used to carry its note in a `title`, which is a tooltip, which
   * is a mouse. On a touchscreen there is no hover and no tooltip, so on a phone
   * the observances were simply unreadable — and worse since the marked-days
   * table came out, because that table had been the way round it. Tapping a day
   * now opens it, and the `title` stays for the mouse that still wants it.
   */
  const [choice, setChoice] = useState<{ month: string; day: CalendarDay } | null>(null);

  const source = volume.state === 'ready' ? volume.value.data : null;
  // Both passes allocate a fresh year, so they are memoised against the volume
  // rather than run on every tick of the clock above. The palette goes last
  // because it only rewrites the legend, and the observance pass does not care
  // what colour a day is.
  /**
   * The sheet's year, then the days the archive knows that the sheet does not.
   *
   * Order matters and is not alphabetical: the sheet's own note always wins
   * (withObservances never overwrites one), and between the two overlaid lists
   * the Embassy's own days come first, so a day this office keeps is never
   * displaced by a provincial feast that happens to fall on it.
   */
  const year = useMemo(
    () => (source
      ? withParchmentPalette(
        withObservances(source, [...EMBASSY_OBSERVANCES, ...TAMRIELIC_HOLIDAYS]),
      )
      : null),
    [source],
  );

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The calendar could not be read" body={volume.message} />;
  }
  if (!year) return <Consulting />;

  const days = year.months.flatMap((month) => month.weeks.flat());
  const noted = days.filter((day): day is CalendarDay => day?.event != null);

  // The sheet keeps one year. Once the realm passes into the next, its grid is
  // last year's and nothing in it is today — so the mark is withheld rather
  // than put on the same day number of the wrong year.
  const sheetYear = /\b\dE\s*(\d+)\b/.exec(year.title)?.[1];
  const showsThisYear = !sheetYear || Number(sheetYear) === now.year;

  const isCurrentMonth = (monthIndex: number) => showsThisYear && monthIndex === now.monthIndex;
  const isToday = (monthIndex: number, day: number) =>
    isCurrentMonth(monthIndex) && day === now.day;

  // Only the sheet can say which weekday a date falls on, or what the Embassy
  // has written against it, so today's cell is looked up rather than computed.
  const today = showsThisYear
    ? year.months
        .find((m) => m.index === now.monthIndex)
        ?.weeks.flat()
        .find((d): d is CalendarDay => d?.day === now.day) ?? null
    : null;

  return (
    <Page
      title={year.title || 'Tamrielic Calendar'}
      subtitle="Observances & Reckonings"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={[
          { label: 'Months', value: figure(year.months.length) },
          { label: 'Days reckoned', value: figure(days.filter(Boolean).length) },
          { label: 'Marked days', value: figure(noted.length) },
        ]}
      />

      <InWorldPlate today={today} />

      <div className="year">
        {year.months.map((month) => (
          <section
            className={`month${isCurrentMonth(month.index) ? ' month--current' : ''}`}
            key={`${month.index}-${month.name}`}
          >
            <h2 className="month__name">{month.name}</h2>
            <div className="month__grid">
              {year.weekdays.map((weekday) => (
                // Full name for screen readers, initial for the eye.
                <div className="month__weekday" key={weekday}>
                  <abbr title={weekday}>{weekday.slice(0, 2)}</abbr>
                </div>
              ))}
              {month.weeks.flat().map((day, index) => {
                if (!day) {
                  return <div className="day day--empty" key={`empty-${index}`} aria-hidden />;
                }
                const legend = year.legend.find((entry) => entry.label === day.kind);
                const current = isToday(month.index, day.day);
                const className =
                  `day${day.event ? ' day--event' : ''}${current ? ' day--today' : ''}`;

                // A plain day is not interactive, and a button would promise a
                // keyboard user something to do with it.
                if (!day.event && !current) {
                  return (
                    <div
                      className={className}
                      key={`${month.name}-${day.day}`}
                      style={{ background: legend?.color }}
                      title={dayTitle(day)}
                    >
                      {day.day}
                    </div>
                  );
                }

                const chosen = choice?.day === day && choice.month === month.name;
                return (
                  <button
                    type="button"
                    className={`${className}${chosen ? ' day--chosen' : ''}`}
                    key={`${month.name}-${day.day}`}
                    style={{ background: legend?.color }}
                    // Kept for the mouse, which gets the note without a click.
                    // It is not what carries the note — see below.
                    title={current ? `Today — ${dayTitle(day)}` : dayTitle(day)}
                    aria-current={current ? 'date' : undefined}
                    aria-expanded={day.event ? chosen : undefined}
                    aria-label={
                      day.event
                        ? `${current ? 'Today. ' : ''}${month.name} ${day.day}: ${day.event.name}. ${day.event.caution}`
                        : `Today, ${month.name} ${day.day}`
                    }
                    onClick={() =>
                      setChoice(chosen ? null : { month: month.name, day })
                    }
                  >
                    {day.day}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky to the foot of the viewport rather than sitting under the grid:
          a reader who taps a day in Evening Star should not have to go looking
          for what they just opened. */}
      {choice && (
        <aside className="daynote" role="status">
          <div className="daynote__body">
            <p className="daynote__date">
              {choice.month} {choice.day.day}
              <span className="daynote__weekday">{choice.day.weekday}</span>
            </p>
            {choice.day.event ? (
              <>
                <p className="daynote__name">{choice.day.event.name}</p>
                {choice.day.event.caution && (
                  <p className="daynote__caution">{choice.day.event.caution}</p>
                )}
              </>
            ) : (
              <p className="daynote__name">{choice.day.kind || 'An ordinary day'}</p>
            )}
          </div>
          <button
            type="button"
            className="daynote__close"
            onClick={() => setChoice(null)}
            aria-label="Close this day"
          >
            ×
          </button>
        </aside>
      )}

      <div className="legend">
        {year.legend.map((entry) => (
          <div className="legend__item" key={entry.color}>
            <span className="legend__swatch" style={{ background: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>

    </Page>
  );
}

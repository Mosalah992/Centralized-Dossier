// Hall of Honor and the Tamrielic Calendar.

import { useEffect, useMemo, useState } from 'react';
import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import type { CalendarDay } from '../../../shared/types';
import { MONTHS } from '../../../shared/parsers/calendar';
import { clockParts, machineHour, reckon, type InWorldMoment } from '../../../shared/reckoning';
import { withObservances } from '../../../shared/observances';
import { withParchmentPalette } from '../../../shared/parchment';
import indumoril from '../assets/indumoril.jpg';
import ganaril from '../assets/ganaril.jpg';
import malen from '../assets/malen.jpg';
import celerielElvander from '../assets/celeriel-elvander.webp';
import akira from '../assets/akira.webp';

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
 * The period is a parameter because two things want this at different rates and
 * one of them is expensive: the hourglass wants a tick a second, while the grid
 * only needs to know which of 365 cells is today. Re-rendering the whole year
 * once a second to move a highlight that changes at midnight would be wasteful,
 * so the plate keeps its own fast clock and the view runs slow.
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
function Hourglass({ fraction }: { fraction: number }) {
  const NECK = 50;
  const TOP = 12;
  const FLOOR = 88;

  // Upper sand drains toward the neck; lower sand climbs from the floor.
  const upperSurface = TOP + (NECK - TOP) * fraction;
  const lowerSurface = FLOOR - (FLOOR - NECK) * fraction;
  const draining = fraction > 0.002 && fraction < 0.998;

  return (
    /* Hidden from the reading order: the hour is written out beside it, and a
       description of the sand would only say the same thing twice. */
    <svg className="sandglass" viewBox="0 0 60 100" aria-hidden focusable="false">
      <defs>
        {/* The sand is drawn as plain rectangles and cut to the bulbs, so the
            cone the eye expects comes from the glass rather than from geometry
            that would have to be recomputed at every level. */}
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
        <rect
          x="12" width="36"
          y={upperSurface}
          height={Math.max(0, NECK - upperSurface)}
          clipPath="url(#sandglass-upper)"
        />
        <rect
          x="12" width="36"
          y={lowerSurface}
          height={Math.max(0, FLOOR - lowerSurface)}
          clipPath="url(#sandglass-lower)"
        />
      </g>

      {/* Grains rather than a bar: a dashed stroke whose offset is animated
          reads as falling, where a solid rectangle would just sit there. */}
      {draining && (
        <line className="sandglass__fall" x1="30" y1="49" x2="30" y2={Math.max(50, lowerSurface)} />
      )}
    </svg>
  );
}

/** The plate above the year: what day it is in the realm, and what hour. */
function InWorldPlate({ today }: { today: CalendarDay | null }) {
  // A second is finer than the display needs, but the sand moves continuously
  // and a coarser tick makes it visibly step.
  const now = useInWorldNow(1000);
  const month = MONTHS[now.monthIndex - 1] ?? '';
  const { clock, meridiem } = clockParts(now);

  return (
    <aside className="reckoning">
      <Hourglass fraction={now.dayFraction} />

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
    </aside>
  );
}

export function CalendarView() {
  const volume = useVolume('calendar');
  // Slow: this only decides which cell wears the mark, and that changes at
  // midnight. The plate below keeps the fast clock.
  const now = useInWorldNow(30_000);

  const source = volume.state === 'ready' ? volume.value.data : null;
  // Both passes allocate a fresh year, so they are memoised against the volume
  // rather than run on every tick of the clock above. The palette goes last
  // because it only rewrites the legend, and the observance pass does not care
  // what colour a day is.
  const year = useMemo(
    () => (source ? withParchmentPalette(withObservances(source)) : null),
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
                return (
                  <div
                    className={`day${day.event ? ' day--event' : ''}${current ? ' day--today' : ''}`}
                    key={`${month.name}-${day.day}`}
                    style={{ background: legend?.color }}
                    title={current ? `Today — ${dayTitle(day)}` : dayTitle(day)}
                    // Only marked days are worth stopping on with a keyboard —
                    // and today, which a reader arriving at the volume is most
                    // likely to be looking for.
                    tabIndex={day.event || current ? 0 : undefined}
                    aria-current={current ? 'date' : undefined}
                    aria-label={
                      day.event
                        ? `${current ? 'Today. ' : ''}${month.name} ${day.day}: ${day.event.name}. ${day.event.caution}`
                        : current
                          ? `Today, ${month.name} ${day.day}`
                          : undefined
                    }
                  >
                    {day.day}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

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

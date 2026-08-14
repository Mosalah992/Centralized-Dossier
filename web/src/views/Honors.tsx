// Hall of Honor and the Tamrielic Calendar.

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import type { CalendarDay } from '../../../shared/types';
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
      'Unwaveringly loyal to the Thalmor, serving the Dominion with consistency and distinction, even when his heart may occasionally favor Riften.',
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
      {/* "emissaries", not "hall": the shelf owns .hall, and its viewport-wide
          candle-light pseudo-elements followed the class onto this page. */}
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

export function CalendarView() {
  const volume = useVolume('calendar');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The calendar could not be read" body={volume.message} />;
  }

  const year = volume.value.data;
  const days = year.months.flatMap((month) => month.weeks.flat());
  const noted = days.filter((day): day is CalendarDay => day?.event != null);

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

      <div className="year">
        {year.months.map((month) => (
          <section className="month" key={`${month.index}-${month.name}`}>
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
                return (
                  <div
                    className={`day${day.event ? ' day--event' : ''}`}
                    key={`${month.name}-${day.day}`}
                    style={{ background: legend?.color }}
                    title={dayTitle(day)}
                    // Only marked days are worth stopping on with a keyboard.
                    tabIndex={day.event ? 0 : undefined}
                    aria-label={
                      day.event
                        ? `${month.name} ${day.day}: ${day.event.name}. ${day.event.caution}`
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

      {noted.length > 0 && (
        <div className="table-frame">
          <table>
            <caption>Marked days of the year</caption>
            <thead>
              <tr>
                <th scope="col">Observance</th>
                <th scope="col">Date</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {noted.map((day) => (
                <tr key={`${day.event!.name}-${day.event!.date}`}>
                  <th scope="row">{day.event!.name}</th>
                  <td>{day.event!.date}</td>
                  <td className="wrap">{day.event!.caution || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

// Hall of Honor and the Tamrielic Calendar.

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import type { CalendarDay } from '../../../shared/types';

export function HonorView() {
  const volume = useVolume('honor');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The hall could not be read" body={volume.message} />;
  }

  const entries = volume.value.data;

  return (
    <Page
      title="Hall of Honor"
      subtitle="Those Remembered by the Dominion"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <ul className="citations">
        {entries.map((entry) => (
          <li className="citation" key={entry.row}>
            <p className="citation__name">{entry.name}</p>
            {entry.citation && <p className="citation__text">{entry.citation}</p>}
          </li>
        ))}
      </ul>
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

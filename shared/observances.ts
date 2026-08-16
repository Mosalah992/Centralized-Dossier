// Observances the Embassy keeps itself.
//
// The Tamrielic Calendar is sheet-backed, and the sheet is the authority on what
// a day means: its colour gives the kind, its hover note gives the observance.
// That is the right arrangement and this module does not disturb it — the
// archive holds a readonly token by design (see server/gsheets.ts), because the
// clock-in bot writes to the same spreadsheet and a bug here must not be able to
// reach its columns. So a day the Embassy wants marked cannot be marked by
// writing to the sheet from this side.
//
// It is instead overlaid at read time, and only ever onto a day the sheet has
// left unmarked. If the same observance is later written into the sheet's own
// note, the sheet wins and the overlay falls away silently — which is what
// should happen, since the sheet is where this properly belongs. Moving one of
// these into the sheet is a deletion here, not a migration.

import type { CalendarEvent, CalendarYear } from './types';

export interface Observance {
  /** 1-based position in the Tamrielic year. */
  monthIndex: number;
  day: number;
  name: string;
  /** The line beneath the date, as the sheet's own notes carry one. */
  note: string;
}

export const EMBASSY_OBSERVANCES: readonly Observance[] = [
  {
    monthIndex: 9, // Heartfire
    day: 4,
    name: 'Thalmor Portrait Day',
    note: 'The Embassy sat for its official portrait.',
  },
] as const;

/**
 * The era-year the sheet is keeping, e.g. `4E 226` from "Tamrielic Calendar
 * 4E 226". Taken from the title rather than assumed, so the date line on an
 * overlaid observance turns with the sheet when 4E 227 arrives.
 */
function eraYear(year: CalendarYear): string {
  const match = /\b(\d)E\s*(\d+)\b/.exec(year.title);
  return match ? `${match[1]}E ${match[2]}` : '';
}

/**
 * Overlay the Embassy's own observances onto a parsed year.
 *
 * Returns a new year rather than mutating: the parsed volume arrives from a
 * cache that may hand the same object to the next reader, and marking it in
 * place would accumulate.
 */
export function withObservances(
  year: CalendarYear,
  observances: readonly Observance[] = EMBASSY_OBSERVANCES,
): CalendarYear {
  if (!observances.length) return year;

  const era = eraYear(year);

  return {
    ...year,
    months: year.months.map((month) => {
      const forMonth = observances.filter((o) => o.monthIndex === month.index);
      if (!forMonth.length) return month;

      return {
        ...month,
        weeks: month.weeks.map((week) =>
          week.map((day) => {
            if (!day) return day;
            const match = forMonth.find((o) => o.day === day.day);
            // The sheet's own note is never overwritten.
            if (!match || day.event) return day;

            const event: CalendarEvent = {
              name: match.name,
              date: era ? `${month.name} ${day.day}, ${era}` : `${month.name} ${day.day}`,
              caution: match.note,
            };
            return { ...day, event };
          }),
        ),
      };
    }),
  };
}

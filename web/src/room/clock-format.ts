// The in-world date as the room's plate writes it: "4th of Heartfire, 4E 226".
//
// The reckoning itself is shared/reckoning.ts; this only words it. There is no
// weekday: only the sheet's calendar grid knows which weekday a date falls on
// (see the note in views/Honors.tsx), and the room does not fetch the sheet to
// tell the time.

import { MONTHS } from '../../../shared/parsers/calendar';
import { clockParts, type InWorldMoment } from '../../../shared/reckoning';

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export interface PlateReading {
  /** "4th of Heartfire" */
  date: string;
  /** "4E 226" */
  era: string;
  clock: string;
  meridiem: 'AM' | 'PM';
  /** "4E 226-09-04T18:04", for <time dateTime> — the in-world moment, not a real one. */
  label: string;
}

export function plateReading(moment: InWorldMoment): PlateReading {
  const month = MONTHS[moment.monthIndex - 1] ?? '';
  const { clock, meridiem } = clockParts(moment);
  return {
    date: `${ordinal(moment.day)} of ${month}`,
    era: `4E ${moment.year}`,
    clock,
    meridiem,
    label: `${ordinal(moment.day)} of ${month}, 4E ${moment.year}, ${clock} ${meridiem}`,
  };
}

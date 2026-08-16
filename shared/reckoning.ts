// Reckoning the in-world hour.
//
// The Tamrielic Calendar volume renders a year the sheet holds. This module
// answers the other question — what day is it *now* — and it is the only place
// in the archive that knows.
//
// THE RATE IS 1:1. One real day is one in-world day, and the clock runs at the
// speed of the one on your wall. This is not an assumption: the informant
// reports already reckoned that way. 131 of the 132 reports that state an
// in-world date name the month they were filed in, so Rain's Hand answered to
// April and Last Seed to August across four months of filings. A faster rate
// would also exhaust the sheet — it holds a single year, 4E 226, and at
// Skyrim's own timescale of 20 the archive would run out of calendar in
// eighteen days.
//
// WHY THE YEAR IS COUNTED IN DAYS AND NOT READ OFF A Date. The twelve Tamrielic
// months happen to carry the same lengths as the Gregorian ones — 31, 28, 31,
// 30 … — which makes it tempting to shift a Date by the offset and read its
// month and day straight out. That works until 2028, when a leap day lands and
// the archive reports Sun's Dawn 29, a date that does not exist. The Tamrielic
// year is 365 days, always. So elapsed time is counted in whole days from a
// fixed anchor and converted through the month table below, and February's
// irregularities never enter into it.
//
// EVERYTHING HERE IS UTC. `Date.now()` is an instant, not a civil time, and no
// local field is ever read. A reader in Cairo and a reader in Seattle are told
// the same in-world hour, which is the point — the realm has one clock.

/** Days in each Tamrielic month, in order. Sums to 365. */
export const MONTH_LENGTHS: readonly number[] = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

export const DAYS_PER_YEAR = 365;
const MINUTES_PER_DAY = 24 * 60;

/**
 * The anchor: one real instant paired with the in-world moment it was declared
 * to be. Everything else is arithmetic from here, so correcting the archive's
 * clock means editing this and nothing else.
 *
 * Given as Heartfire 4, 4E 226 at 18:04 on 2026-08-16. That fixes the date
 * offset at exactly +19 days, which is worth stating because it is checkable:
 * 2026-08-16 is the 228th day of the year, and the 247th day of a Tamrielic
 * year is Heartfire 4.
 *
 * The minute is the soft part. It was set from the moment the declaration
 * arrived, so it is accurate to a few minutes rather than to the second; the
 * only thing that turns on it is exactly when midnight falls.
 */
const ANCHOR = {
  realMs: Date.UTC(2026, 7, 16, 20, 4, 0),
  year: 226,
  /** Heartfire 4 — the 247th day of the year. */
  dayOfYear: 247,
  minuteOfDay: 18 * 60 + 4,
} as const;

export interface InWorldMoment {
  /** Fourth Era year, e.g. 226. */
  year: number;
  /** 1-based position in the Tamrielic year. */
  monthIndex: number;
  /** Day of the month, 1-based. */
  day: number;
  /** 1-based day of the year, 1..365. */
  dayOfYear: number;
  hour: number;
  minute: number;
  /** Fraction of the day elapsed, 0 at midnight and 1 at the next. */
  dayFraction: number;
}

/** Day of the year (1-based) to its month and day. */
export function fromDayOfYear(dayOfYear: number): { monthIndex: number; day: number } {
  let remaining = dayOfYear;
  for (let i = 0; i < MONTH_LENGTHS.length; i++) {
    const length = MONTH_LENGTHS[i]!;
    if (remaining <= length) return { monthIndex: i + 1, day: remaining };
    remaining -= length;
  }
  // Unreachable for 1..365; the last month closes the year.
  return { monthIndex: 12, day: MONTH_LENGTHS[11]! };
}

/** A month and day to its 1-based day of the year. */
export function toDayOfYear(monthIndex: number, day: number): number {
  let total = day;
  for (let i = 0; i < monthIndex - 1; i++) total += MONTH_LENGTHS[i]!;
  return total;
}

/**
 * The in-world moment at a real instant. Pure — pass `Date.now()`, or any other
 * instant to reckon a different one.
 */
export function reckon(nowMs: number = Date.now()): InWorldMoment {
  const elapsedMinutes = (nowMs - ANCHOR.realMs) / 60_000;
  const totalMinutes = Math.floor(ANCHOR.minuteOfDay + elapsedMinutes);

  // Floor division, so instants before the anchor reckon backwards correctly
  // rather than truncating toward zero and losing a day.
  const dayShift = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const minuteOfDay = totalMinutes - dayShift * MINUTES_PER_DAY;

  let dayOfYear = ANCHOR.dayOfYear + dayShift;
  let year = ANCHOR.year;
  while (dayOfYear > DAYS_PER_YEAR) {
    dayOfYear -= DAYS_PER_YEAR;
    year++;
  }
  while (dayOfYear < 1) {
    dayOfYear += DAYS_PER_YEAR;
    year--;
  }

  const { monthIndex, day } = fromDayOfYear(dayOfYear);

  return {
    year,
    monthIndex,
    day,
    dayOfYear,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    dayFraction: minuteOfDay / MINUTES_PER_DAY,
  };
}

/**
 * The hour as the Embassy writes it: a 24-hour clock, zero-padded. The registers
 * are set in tracked capitals and a lowercase "pm" reads as a blot among them.
 */
export const formatHour = (moment: InWorldMoment): string =>
  `${String(moment.hour).padStart(2, '0')}:${String(moment.minute).padStart(2, '0')}`;

// Reckoning the in-world hour.
//
// The Tamrielic Calendar volume renders a year the sheet holds. This module
// answers the other question — what day is it *now* — and it is the only place
// in the archive that knows.
//
// THE RATE IS 2:1 — two in-world minutes for every real one, so a real day is
// two days in the realm.
//
// This was first built at 1:1 and that was wrong. The argument for it was that
// the informant reports already reckoned that way: 131 of the 132 reports that
// state an in-world date name the month they were filed in, so Rain's Hand
// answered to April and Last Seed to August. That is real, but it is a historical
// MAPPING and not the current RATE, and it was over-read as the second.
//
// The rate is now measured rather than inferred, from two readings of the realm's
// own clock 15.74 real hours apart:
//
//   Heartfire 4, 18:04   at 2026-08-16 20:05 UTC
//   Heartfire 6, 01:26   at 2026-08-17 11:46 UTC
//
//   31.37 in-world hours / 15.74 real hours = 1.9931
//
// which is 2 to within 0.35%, and the whole of that residue is the first
// reading's minute — it was taken from when the declaration arrived rather than
// from a clock. Solving for exactly 2 puts the anchor at 20:05 rather than the
// 20:04 first used, one minute away, and both readings then agree.
//
// A GUESS AT THE RATE COMPOUNDS, which is why this is worth measuring and worth
// re-measuring. An error in the anchor is a fixed offset and stays the size it
// started; an error in the rate grows, and 1:1 against a realm running at 2:1
// had the archive a full 15.6 hours behind after only a day. If the realm is
// ever re-set, take two readings a few hours apart and check RATE before
// touching ANCHOR.
//
// The rate is also survivable for the sheet, which holds a single year: 4E 226
// takes about six real months to run at 2:1. Skyrim's own timescale of 20 would
// exhaust it in eighteen days.
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
 * How fast the realm runs against the world. Two in-world minutes per real one.
 *
 * Measured, not chosen — see the note at the top of this file. Nothing else here
 * assumes a particular value, so re-measuring the realm means editing this line.
 */
export const RATE = 2;

/**
 * The anchor: one real instant paired with the in-world moment it was declared
 * to be. Everything else is arithmetic from here, so correcting the archive's
 * clock means editing this and RATE and nothing else.
 *
 * Set to 20:05 rather than the 20:04 first recorded, because that is the minute
 * at which both readings of the realm's clock agree at a rate of exactly 2. The
 * original was taken from when the declaration arrived and was never better
 * than a few minutes; the second reading is what pins it down.
 *
 * Note that at 2:1 there is no fixed offset in days to check this against. The
 * realm gains a day on the world every real day, so the +19 that held on
 * 2026-08-16 is only a fact about that afternoon.
 */
const ANCHOR = {
  realMs: Date.UTC(2026, 7, 16, 20, 5, 0),
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
  const elapsedMinutes = ((nowMs - ANCHOR.realMs) / 60_000) * RATE;
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
 * The hour split into the face and the half of the day it falls in, so the
 * meridiem can be set apart from the numerals — it is lettering among figures,
 * and at the same size it reads as part of the number.
 *
 * Noon and midnight are the two the twelve-hour clock gets wrong if written
 * naively: `hour % 12` makes both of them 0, and neither is the zeroth hour of
 * anything. They are 12 PM and 12 AM.
 */
export function clockParts(moment: InWorldMoment): { clock: string; meridiem: 'AM' | 'PM' } {
  const onFace = moment.hour % 12 === 0 ? 12 : moment.hour % 12;
  return {
    clock: `${onFace}:${String(moment.minute).padStart(2, '0')}`,
    meridiem: moment.hour < 12 ? 'AM' : 'PM',
  };
}

/** The hour as the Embassy writes it, e.g. `6:04 PM`. */
export function formatHour(moment: InWorldMoment): string {
  const { clock, meridiem } = clockParts(moment);
  return `${clock} ${meridiem}`;
}

/**
 * The same hour on a 24-hour clock, for the `datetime` attribute — a machine
 * reading the page should not have to parse a meridiem.
 */
export const machineHour = (moment: InWorldMoment): string =>
  `${String(moment.hour).padStart(2, '0')}:${String(moment.minute).padStart(2, '0')}`;

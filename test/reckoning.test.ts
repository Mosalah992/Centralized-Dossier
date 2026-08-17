import { describe, expect, it } from 'vitest';

import {
  DAYS_PER_YEAR, MONTH_LENGTHS, clockParts, formatHour, fromDayOfYear, machineHour,
  reckon, toDayOfYear,
} from '../shared/reckoning';
import { MONTHS } from '../shared/parsers/calendar';

/** The instant the archive's clock was set by. */
const ANCHOR_MS = Date.UTC(2026, 7, 16, 20, 5, 0);
const DAY_MS = 86_400_000;
/** One in-world day costs half a real one at 2:1. */
const WORLD_DAY_MS = DAY_MS / 2;

describe('the Tamrielic year', () => {
  it('is 365 days across twelve months', () => {
    expect(MONTH_LENGTHS).toHaveLength(12);
    expect(MONTH_LENGTHS.reduce((a, b) => a + b, 0)).toBe(DAYS_PER_YEAR);
  });

  it('names a month for every day of it, and round-trips', () => {
    for (let d = 1; d <= DAYS_PER_YEAR; d++) {
      const { monthIndex, day } = fromDayOfYear(d);
      expect(monthIndex).toBeGreaterThanOrEqual(1);
      expect(monthIndex).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(MONTH_LENGTHS[monthIndex - 1]!);
      expect(toDayOfYear(monthIndex, day)).toBe(d);
    }
  });

  it('puts the first and last days where they belong', () => {
    expect(fromDayOfYear(1)).toEqual({ monthIndex: 1, day: 1 });
    expect(fromDayOfYear(DAYS_PER_YEAR)).toEqual({ monthIndex: 12, day: 31 });
  });
});

describe('the anchor', () => {
  it('reads Heartfire 4, 4E 226 at 18:04', () => {
    const now = reckon(ANCHOR_MS);
    expect(MONTHS[now.monthIndex - 1]).toBe('Heartfire');
    expect(now.day).toBe(4);
    expect(now.year).toBe(226);
    expect(formatHour(now)).toBe('6:04 PM');
  });

  /**
   * The observation the rate was measured from, and the one this file exists to
   * defend. A wrong RATE compounds where a wrong anchor does not, and the first
   * build of this module had the archive 15.6 hours behind the realm within a
   * day by assuming 1:1. If the realm is re-set, this is the test to change.
   */
  it('reads Heartfire 6 at 01:26 fifteen and three quarter real hours later', () => {
    const reading = Date.UTC(2026, 7, 17, 11, 46, 0);
    const then = reckon(reading);
    expect(MONTHS[then.monthIndex - 1]).toBe('Heartfire');
    expect(then.day).toBe(6);
    expect(formatHour(then)).toBe('1:26 AM');
  });

  it('runs at two in-world minutes per real minute', () => {
    const hour = 3_600_000;
    const a = reckon(ANCHOR_MS);
    const b = reckon(ANCHOR_MS + hour);
    const advanced = (b.dayOfYear - a.dayOfYear) * 1440
      + (b.hour * 60 + b.minute) - (a.hour * 60 + a.minute);
    expect(advanced).toBe(120);
  });
});

describe('the clock flows on', () => {
  it('advances two in-world days per real day', () => {
    for (const days of [1, 7, 30, 200]) {
      const then = reckon(ANCHOR_MS + days * WORLD_DAY_MS);
      const expected = ((247 + days - 1) % DAYS_PER_YEAR) + 1;
      expect(then.dayOfYear).toBe(expected);
      // The hour is untouched by whole days passing.
      expect(formatHour(then)).toBe('6:04 PM');
    }
  });

  it('runs the hour at twice the pace of real minutes', () => {
    expect(formatHour(reckon(ANCHOR_MS + 30_000))).toBe('6:05 PM');
    expect(formatHour(reckon(ANCHOR_MS + 30 * 60_000))).toBe('7:04 PM');
  });

  it('rolls the date at midnight, not before', () => {
    // 18:04 to 24:00 is 5h56m.
    const toMidnight = ((5 * 60 + 56) * 60_000) / 2;
    expect(reckon(ANCHOR_MS + toMidnight - 30_000).day).toBe(4);
    expect(formatHour(reckon(ANCHOR_MS + toMidnight - 30_000))).toBe('11:59 PM');

    const justAfter = reckon(ANCHOR_MS + toMidnight);
    expect(justAfter.day).toBe(5);
    expect(formatHour(justAfter)).toBe('12:00 AM');
  });

  it('turns the year at Evening Star 31 and counts the era on', () => {
    // Heartfire 4 to Evening Star 31 is 365 - 247 = 118 days.
    const lastDay = reckon(ANCHOR_MS + 118 * WORLD_DAY_MS);
    expect(lastDay.year).toBe(226);
    expect(MONTHS[lastDay.monthIndex - 1]).toBe('Evening Star');
    expect(lastDay.day).toBe(31);

    const newYear = reckon(ANCHOR_MS + 119 * WORLD_DAY_MS);
    expect(newYear.year).toBe(227);
    expect(newYear.dayOfYear).toBe(1);
    expect(MONTHS[newYear.monthIndex - 1]).toBe('Morning Star');
    expect(newYear.day).toBe(1);
  });

  it('never reports a leap day, however many years pass', () => {
    // 2028 is a leap year in the real world. The Tamrielic year is not, and a
    // date shifted through a Date object would report Sun's Dawn 29 here.
    for (let d = 0; d < 365 * 6; d++) {
      const m = reckon(ANCHOR_MS + d * WORLD_DAY_MS);
      expect(m.day).toBeLessThanOrEqual(MONTH_LENGTHS[m.monthIndex - 1]!);
      expect(m.dayOfYear).toBeGreaterThanOrEqual(1);
      expect(m.dayOfYear).toBeLessThanOrEqual(DAYS_PER_YEAR);
    }
  });

  it('reckons backwards through the anchor without losing a day', () => {
    const yesterday = reckon(ANCHOR_MS - WORLD_DAY_MS);
    expect(yesterday.day).toBe(3);
    expect(formatHour(yesterday)).toBe('6:04 PM');

    // 18h05m before the anchor is the previous day at 23:59.
    const before = reckon(ANCHOR_MS - ((18 * 60 + 5) * 60_000) / 2);
    expect(before.day).toBe(3);
    expect(formatHour(before)).toBe('11:59 PM');
  });

  it('turns the year backwards too', () => {
    // 247 days before Heartfire 4 is Morning Star 1 of the same year; one more
    // steps back into 4E 225.
    const first = reckon(ANCHOR_MS - 246 * WORLD_DAY_MS);
    expect(first.year).toBe(226);
    expect(first.dayOfYear).toBe(1);

    const previous = reckon(ANCHOR_MS - 247 * WORLD_DAY_MS);
    expect(previous.year).toBe(225);
    expect(previous.dayOfYear).toBe(DAYS_PER_YEAR);
  });
});

describe('the twelve-hour face', () => {
  /** Minutes past the anchor that land on a given 24-hour time. */
  const at = (hour: number, minute: number) =>
    ANCHOR_MS + (((hour * 60 + minute) - (18 * 60 + 4)) * 60_000) / 2;

  it('writes noon and midnight as twelve, not zero', () => {
    // `hour % 12` makes both of these 0, and neither is the zeroth hour.
    expect(formatHour(reckon(at(0, 0)))).toBe('12:00 AM');
    expect(formatHour(reckon(at(12, 0)))).toBe('12:00 PM');
    expect(formatHour(reckon(at(0, 30)))).toBe('12:30 AM');
    expect(formatHour(reckon(at(12, 30)))).toBe('12:30 PM');
  });

  it('turns over from AM to PM at noon and back at midnight', () => {
    expect(clockParts(reckon(at(11, 59))).meridiem).toBe('AM');
    expect(clockParts(reckon(at(12, 0))).meridiem).toBe('PM');
    expect(clockParts(reckon(at(23, 59))).meridiem).toBe('PM');
    expect(clockParts(reckon(at(0, 0))).meridiem).toBe('AM');
  });

  it('drops the leading zero from the hour but keeps it on the minute', () => {
    expect(formatHour(reckon(at(9, 5)))).toBe('9:05 AM');
    expect(formatHour(reckon(at(13, 7)))).toBe('1:07 PM');
  });

  it('covers all 1440 minutes without a malformed or duplicate face', () => {
    const seen = new Set<string>();
    // Half a real minute per step, because a whole one is two in-world minutes
    // and would walk the clock past every odd minute of the day.
    for (let m = 0; m < 1440; m++) {
      const face = formatHour(reckon(at(0, 0) + m * 30_000));
      expect(face).toMatch(/^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/);
      seen.add(face);
    }
    expect(seen.size).toBe(1440);
  });

  it('keeps a 24-hour reading for the datetime attribute', () => {
    expect(machineHour(reckon(at(0, 0)))).toBe('00:00');
    expect(machineHour(reckon(at(18, 4)))).toBe('18:04');
    expect(machineHour(reckon(at(23, 59)))).toBe('23:59');
  });
});

describe('the day fraction the hourglass is drawn from', () => {
  it('runs 0 at midnight to just under 1 at the day\'s end', () => {
    const midnight = ANCHOR_MS + ((5 * 60 + 56) * 60_000) / 2;
    expect(reckon(midnight).dayFraction).toBe(0);
    expect(reckon(midnight + 6 * 3_600_000).dayFraction).toBeCloseTo(0.5, 5);
    expect(reckon(midnight + 12 * 3_600_000 - 30_000).dayFraction).toBeCloseTo(1439 / 1440, 5);
  });

  it('never leaves the range, sampled across a year', () => {
    for (let i = 0; i < 2000; i++) {
      const f = reckon(ANCHOR_MS + i * 7 * 3_600_000).dayFraction;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

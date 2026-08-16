import { describe, expect, it } from 'vitest';

import {
  DAYS_PER_YEAR, MONTH_LENGTHS, formatHour, fromDayOfYear, reckon, toDayOfYear,
} from '../shared/reckoning';
import { MONTHS } from '../shared/parsers/calendar';

/** The instant the archive's clock was set by. */
const ANCHOR_MS = Date.UTC(2026, 7, 16, 20, 4, 0);
const DAY_MS = 86_400_000;

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
    expect(formatHour(now)).toBe('18:04');
  });

  it('sits exactly nineteen days ahead of the real date', () => {
    // 2026-08-16 is the 228th day of the year; Heartfire 4 is the 247th.
    expect(reckon(ANCHOR_MS).dayOfYear).toBe(228 + 19);
  });
});

describe('the clock flows on', () => {
  it('advances one in-world day per real day', () => {
    for (const days of [1, 7, 30, 200]) {
      const then = reckon(ANCHOR_MS + days * DAY_MS);
      const expected = ((247 + days - 1) % DAYS_PER_YEAR) + 1;
      expect(then.dayOfYear).toBe(expected);
      // The hour is untouched by whole days passing.
      expect(formatHour(then)).toBe('18:04');
    }
  });

  it('keeps the hour in step with real minutes', () => {
    expect(formatHour(reckon(ANCHOR_MS + 60_000))).toBe('18:05');
    expect(formatHour(reckon(ANCHOR_MS + 60 * 60_000))).toBe('19:04');
  });

  it('rolls the date at midnight, not before', () => {
    // 18:04 to 24:00 is 5h56m.
    const toMidnight = (5 * 60 + 56) * 60_000;
    expect(reckon(ANCHOR_MS + toMidnight - 60_000).day).toBe(4);
    expect(formatHour(reckon(ANCHOR_MS + toMidnight - 60_000))).toBe('23:59');

    const justAfter = reckon(ANCHOR_MS + toMidnight);
    expect(justAfter.day).toBe(5);
    expect(formatHour(justAfter)).toBe('00:00');
  });

  it('turns the year at Evening Star 31 and counts the era on', () => {
    // Heartfire 4 to Evening Star 31 is 365 - 247 = 118 days.
    const lastDay = reckon(ANCHOR_MS + 118 * DAY_MS);
    expect(lastDay.year).toBe(226);
    expect(MONTHS[lastDay.monthIndex - 1]).toBe('Evening Star');
    expect(lastDay.day).toBe(31);

    const newYear = reckon(ANCHOR_MS + 119 * DAY_MS);
    expect(newYear.year).toBe(227);
    expect(newYear.dayOfYear).toBe(1);
    expect(MONTHS[newYear.monthIndex - 1]).toBe('Morning Star');
    expect(newYear.day).toBe(1);
  });

  it('never reports a leap day, however many years pass', () => {
    // 2028 is a leap year in the real world. The Tamrielic year is not, and a
    // date shifted through a Date object would report Sun's Dawn 29 here.
    for (let d = 0; d < 365 * 6; d++) {
      const m = reckon(ANCHOR_MS + d * DAY_MS);
      expect(m.day).toBeLessThanOrEqual(MONTH_LENGTHS[m.monthIndex - 1]!);
      expect(m.dayOfYear).toBeGreaterThanOrEqual(1);
      expect(m.dayOfYear).toBeLessThanOrEqual(DAYS_PER_YEAR);
    }
  });

  it('reckons backwards through the anchor without losing a day', () => {
    const yesterday = reckon(ANCHOR_MS - DAY_MS);
    expect(yesterday.day).toBe(3);
    expect(formatHour(yesterday)).toBe('18:04');

    // 18h05m before the anchor is the previous day at 23:59.
    const before = reckon(ANCHOR_MS - (18 * 60 + 5) * 60_000);
    expect(before.day).toBe(3);
    expect(formatHour(before)).toBe('23:59');
  });

  it('turns the year backwards too', () => {
    // 247 days before Heartfire 4 is Morning Star 1 of the same year; one more
    // steps back into 4E 225.
    const first = reckon(ANCHOR_MS - 246 * DAY_MS);
    expect(first.year).toBe(226);
    expect(first.dayOfYear).toBe(1);

    const previous = reckon(ANCHOR_MS - 247 * DAY_MS);
    expect(previous.year).toBe(225);
    expect(previous.dayOfYear).toBe(DAYS_PER_YEAR);
  });
});

describe('the day fraction the hourglass is drawn from', () => {
  it('runs 0 at midnight to just under 1 at the day\'s end', () => {
    const midnight = ANCHOR_MS + (5 * 60 + 56) * 60_000;
    expect(reckon(midnight).dayFraction).toBe(0);
    expect(reckon(midnight + 12 * 3_600_000).dayFraction).toBeCloseTo(0.5, 5);
    expect(reckon(midnight + 24 * 3_600_000 - 60_000).dayFraction).toBeCloseTo(1439 / 1440, 5);
  });

  it('never leaves the range, sampled across a year', () => {
    for (let i = 0; i < 2000; i++) {
      const f = reckon(ANCHOR_MS + i * 7 * 3_600_000).dayFraction;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

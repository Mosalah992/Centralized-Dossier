import { describe, expect, it } from 'vitest';

import { EMBASSY_OBSERVANCES, withObservances } from '../shared/observances';
import { TAMRIELIC_HOLIDAYS } from '../shared/holidays';
import { CONSTELLATIONS, constellationOf, standing } from '../shared/constellations';
import { MONTH_LENGTHS } from '../shared/reckoning';
import type { CalendarDay, CalendarYear } from '../shared/types';

/**
 * The calendar view overlays both lists in one call, in this order. These tests
 * exercise that exact arrangement against the real data — the modules had sat
 * in the tree fully tested and wired to nothing, so what was missing was never
 * the units but the join.
 */
const OVERLAY = [...EMBASSY_OBSERVANCES, ...TAMRIELIC_HOLIDAYS];

/** A bare year with every day of every month and no notes of its own. */
function emptyYear(): CalendarYear {
  return {
    title: 'Tamrielic Calendar 4E 226',
    weekdays: ['Sundas'],
    legend: [],
    months: MONTH_LENGTHS.map((length, i) => ({
      name: `Month ${i + 1}`,
      index: i + 1,
      weeks: [Array.from({ length }, (_, d): CalendarDay => ({
        day: d + 1, weekday: 'Sundas', kind: 'Ordinary day', event: null,
      }))],
    })),
  };
}

const dayAt = (year: CalendarYear, monthIndex: number, day: number) =>
  year.months.find((m) => m.index === monthIndex)?.weeks.flat().find((d) => d?.day === day);

describe('the overlaid year', () => {
  it('marks every holiday and every Embassy day', () => {
    const marked = withObservances(emptyYear(), OVERLAY);
    for (const o of OVERLAY) {
      expect(dayAt(marked, o.monthIndex, o.day)?.event?.name).toBe(o.name);
    }
  });

  it('adds exactly as many marks as there are entries, and no more', () => {
    const marked = withObservances(emptyYear(), OVERLAY);
    const count = marked.months
      .flatMap((m) => m.weeks.flat())
      .filter((d) => d?.event).length;
    expect(count).toBe(OVERLAY.length);
    expect(count).toBe(22); // 1 Embassy + 21 Tamrielic
  });

  it('never lets a holiday displace a day this office keeps', () => {
    // Portrait Day is Heartfire 4. If a feast is ever added on that date, the
    // Embassy's own entry has to win — which it does because it is listed first
    // and withObservances takes the first match.
    const contested = [
      ...EMBASSY_OBSERVANCES,
      { monthIndex: 9, day: 4, name: 'Some Provincial Feast', note: 'x' },
    ];
    expect(dayAt(withObservances(emptyYear(), contested), 9, 4)?.event?.name)
      .toBe('Thalmor Portrait Day');
  });

  it("never overwrites the sheet's own note, whoever else claims the day", () => {
    const year = emptyYear();
    const sheetDay = dayAt(year, 1, 1)!;
    sheetDay.event = { name: 'What the archivist wrote', date: '', caution: '' };
    // Morning Star 1 is New Life Day in the holiday list.
    expect(dayAt(withObservances(year, OVERLAY), 1, 1)?.event?.name)
      .toBe('What the archivist wrote');
  });

  it('places no holiday on a day its month does not have', () => {
    for (const o of TAMRIELIC_HOLIDAYS) {
      expect(o.day).toBeGreaterThanOrEqual(1);
      expect(o.day).toBeLessThanOrEqual(MONTH_LENGTHS[o.monthIndex - 1]!);
    }
  });
});

describe('the sign in season', () => {
  it('gives every month exactly one sign', () => {
    for (let m = 1; m <= 12; m++) {
      expect(constellationOf(m)).not.toBeNull();
    }
    expect(constellationOf(0)).toBeNull();
    expect(constellationOf(13)).toBeNull();
  });

  it('can be drawn: every line joins two stars that exist', () => {
    // The view renders `lines` as index pairs into `stars`, so an index past
    // the end would silently drop a segment.
    for (const sign of CONSTELLATIONS) {
      expect(sign.stars.length).toBeGreaterThan(0);
      for (const [a, b] of sign.lines) {
        expect(sign.stars[a]).toBeDefined();
        expect(sign.stars[b]).toBeDefined();
      }
    }
  });

  it('keeps every star inside the field the view draws', () => {
    // The viewBox is -8..108; the table's own space is 0..100.
    for (const sign of CONSTELLATIONS) {
      for (const [x, y] of sign.stars) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('reads a standing for every sign, including the one with no season', () => {
    for (const sign of CONSTELLATIONS) {
      expect(standing(sign)).toMatch(/\S/);
    }
    expect(standing(constellationOf(9)!)).toBe('Charge of the Warrior');
  });
});

import { describe, expect, it } from 'vitest';

import { EMBASSY_OBSERVANCES, withObservances } from '../shared/observances';
import type { CalendarDay, CalendarYear } from '../shared/types';

const day = (n: number, event: CalendarDay['event'] = null): CalendarDay => ({
  day: n,
  weekday: 'Sundas',
  kind: 'Ordinary',
  event,
});

/** A year carrying only Heartfire, which is all the overlay touches. */
function heartfireOnly(existing: CalendarDay['event'] = null): CalendarYear {
  return {
    title: '❖ Tamrielic Calendar 4E 226 ❖'.replace(/❖/g, '').trim(),
    weekdays: ['Sundas'],
    legend: [],
    months: [
      { name: 'Heartfire', index: 9, weeks: [[day(3), day(4, existing), day(5)]] },
    ],
  };
}

const heartfire4 = (year: CalendarYear) =>
  year.months[0]!.weeks[0]!.find((d) => d?.day === 4)!;

describe('Embassy observances', () => {
  it('marks Portrait Day on Heartfire 4', () => {
    expect(EMBASSY_OBSERVANCES).toContainEqual(
      expect.objectContaining({ monthIndex: 9, day: 4, name: 'Thalmor Portrait Day' }),
    );

    const marked = heartfire4(withObservances(heartfireOnly()));
    expect(marked.event?.name).toBe('Thalmor Portrait Day');
    expect(marked.event?.date).toBe('Heartfire 4, 4E 226');
    expect(marked.event?.caution).toBe('The Embassy sat for its official portrait.');
  });

  it('leaves the day otherwise as the sheet had it', () => {
    const marked = heartfire4(withObservances(heartfireOnly()));
    expect(marked.kind).toBe('Ordinary');
    expect(marked.weekday).toBe('Sundas');
    expect(marked.day).toBe(4);
  });

  it('touches no other day', () => {
    const year = withObservances(heartfireOnly());
    const others = year.months[0]!.weeks[0]!.filter((d) => d?.day !== 4);
    expect(others.every((d) => d?.event == null)).toBe(true);
  });

  it("never overwrites the sheet's own note", () => {
    const sheetEvent = { name: 'Something the sheet says', date: 'Heartfire 4', caution: '' };
    const marked = heartfire4(withObservances(heartfireOnly(sheetEvent)));
    expect(marked.event).toEqual(sheetEvent);
  });

  it('does not mutate the year it was handed', () => {
    const original = heartfireOnly();
    withObservances(original);
    expect(heartfire4(original).event).toBeNull();
  });

  it('takes the era from the title, so the date line turns with the sheet', () => {
    const next = { ...heartfireOnly(), title: 'Tamrielic Calendar 4E 227' };
    expect(heartfire4(withObservances(next)).event?.date).toBe('Heartfire 4, 4E 227');
  });

  it('still marks the day when the title carries no era', () => {
    const untitled = { ...heartfireOnly(), title: '' };
    expect(heartfire4(withObservances(untitled)).event?.date).toBe('Heartfire 4');
  });

  it('is a no-op when there is nothing to overlay', () => {
    const year = heartfireOnly();
    expect(withObservances(year, [])).toBe(year);
  });
});

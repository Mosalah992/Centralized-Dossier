import { describe, expect, it } from 'vitest';

import { TAMRIELIC_HOLIDAYS } from '../shared/holidays';
import { EMBASSY_OBSERVANCES, withObservances } from '../shared/observances';
import { MONTH_LENGTHS } from '../shared/reckoning';
import { MONTHS } from '../shared/parsers/calendar';
import type { CalendarDay, CalendarYear } from '../shared/types';

/** The eight the source marks Atmoran, which were left out by instruction. */
const ATMORAN = [
  'Feast of New Beginnings',
  "Kyne's Blessing",
  'Day of Fertility',
  "Midsummer's Eve",
  "Kyne's Feast",
  'Autumn Feast',
  'Winternights',
  "Winter's Peak",
];

describe('the realm’s holidays', () => {
  it('keeps no Atmoran feast', () => {
    const names = TAMRIELIC_HOLIDAYS.map((h) => h.name);
    for (const feast of ATMORAN) expect(names).not.toContain(feast);
  });

  /* Both days carried an Atmoran feast *and* a summoning in the source. Losing
     the feast must not have taken the summoning with it. */
  it('keeps the summonings that shared a day with a dropped feast', () => {
    const on = (monthIndex: number, day: number) =>
      TAMRIELIC_HOLIDAYS.find((h) => h.monthIndex === monthIndex && h.day === day);

    expect(on(3, 21)?.name).toBe('Summoning Day of Azura');
    expect(on(12, 20)?.name).toBe('Summoning Day of Molag Bal');
  });

  it('marks all sixteen Daedric princes’ summoning days', () => {
    const summonings = TAMRIELIC_HOLIDAYS.filter((h) =>
      h.name.startsWith('Summoning Day of'),
    );
    // New Life Day carries Clavicus Vile's in its note rather than its name, so
    // the roll of princes is one longer than the count of summoning entries.
    expect(summonings).toHaveLength(15);
    expect(TAMRIELIC_HOLIDAYS.find((h) => h.monthIndex === 1 && h.day === 1)?.note)
      .toMatch(/Clavicus Vile/);
  });

  it('falls on a day the month actually has', () => {
    for (const holiday of TAMRIELIC_HOLIDAYS) {
      expect(holiday.monthIndex, holiday.name).toBeGreaterThanOrEqual(1);
      expect(holiday.monthIndex, holiday.name).toBeLessThanOrEqual(12);
      expect(holiday.day, holiday.name).toBeGreaterThanOrEqual(1);
      expect(holiday.day, holiday.name).toBeLessThanOrEqual(
        MONTH_LENGTHS[holiday.monthIndex - 1]!,
      );
    }
  });

  it('claims no date twice', () => {
    const dates = TAMRIELIC_HOLIDAYS.map((h) => `${h.monthIndex}-${h.day}`);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('gives every holiday a line beneath its name', () => {
    for (const holiday of TAMRIELIC_HOLIDAYS) {
      expect(holiday.name.length, holiday.name).toBeGreaterThan(3);
      expect(holiday.note.length, holiday.name).toBeGreaterThan(10);
    }
  });

  it('runs in calendar order, so the file reads as the year does', () => {
    const keyed = TAMRIELIC_HOLIDAYS.map((h) => h.monthIndex * 100 + h.day);
    expect(keyed).toEqual([...keyed].sort((a, b) => a - b));
  });
});

/* One month, marked wherever the overlay says, so precedence can be exercised
   without standing up a whole year. */
function monthOf(index: number, existing?: Record<number, CalendarDay['event']>): CalendarYear {
  const length = MONTH_LENGTHS[index - 1]!;
  const days: CalendarDay[] = Array.from({ length }, (_, i) => ({
    day: i + 1,
    weekday: 'Sundas',
    kind: 'Ordinary',
    event: existing?.[i + 1] ?? null,
  }));

  return {
    title: 'Tamrielic Calendar 4E 226',
    weekdays: ['Sundas'],
    legend: [],
    months: [{ name: MONTHS[index - 1]!, index, weeks: [days] }],
  };
}

const dayIn = (year: CalendarYear, day: number) =>
  year.months[0]!.weeks[0]!.find((d) => d?.day === day)!;

describe('laying the holidays over the sheet', () => {
  const OVERLAY = [...EMBASSY_OBSERVANCES, ...TAMRIELIC_HOLIDAYS];

  it('writes a holiday onto an unmarked day', () => {
    const marked = withObservances(monthOf(1), OVERLAY);
    expect(dayIn(marked, 1).event?.name).toBe('New Life Day');
    expect(dayIn(marked, 1).event?.date).toBe('Morning Star 1, 4E 226');
  });

  it('still yields to the sheet’s own note', () => {
    const witches = { name: "Witches' Festival", date: 'Frostfall 13', caution: '' };
    const marked = withObservances(monthOf(10, { 13: witches }), OVERLAY);
    // Mephala's summoning is the entry that falls away here, and should.
    expect(dayIn(marked, 13).event).toEqual(witches);
  });

  it('lets the Embassy’s own observance outrank the realm’s', () => {
    // Heartfire 4 is Portrait Day; the realm has nothing there, so this only
    // proves the ordering holds where the two lists could ever meet.
    const marked = withObservances(monthOf(9), OVERLAY);
    expect(dayIn(marked, 4).event?.name).toBe('Thalmor Portrait Day');
    expect(dayIn(marked, 8).event?.name).toBe('Summoning Day of Nocturnal');
  });

  it('leaves the ordinary days of a month alone', () => {
    const marked = withObservances(monthOf(8), OVERLAY);
    // Last Seed's only holiday was Kyne's Feast, which is Atmoran and gone.
    const events = marked.months[0]!.weeks[0]!.filter((d) => d?.event);
    expect(events).toHaveLength(0);
  });
});

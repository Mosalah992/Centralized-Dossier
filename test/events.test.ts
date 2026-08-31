// The standing events, and the one rule that is easy to get wrong.
//
// Three of the four recur weekly, which is hard to break. The fourth is "the
// first Loredas of the month", and an ordinal rule has two failure modes that
// both look fine on a page: it can mark every Loredas (the ordinal ignored), or
// it can mark the first SEVEN DAYS' Loredas rather than the first Loredas —
// which is the same thing in most months and wrong in the ones where the month
// does not begin on a Sundas. Both are pinned here.

import { describe, expect, it } from 'vitest';

import { STANDING_EVENTS, eventsOfWeekday, eventsOn } from '../shared/events';
import { WEEKDAYS } from '../shared/parsers/calendar';

describe('the standing events', () => {
  it('falls only on weekdays the calendar actually has', () => {
    // A typo here would silently mark nothing at all: the resolver matches on
    // the weekday string the sheet gives, so 'Mondas' would never match and the
    // event would simply never appear.
    for (const e of STANDING_EVENTS) {
      expect(WEEKDAYS as readonly string[]).toContain(e.weekday);
    }
  });

  it('gives every event an hour and somewhere to be', () => {
    for (const e of STANDING_EVENTS) {
      expect(e.hours.length, `${e.name} has no hours`).toBeGreaterThan(0);
      expect(e.where.length, `${e.name} has no place`).toBeGreaterThan(0);
      expect(e.host.length, `${e.name} has no host`).toBeGreaterThan(0);
    }
  });

  it('repeats the weekly ones on every occurrence of their day', () => {
    for (const nth of [1, 2, 3, 4, 5]) {
      expect(eventsOn('Sundas', nth).map((e) => e.name)).toEqual(['Gambling Night']);
      expect(eventsOn('Morndas', nth).map((e) => e.name)).toEqual(['Mondas Mass']);
    }
  });

  it('draws the lottery on the first Loredas and no other', () => {
    const first = eventsOn('Loredas', 1).map((e) => e.name);
    expect(first).toContain("The People's Lottery");
    expect(first).toContain("Solitude's Mystery Coffers");

    for (const nth of [2, 3, 4, 5]) {
      const later = eventsOn('Loredas', nth).map((e) => e.name);
      expect(later).toEqual(["Solitude's Mystery Coffers"]);
    }
  });

  it('holds nothing on the days nobody claimed', () => {
    for (const quiet of ['Tirdas', 'Middas', 'Turdas', 'Fredas']) {
      expect(eventsOfWeekday(quiet)).toHaveLength(0);
      expect(eventsOn(quiet, 1)).toHaveLength(0);
    }
  });

  /*
   * THE ORDINAL IS COUNTED IN WEEKDAYS, NOT IN DATES. This is the distinction
   * the view has to honour: the first Loredas of a month is the first cell in
   * that month whose weekday is Loredas, whatever date it carries. In a month
   * beginning on a Fredas that is the 2nd; in one beginning on a Sundas it is
   * the 7th. Nothing here may assume the month starts on any particular day.
   */
  it('is a rule about weekdays rather than about dates', () => {
    const monthBeginningFredas = [
      { day: 1, weekday: 'Fredas' },
      { day: 2, weekday: 'Loredas' },
      { day: 3, weekday: 'Sundas' },
      { day: 9, weekday: 'Loredas' },
    ];

    const seen = new Map<string, number>();
    const marked: number[] = [];
    for (const d of monthBeginningFredas) {
      const nth = (seen.get(d.weekday) ?? 0) + 1;
      seen.set(d.weekday, nth);
      if (eventsOn(d.weekday, nth).some((e) => e.name === "The People's Lottery")) {
        marked.push(d.day);
      }
    }
    expect(marked).toEqual([2]);
  });
});

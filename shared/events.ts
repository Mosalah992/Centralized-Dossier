/**
 * The standing events: what the realm actually holds, and when.
 *
 * WHY THIS REPLACED THE FESTIVALS. The calendar's marked days came from the
 * spreadsheet — Tamrielic feast days, coloured by a legend, each carrying a
 * note. They were observances nobody attended. What the realm actually does on
 * a given week is held in a handful of notices, and a calendar that marks the
 * one and not the other is a calendar of a place that does not exist.
 *
 * The sheet is still parsed exactly as before — it gives the year its shape,
 * its months, its weekday columns and which day is which — and `server/` is
 * still readonly-scoped. Nothing was removed from the spreadsheet, because
 * nothing here can write to it. The festivals simply stopped being drawn.
 *
 * THESE ARE RECURRENCES, NOT DATES. Every one of them is "every Sundas" or
 * "the first Loredas of the month", which is how the hosts announce them and
 * the only form that stays true past this year. The calendar resolves them onto
 * real cells by matching the weekday the sheet gives each day, so a rule
 * written once marks every occurrence in the year without anyone maintaining a
 * list of dates.
 *
 * WORDING IS THE HOSTS'. The prose below is the notices', tidied for a page but
 * not rewritten, and the terms are theirs to change. Where a notice contradicts
 * itself the contradiction is kept and flagged rather than smoothed — the same
 * habit `docs/skyrim-press-history.md` follows.
 */

import { WEEKDAYS } from './parsers/calendar';

export type Weekday = (typeof WEEKDAYS)[number];

export interface StandingEvent {
  /** The host's own name for it. */
  name: string;
  /** Who holds it. */
  host: string;
  /** Where it is held, as the notice gives it. */
  where: string;
  /** The day it falls on, in the calendar's own weekday names. */
  weekday: Weekday;
  /**
   * Which occurrence in the month, if it is not every one.
   *
   * 1 is the first such weekday of the month. Omitted means weekly.
   */
  ordinal?: number;
  /** The hours, as the hosts give them. */
  hours: readonly string[];
  /** What it costs to take part. */
  terms?: string;
  /** The notice, in the host's words. */
  summary: string;
  /**
   * A real instant this recurrence is first held, if the notice named one.
   *
   * Stored as the instant rather than as a Tamrielic date on purpose: the
   * archive reckons it into the realm's calendar itself, so it stays correct if
   * the reckoning is ever re-anchored, and nobody has to keep a converted date
   * in step by hand.
   */
  firstHeldUtc?: string;
  /** How its days are washed on the grid, and how the legend names it. */
  color: string;
}

export const STANDING_EVENTS: readonly StandingEvent[] = [
  {
    name: 'Gambling Night',
    host: 'The Dancing Horse Inn',
    where: 'Outside Whiterun, near the West Gate, across from the smithy',
    weekday: 'Sundas',
    hours: ['8pm Central Skyrim Time'],
    terms: '25 septims to buy in; 100 septims after half past eight',
    summary:
      'The tables open for dice, drink and good food. Bring your septims and '
      + 'bring your courage, and see who walks away richer by the end of the '
      + 'night. Travellers, locals, merchants, High Kings and dungeon '
      + 'adventurers are all welcome.',
    color: 'rgba(178, 124, 48, 0.30)',
  },
  {
    name: "Solitude's Mystery Coffers",
    host: 'Lord Vaelith',
    where: 'The old EEC dock at Stone Harbor, Solitude',
    weekday: 'Loredas',
    /*
     * THE TWO OPENINGS AS THE NOTICE GIVES THEM, and the notice disagrees with
     * itself: the second opening is written an hour EARLIER than the first in
     * Central time while being ten hours later in British time. Both figures
     * are reproduced rather than corrected, because guessing which half of a
     * host's own notice is the typo is how a reader ends up at a locked door.
     */
    hours: ['First coffer — 9pm CST / 4pm UK', 'Second coffer — 8pm CST / 2am UK'],
    terms: '250 septims a box, no ticket limit',
    summary:
      'All sorts of items to be won, at every level. Stock is limited — come '
      + 'early.',
    color: 'rgba(110, 86, 142, 0.30)',
  },
  {
    name: "The People's Lottery",
    host: 'House Vaylor',
    where: 'The Markarth Treasury House',
    weekday: 'Loredas',
    ordinal: 1,
    hours: ['Drawn live at the Treasury House'],
    terms: '25 septims an entry, unlimited entries',
    summary:
      'Tickets from the treasury in Markarth, or from any member of House '
      + 'Vaylor. You need not be present to win: winners are notified in person '
      + 'or by notice board against their ticket number. Prizes must be claimed '
      + 'from the Treasury House within a fortnight of the drawing.',
    firstHeldUtc: '2026-09-06T04:00:00Z',
    color: 'rgba(66, 108, 138, 0.30)',
  },
  {
    name: 'Mondas Mass',
    host: 'The Chantry of Akatosh',
    where: 'The execution stage, Solitude',
    /*
     * The Chantry writes "Mondas"; the calendar's own weekday is MORNDAS. The
     * host's name for their own service is left alone and the recurrence keys
     * to the archive's weekday, so the service falls where it belongs on the
     * grid without the notice being rewritten on their behalf.
     */
    weekday: 'Morndas',
    hours: ['12:00 AM'],
    summary:
      'All the peoples of Skyrim are invited to gather in honour of the Great '
      + 'Dragon Lord, and to reflect upon his blessings and his teachings. '
      + 'Bring your prayers and your offerings. Lord Akatosh, lend us your '
      + 'might; Lord Akatosh, grant us your light.',
    color: 'rgba(152, 62, 46, 0.26)',
  },
];

/**
 * Which standing events fall on a day.
 *
 * `nth` is which occurrence of that weekday the day is within its month — the
 * second Loredas is `2` — which is the only thing an ordinal rule needs and the
 * only thing the caller has to count.
 */
export function eventsOn(weekday: string, nth: number): StandingEvent[] {
  return STANDING_EVENTS.filter(
    (e) => e.weekday === weekday && (e.ordinal === undefined || e.ordinal === nth),
  );
}

/** Every event a weekday carries at all, ordinal rules included. */
export function eventsOfWeekday(weekday: string): StandingEvent[] {
  return STANDING_EVENTS.filter((e) => e.weekday === weekday);
}

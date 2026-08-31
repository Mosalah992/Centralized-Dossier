/**
 * The marked days: what the realm holds, and what it remembers.
 *
 * WHY THIS REPLACED THE FESTIVALS. The calendar's marked days came from the
 * spreadsheet and from two overlaid lists — Tamrielic feast days, coloured by a
 * legend, each carrying a note. They were observances nobody attended. What the
 * realm actually does is held in a handful of notices, and a calendar that
 * marks the one and not the other is a calendar of a place that does not exist.
 *
 * The sheet is still parsed exactly as before — it gives the year its shape,
 * its months, its weekday columns and which day is which — and `server/` is
 * still readonly-scoped. Nothing was removed from the spreadsheet, because
 * nothing here can write to it. The festivals simply stopped being drawn.
 *
 * TWO KINDS OF RULE, AND THE DIFFERENCE MATTERS.
 *
 *   - A STANDING EVENT recurs on a weekday: "every Sundas", "the first Loredas
 *     of the month". That is how the hosts announce them and the only form that
 *     stays true past this year. It is resolved by matching the weekday the
 *     sheet gives each day, so a rule written once marks every occurrence.
 *
 *   - A FIXED DAY is a date in the Tamrielic year and falls on it every year,
 *     whatever weekday that is. Birthdays and anniversaries are these.
 *
 * Both are rendered through one `Mark`, so the calendar has a single thing to
 * draw and a single note to open, and neither kind has to know about the other.
 *
 * WORDING IS THE KEEPERS'. The prose is the notices' and the registers', tidied
 * for a page but not rewritten, and the terms are theirs to change. Where a
 * record contradicts itself the contradiction is kept and flagged rather than
 * smoothed — the same habit `docs/skyrim-press-history.md` follows.
 */

import { constellationOf } from './constellations';
import { MONTHS, WEEKDAYS } from './parsers/calendar';
import { reckon } from './reckoning';

export type Weekday = (typeof WEEKDAYS)[number];

/**
 * One thing shown against a day, whatever rule put it there.
 *
 * A single shape on purpose: the note that opens under a day should not care
 * whether it is looking at a lottery drawing or a birthday, and adding a third
 * kind of rule later should mean adding a producer, not another branch in the
 * view.
 */
export interface Mark {
  name: string;
  /** The line under the name — a host and place, or a birthplace, or a year. */
  standfirst?: string;
  /** Short lines set as small capitals: hours, or a birthsign. */
  lines: readonly string[];
  /** What it costs, set in the rubric. */
  terms?: string;
  /** The notice itself. */
  summary?: string;
  /** How the day is washed on the grid. */
  color: string;
}

/* ── Colours ─────────────────────────────────────────────────────────────
 *
 * Each rule gets one, and the birthdays and the Awakening share theirs rather
 * than taking fourteen entries in a legend that has to stay readable. They are
 * washes rather than fills: a day cell still has to read as a number first.
 */
const COLOR = {
  gambling: 'rgba(178, 124, 48, 0.30)',
  coffers: 'rgba(110, 86, 142, 0.30)',
  lottery: 'rgba(66, 108, 138, 0.30)',
  mass: 'rgba(152, 62, 46, 0.26)',
  birthday: 'rgba(96, 134, 96, 0.28)',
  awakening: 'rgba(163, 52, 23, 0.32)',
} as const;

/* ── Standing events: rules about weekdays ───────────────────────────── */

export interface StandingEvent {
  /** The host's own name for it. */
  name: string;
  host: string;
  where: string;
  /** The day it falls on, in the calendar's own weekday names. */
  weekday: Weekday;
  /** Which occurrence in the month. 1 is the first; omitted means weekly. */
  ordinal?: number;
  hours: readonly string[];
  terms?: string;
  summary: string;
  /**
   * A real instant this recurrence was first held, if a notice named one.
   *
   * Stored as the instant rather than as a Tamrielic date on purpose: the
   * archive reckons it into the realm's calendar itself, so it stays correct if
   * the reckoning is ever re-anchored, and nobody keeps a converted date in
   * step by hand.
   */
  firstHeldUtc?: string;
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
    color: COLOR.gambling,
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
    summary: 'All sorts of items to be won, at every level. Stock is limited — come early.',
    color: COLOR.coffers,
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
    color: COLOR.lottery,
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
    color: COLOR.mass,
  },
];

/* ── Fixed days: dates in the year ───────────────────────────────────── */

export interface FixedDay {
  name: string;
  /** 1-based Tamrielic month. */
  monthIndex: number;
  day: number;
  kind: 'birth' | 'awakening';
  /**
   * The birthsign as the register gives it.
   *
   * Left off where none was given, and NOT filled in silently — see the note on
   * `signOf` below, which says what the archive does instead.
   */
  sign?: string;
  birthplace?: string;
  /** What happened, for the days the realm remembers. */
  note?: string;
  /** The year it happened, for those same days. */
  year?: number;
  /** The real date, where one was recorded beside the in-world one. */
  onEarth?: string;
}

/**
 * The Great Awakening, and the birthdays of the Embassy's own.
 *
 * Dates are the keepers'. Where a birthsign was recorded it is reproduced as
 * recorded, INCLUDING where it does not agree with the month it falls in — see
 * the note on Orion du Bois. Correcting a person's own birthsign because the
 * calendar disagrees with it would be the archive overruling the register it
 * exists to hold.
 */
export const FIXED_DAYS: readonly FixedDay[] = [
  {
    name: 'The Keizaal public servers opened',
    monthIndex: 4, day: 28, kind: 'awakening', year: 226,
    onEarth: '28 April 2026',
    note: 'The Great Awakening. The realm was opened to all comers.',
  },
  {
    name: 'The Embassy established',
    monthIndex: 4, day: 29, kind: 'awakening', year: 226,
    note: 'The Thalmor established the new Embassy in Skyrim, the day after the realm opened.',
  },

  { name: 'Luthien', monthIndex: 1, day: 1, kind: 'birth' },
  { name: 'Iireussa Thilinaine', monthIndex: 1, day: 3, kind: 'birth' },
  {
    name: 'Ancarion Saelthar',
    monthIndex: 1, day: 23, kind: 'birth',
    /*
     * The Serpent, born in Morning Star, whose sign is the Ritual. Not a
     * contradiction: the Serpent is the wandering sign and keeps to no month,
     * which is why `constellationOf` returns it for no month at all.
     */
    sign: 'The Serpent',
    birthplace: 'Alinor',
  },
  { name: 'Celeriel', monthIndex: 2, day: 28, kind: 'birth' },
  { name: 'Yhavna Verlith', monthIndex: 3, day: 20, kind: 'birth' },
  {
    name: 'Orion du Bois',
    monthIndex: 4, day: 9, kind: 'birth',
    /*
     * RECORDED AS THE LORD, born in Rain's Hand, whose sign is the Mage. The
     * Lord's month is First Seed. Unlike the Serpent above this is a genuine
     * disagreement between the register and the calendar, and it is reproduced
     * rather than resolved: which of the two is the error is the keeper's to
     * say, not the archive's.
     */
    sign: 'The Lord',
  },
  { name: 'Lorindar Eldenrun', monthIndex: 8, day: 5, kind: 'birth', sign: 'The Warrior' },
  { name: 'Alduril', monthIndex: 8, day: 21, kind: 'birth', sign: 'The Warrior' },
  { name: 'Iwelien Loreanthal', monthIndex: 9, day: 17, kind: 'birth', sign: 'The Lady' },
  { name: 'Milinuen Thilinaine', monthIndex: 10, day: 4, kind: 'birth', sign: 'The Tower' },
  { name: 'Akira Frey', monthIndex: 11, day: 11, kind: 'birth', sign: 'The Atronach' },
  { name: 'Valynwe Verlith', monthIndex: 11, day: 13, kind: 'birth', sign: 'The Atronach' },
];

/**
 * The sign a birthday is shown under.
 *
 * A recorded sign wins. Where none was recorded the sign of the month is used
 * and SAID TO BE the month's, rather than presented as though the register gave
 * it: in this cosmology the sign of a birth follows its month, so deriving it is
 * sound, but a reader should be able to tell a reading from a record.
 */
export function signOf(entry: FixedDay): { sign: string; recorded: boolean } | null {
  if (entry.sign) return { sign: entry.sign, recorded: true };
  const month = constellationOf(entry.monthIndex);
  return month ? { sign: month.name, recorded: false } : null;
}

/* ── Resolving a day ─────────────────────────────────────────────────── */

function standingMark(e: StandingEvent): Mark {
  const lines = [...e.hours];
  /*
   * The notice gave a real instant for the first drawing. It is reckoned into
   * the realm's calendar HERE rather than stored as a converted date, so it
   * follows the reckoning instead of having to be kept in step with it by hand.
   */
  if (e.firstHeldUtc) {
    const first = reckon(Date.parse(e.firstHeldUtc));
    lines.push(`First held ${MONTHS[first.monthIndex - 1]} ${first.day}, 4E ${first.year}`);
  }
  return {
    name: e.name,
    standfirst: `${e.host} — ${e.where}`,
    lines,
    terms: e.terms,
    summary: e.summary,
    color: e.color,
  };
}

function fixedMark(e: FixedDay): Mark {
  if (e.kind === 'awakening') {
    return {
      name: e.name,
      standfirst: [
        `${MONTHS[e.monthIndex - 1]} ${e.day}${e.year ? `, 4E ${e.year}` : ''}`,
        e.onEarth,
      ].filter(Boolean).join(' — '),
      lines: [],
      summary: e.note,
      color: COLOR.awakening,
    };
  }

  const sign = signOf(e);
  return {
    name: e.name,
    standfirst: e.birthplace ? `Born in ${e.birthplace}` : undefined,
    lines: sign
      ? [sign.recorded ? `Birthsign — ${sign.sign}` : `Under ${sign.sign}, by the month`]
      : [],
    color: COLOR.birthday,
  };
}

/**
 * Everything shown against one day.
 *
 * `nth` is which occurrence of that weekday the day is within its month — the
 * second Loredas is `2` — which is the only thing an ordinal rule needs and the
 * only thing the caller has to count. Fixed days ignore it entirely.
 */
export function marksFor(
  monthIndex: number,
  day: number,
  weekday: string,
  nth: number,
): Mark[] {
  const standing = STANDING_EVENTS
    .filter((e) => e.weekday === weekday && (e.ordinal === undefined || e.ordinal === nth))
    .map(standingMark);
  const fixed = FIXED_DAYS
    .filter((e) => e.monthIndex === monthIndex && e.day === day)
    .map(fixedMark);
  // Fixed days first: a birthday is about the day itself, where a standing
  // event merely happens to fall on it.
  return [...fixed, ...standing];
}

/** Which standing events fall on the nth occurrence of a weekday. */
export function eventsOn(weekday: string, nth: number): StandingEvent[] {
  return STANDING_EVENTS.filter(
    (e) => e.weekday === weekday && (e.ordinal === undefined || e.ordinal === nth),
  );
}

/** Every event a weekday carries at all, ordinal rules included. */
export function eventsOfWeekday(weekday: string): StandingEvent[] {
  return STANDING_EVENTS.filter((e) => e.weekday === weekday);
}

/* ── The legend ──────────────────────────────────────────────────────── */

/**
 * What the colours mean.
 *
 * Written out rather than derived from the two lists above, because the
 * birthdays and the Awakening share a colour each: deriving it would put
 * thirteen entries under the grid and a legend nobody reads is worse than none.
 */
export const LEGEND: readonly { label: string; when: string; color: string }[] = [
  { label: 'Gambling Night', when: 'every Sundas', color: COLOR.gambling },
  { label: "Solitude's Mystery Coffers", when: 'every Loredas', color: COLOR.coffers },
  { label: "The People's Lottery", when: 'first Loredas of the month', color: COLOR.lottery },
  { label: 'Mondas Mass', when: 'every Morndas', color: COLOR.mass },
  { label: 'Birthdays', when: 'as they fall', color: COLOR.birthday },
  { label: 'The Great Awakening', when: "Rain's Hand 28 and 29", color: COLOR.awakening },
];

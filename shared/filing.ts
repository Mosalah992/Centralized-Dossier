// The Scribe's filing: what a member (or, for two kinds, anyone) writes at the
// Scribe Table or through the bot's /report, and what the scribe/ Worker draws
// as a parchment.
//
// One model for both doors. The Discord wizard, the website wizard, the Pages
// routes and the renderer all check a filing with `checkFiling` below, so a
// parchment the bot previews is the parchment the site files, field for field.
//
// The parchment is re-drawn from these fields whenever it is asked for (and
// again when the Clerk stamps it), so nothing here may depend on when it is
// read: "now" is resolved to an in-world moment once, when the filer chooses
// it, and stored as that moment.

import { BOARD_SECTIONS, type BoardSection } from './room';
import type { ReportSeverity } from './reports';
import { MONTH_LENGTHS, reckon } from './reckoning';
import { MONTHS } from './parsers/calendar';
import type { Wing } from './wings';

// ── Categories ──────────────────────────────────────────────────────────────

export const FILING_CATEGORIES = [
  'bulletin',
  'troops',
  'logistics',
  'bureau',
  'embassy',
  'patrol',
  'training',
  'lesson-magic',
  'lesson-language',
  'application',
  'public-request',
] as const;
export type FilingCategory = (typeof FILING_CATEGORIES)[number];

/** Where a filing goes once filed. */
export type Destination =
  | { kind: 'board' }
  | { kind: 'cabinet'; wing: Wing }
  /** The Clerk Table inbox in the Solar, to be stamped Approved or Denied. */
  | { kind: 'clerk' };

export interface CategoryInfo {
  name: string;
  destination: Destination;
  /**
   * Filed without a personal code. Applications and Public Requests come from
   * people who are not (yet) members; the site throttles them per address
   * instead, and they cannot raise an alarm (see OPEN_IMPORTANCE).
   */
  open: boolean;
}

export const CATEGORY_INFO: Record<FilingCategory, CategoryInfo> = {
  bulletin: { name: 'Bulletin Post', destination: { kind: 'board' }, open: false },
  troops: { name: 'Troops Report', destination: { kind: 'cabinet', wing: 'military' }, open: false },
  logistics: { name: 'Logistics Report', destination: { kind: 'cabinet', wing: 'logistics' }, open: false },
  bureau: { name: 'Bureau Report', destination: { kind: 'cabinet', wing: 'intelligence' }, open: false },
  embassy: { name: 'Embassy Report', destination: { kind: 'cabinet', wing: 'diplomatic' }, open: false },
  patrol: { name: 'Patrol Log', destination: { kind: 'cabinet', wing: 'military' }, open: false },
  training: { name: 'Training Log', destination: { kind: 'cabinet', wing: 'military' }, open: false },
  'lesson-magic': { name: 'Lesson Log (Magic)', destination: { kind: 'cabinet', wing: 'scholarship' }, open: false },
  'lesson-language': { name: 'Lesson Log (Language)', destination: { kind: 'cabinet', wing: 'scholarship' }, open: false },
  application: { name: 'Application to the Thalmor', destination: { kind: 'clerk' }, open: true },
  'public-request': { name: 'Public Request', destination: { kind: 'clerk' }, open: true },
};

export const isFilingCategory = (value: unknown): value is FilingCategory =>
  (FILING_CATEGORIES as readonly unknown[]).includes(value);

/**
 * The board sections a Bulletin Post may be nailed to. Bounties are left out:
 * a bounty is a wanted poster with its own fields (shared/room.ts `Bounty`),
 * not a written notice.
 */
export const BULLETIN_SECTIONS = BOARD_SECTIONS.filter(
  (section): section is Exclude<BoardSection, 'bounties'> => section !== 'bounties',
);
export type BulletinSection = (typeof BULLETIN_SECTIONS)[number];

// ── Importance ──────────────────────────────────────────────────────────────

export const IMPORTANCE_LEVELS = ['routine', 'nominal', 'notable', 'strategic', 'cataclysm'] as const;
export type Importance = (typeof IMPORTANCE_LEVELS)[number];

/** Who is called when a filing of this level is posted to Discord. */
export type Summons = 'none' | 'command' | 'all';

export interface ImportanceInfo {
  name: string;
  meaning: string;
  /** The Cabinet's severity (shared/reports.ts) a report of this level files under. */
  severity: ReportSeverity;
  /**
   * `command`: the Justiciars and the department heads. `all`: every member
   * and High Command. The role IDs are configuration, never this file.
   */
  summons: Summons;
}

export const IMPORTANCE_INFO: Record<Importance, ImportanceInfo> = {
  routine: { name: 'Standard Routine', meaning: 'Routine', severity: 'low', summons: 'none' },
  nominal: { name: 'Nominal', meaning: 'Trivial', severity: 'informational', summons: 'none' },
  notable: { name: 'Notable', meaning: 'Of some weight', severity: 'medium', summons: 'none' },
  strategic: {
    name: 'Strategic',
    meaning: 'All Justiciars and departments meet',
    severity: 'high',
    summons: 'command',
  },
  cataclysm: { name: 'Cataclysm', meaning: 'All hands on deck', severity: 'critical', summons: 'all' },
};

export const isImportance = (value: unknown): value is Importance =>
  (IMPORTANCE_LEVELS as readonly unknown[]).includes(value);

/**
 * The levels an open (code-less) filing may carry. Anyone on the internet can
 * file an Application or a Public Request, so neither may summon anybody.
 */
export const OPEN_IMPORTANCE: readonly Importance[] = ['routine', 'nominal', 'notable'];

export const importanceFor = (category: FilingCategory): readonly Importance[] =>
  CATEGORY_INFO[category].open ? OPEN_IMPORTANCE : IMPORTANCE_LEVELS;

// ── The incident's hour ─────────────────────────────────────────────────────

/** An in-world moment to the minute. "Now" is resolved to one of these when chosen. */
export interface IncidentTime {
  /** Fourth Era year. */
  year: number;
  /** 1-based month of the Tamrielic year. */
  monthIndex: number;
  day: number;
  /** 0–23. */
  hour: number;
  minute: number;
}

/** The in-world moment at a real instant, to the minute. */
export function incidentNow(nowMs: number = Date.now()): IncidentTime {
  const { year, monthIndex, day, hour, minute } = reckon(nowMs);
  return { year, monthIndex, day, hour, minute };
}

// The room's plate words a date the same way (web/src/room/clock-format.ts);
// this copy keeps the shared layer free of browser code.
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** "4th of Heartfire, 4E 226" */
export function incidentDate(time: IncidentTime): string {
  return `${ordinal(time.day)} of ${MONTHS[time.monthIndex - 1] ?? ''}, 4E ${time.year}`;
}

/** "6:04 PM" */
export function incidentClock(time: IncidentTime): string {
  const face = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${face}:${String(time.minute).padStart(2, '0')} ${time.hour < 12 ? 'AM' : 'PM'}`;
}

// ── The filing ──────────────────────────────────────────────────────────────

/** Every field a filer writes, in the order the wizards ask for them. */
export interface Filing {
  category: FilingCategory;
  importance: Importance;
  /** Bulletin Posts only: the board section it is nailed to. */
  section: BulletinSection | null;
  rank: string;
  name: string;
  /** The superior the filer answered to, or null when they answered to none. */
  superior: string | null;
  title: string;
  time: IncidentTime;
  body: string;
}

export type FilingField = keyof Filing;

export const FILING_LIMITS = {
  rank: 40,
  name: 60,
  superior: 60,
  title: 90,
  /**
   * What one parchment holds legibly at its smallest hand. Discord's modal
   * allows 4000; the bot sets its own field's limit to this.
   */
  body: 2400,
  /** A filing shorter than this is a note, not a report. */
  bodyMinimum: 20,
} as const;

/** One line, no control characters, runs of spaces closed up. */
const line = (value: unknown): string | null =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim() : null;

/** Paragraphs kept; control characters, trailing spaces and long gaps removed. */
const prose = (value: unknown): string | null =>
  typeof value === 'string'
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : null;

const whole = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

export function checkIncidentTime(input: unknown): IncidentTime | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;
  const year = whole(raw.year, 1, 999);
  const monthIndex = whole(raw.monthIndex, 1, 12);
  if (year === null || monthIndex === null) return null;
  const day = whole(raw.day, 1, MONTH_LENGTHS[monthIndex - 1]!);
  const hour = whole(raw.hour, 0, 23);
  const minute = whole(raw.minute, 0, 59);
  if (day === null || hour === null || minute === null) return null;
  return { year, monthIndex, day, hour, minute };
}

export type FilingCheck =
  | { ok: true; value: Filing }
  | { ok: false; field: FilingField; error: string };

/** A whole filing, cleaned and checked. The first problem found is the one reported. */
export function checkFiling(input: unknown): FilingCheck {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, field: 'category', error: 'Choose what you are filing.' };
  }
  const raw = input as Record<string, unknown>;
  const fail = (field: FilingField, error: string): FilingCheck => ({ ok: false, field, error });

  if (!isFilingCategory(raw.category)) return fail('category', 'Choose what you are filing.');
  const category = raw.category;
  const info = CATEGORY_INFO[category];

  if (!isImportance(raw.importance)) return fail('importance', 'Choose how much it matters.');
  if (!importanceFor(category).includes(raw.importance)) {
    return fail('importance', `Only a member filing under a code may mark it ${IMPORTANCE_INFO[raw.importance].name}.`);
  }
  const importance = raw.importance;

  let section: BulletinSection | null = null;
  if (category === 'bulletin') {
    if (!(BULLETIN_SECTIONS as readonly unknown[]).includes(raw.section)) {
      return fail('section', 'Choose where on the board it is nailed.');
    }
    section = raw.section as BulletinSection;
  }

  const rank = line(raw.rank ?? '');
  if (rank === null) return fail('rank', 'Write your rank.');
  if (!rank && !info.open) return fail('rank', 'Write your rank.');
  if (rank.length > FILING_LIMITS.rank) return fail('rank', `A rank runs to ${FILING_LIMITS.rank} letters at most.`);

  const name = line(raw.name);
  if (!name) return fail('name', 'Write your name.');
  if (name.length > FILING_LIMITS.name) return fail('name', `A name runs to ${FILING_LIMITS.name} letters at most.`);

  const superior = raw.superior === null || raw.superior === undefined ? '' : line(raw.superior);
  if (superior === null) return fail('superior', 'Write the name of the superior you answered to, or leave it blank.');
  if (superior.length > FILING_LIMITS.superior) {
    return fail('superior', `A name runs to ${FILING_LIMITS.superior} letters at most.`);
  }

  const title = line(raw.title);
  if (!title) return fail('title', 'Give it a title.');
  if (title.length > FILING_LIMITS.title) return fail('title', `A title runs to ${FILING_LIMITS.title} letters at most.`);

  const time = checkIncidentTime(raw.time);
  if (!time) return fail('time', 'Choose when it happened: now, or a month, a day and an hour.');

  const body = prose(raw.body);
  if (!body || body.length < FILING_LIMITS.bodyMinimum) {
    return fail('body', `Write the ${info.name.toLowerCase()} itself, ${FILING_LIMITS.bodyMinimum} letters at least.`);
  }
  if (body.length > FILING_LIMITS.body) return fail('body', `It runs to ${FILING_LIMITS.body} letters at most.`);

  return {
    ok: true,
    value: { category, importance, section, rank, name, superior: superior || null, title, time, body },
  };
}

// ── The Clerk's stamp, and what the renderer is asked to draw ───────────────

export const STAMP_MARKS = ['approved', 'denied'] as const;
export type StampMark = (typeof STAMP_MARKS)[number];

export interface FilingStamp {
  mark: StampMark;
  /** When it was stamped, in-world. */
  at: IncidentTime;
}

/**
 * The body of the scribe Worker's POST /render. Everything the parchment shows
 * is here, so the same request always draws the same picture.
 */
export interface ParchmentRequest {
  filing: Filing;
  /** The archive's entry number once filed; a preview has none. */
  serial: number | null;
  stamp: FilingStamp | null;
}

export type ParchmentRequestCheck = { ok: true; value: ParchmentRequest } | { ok: false; error: string };

export function checkParchmentRequest(input: unknown): ParchmentRequestCheck {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Nothing to draw.' };
  const raw = input as Record<string, unknown>;
  const filing = checkFiling(raw.filing);
  if (!filing.ok) return { ok: false, error: `${filing.field}: ${filing.error}` };

  const serial = raw.serial === undefined || raw.serial === null ? null : whole(raw.serial, 1, 99_999_999);
  if (serial === null && raw.serial !== undefined && raw.serial !== null) return { ok: false, error: 'serial: not an entry number.' };

  let stamp: FilingStamp | null = null;
  if (raw.stamp !== undefined && raw.stamp !== null) {
    const s = raw.stamp as Record<string, unknown>;
    const at = checkIncidentTime(s?.at);
    if (!(STAMP_MARKS as readonly unknown[]).includes(s?.mark) || !at) return { ok: false, error: 'stamp: not a stamp.' };
    stamp = { mark: s.mark as StampMark, at };
  }
  return { ok: true, value: { filing: filing.value, serial, stamp } };
}

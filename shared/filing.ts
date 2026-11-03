// The Scribe's filing: what a member (or, for two kinds, anyone) writes at the
// Scribe Table or through the bot's /report, and what the site draws as a
// parchment (web/src/scribe/).
//
// One model for both doors. The Discord wizard, the website wizard and the
// Pages routes all check a filing with `checkFiling` below, so what the bot
// previews is what the site files, field for field.
//
// The parchment is drawn from these fields in the reader's browser whenever it
// is shown (with the Clerk's stamp once there is one), so nothing here may
// depend on when it is read: "now" is resolved to an in-world moment once,
// when the filer chooses it, and stored as that moment.

import { BOARD_INFO, BOARD_SECTIONS, type BoardSection } from './room';
import type { ReportSeverity } from './reports';
import { MONTH_LENGTHS, reckon } from './reckoning';
import { MONTHS } from './parsers/calendar';
import { WING_INFO, type Wing } from './wings';

// ── Categories ──────────────────────────────────────────────────────────────

/** What is filed. A report also names its wing and its kind (below). */
export const FILING_CATEGORIES = ['report', 'bulletin', 'application', 'public-request'] as const;
export type FilingCategory = (typeof FILING_CATEGORIES)[number];

/** Where a filing goes once filed. */
export type Destination =
  | { kind: 'board' }
  | { kind: 'cabinet'; wing: Wing }
  /** The Clerk Table inbox in the Solar, to be stamped Approved or Denied. */
  | { kind: 'clerk' };

export interface CategoryInfo {
  name: string;
  /** Where it files: a report into its wing's drawer of the Cabinet. */
  to: Destination['kind'];
  /**
   * Filed without a personal code. Applications and Public Requests come from
   * people who are not (yet) members; the site throttles them per address
   * instead, and they cannot raise an alarm (see OPEN_IMPORTANCE).
   */
  open: boolean;
}

export const CATEGORY_INFO: Record<FilingCategory, CategoryInfo> = {
  report: { name: 'Report', to: 'cabinet', open: false },
  bulletin: { name: 'Bulletin Post', to: 'board', open: false },
  application: { name: 'Application to the Thalmor', to: 'clerk', open: true },
  'public-request': { name: 'Public Request', to: 'clerk', open: true },
};

export const isFilingCategory = (value: unknown): value is FilingCategory =>
  (FILING_CATEGORIES as readonly unknown[]).includes(value);

// ── Reports: a wing and a kind ──────────────────────────────────────────────
//
// The Embassy's reporting structure (the team's tables, 2026-11-03): every
// wing files the same eight kinds of report, so a Military Activity Report and
// an Embassy Activity Report differ only in the wing.

/** The wings a report is filed under, in the table's order. The Embassy's is the Diplomatic wing. */
export const REPORT_WINGS = ['diplomatic', 'intelligence', 'military', 'logistics', 'auxiliary'] as const satisfies readonly Wing[];
export type ReportWing = (typeof REPORT_WINGS)[number];

/** Each wing as a filer chooses it. */
export const REPORT_WING_NAMES: Record<ReportWing, string> = {
  diplomatic: 'Embassy',
  intelligence: 'Intelligence',
  military: 'Military',
  logistics: 'Logistics',
  auxiliary: 'Auxiliary',
};

export const REPORT_KINDS = [
  'activity',
  'incident',
  'investigation',
  'operation',
  'intelligence',
  'inspection',
  'personnel',
  'administrative',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export interface ReportKindInfo {
  name: string;
  /** What it is for, as the team's table says it. */
  purpose: string;
  /** The same, short enough for a Discord menu (100 letters). */
  brief: string;
}

export const REPORT_KIND_INFO: Record<ReportKind, ReportKindInfo> = {
  activity: {
    name: 'Activity Report',
    purpose: 'A general account of duties, patrols, assignments, meetings, diplomatic engagements, or other activities performed.',
    brief: 'Duties, patrols, assignments, meetings and engagements',
  },
  incident: {
    name: 'Incident Report',
    purpose: 'Unexpected events, disputes, security breaches, accidents, misconduct, or confrontations.',
    brief: 'Unexpected events, disputes, breaches, accidents, misconduct',
  },
  investigation: {
    name: 'Investigation Report',
    purpose: 'Inquiries, evidence, observations, interviews, suspected violations, and investigative findings.',
    brief: 'Inquiries, evidence, interviews and findings',
  },
  operation: {
    name: 'Operation Report',
    purpose: 'Organised missions, coordinated assignments, military operations, diplomatic missions, or logistical undertakings.',
    brief: 'Organised missions and coordinated undertakings',
  },
  intelligence: {
    name: 'Intelligence Report',
    purpose: 'Information gathered about individuals, organisations, locations, political developments, threats, or other matters of interest.',
    brief: 'What was learned of people, groups, places, politics and threats',
  },
  inspection: {
    name: 'Inspection Report',
    purpose: 'Examinations of personnel, equipment, facilities, inventories, procedures, or operational readiness.',
    brief: 'Examinations of personnel, equipment, stores or readiness',
  },
  personnel: {
    name: 'Personnel Report',
    purpose: 'Conduct, performance, attendance, training progress, qualifications, commendations, and disciplinary concerns.',
    brief: 'Conduct, performance, attendance, training and discipline',
  },
  administrative: {
    name: 'Administrative Report',
    purpose: 'Resources, finances, supplies, institutional affairs, policy implementation, and general departmental administration.',
    brief: 'Resources, finances, supplies, policy and administration',
  },
};

export const isReportWing = (value: unknown): value is ReportWing => (REPORT_WINGS as readonly unknown[]).includes(value);
export const isReportKind = (value: unknown): value is ReportKind => (REPORT_KINDS as readonly unknown[]).includes(value);

/** What a filing is called: "Incident Report", "Bulletin Post". */
export function filingName(filing: Pick<Filing, 'category' | 'kind'>): string {
  return filing.category === 'report' && filing.kind ? REPORT_KIND_INFO[filing.kind].name : CATEGORY_INFO[filing.category].name;
}

/** Where a filing goes: a report to its wing. */
export function destinationOf(filing: Pick<Filing, 'category' | 'wing'>): Destination {
  const to = CATEGORY_INFO[filing.category].to;
  return to === 'cabinet' ? { kind: 'cabinet', wing: filing.wing ?? 'diplomatic' } : { kind: to };
}

/** Where it goes, as the parchment and the bot's post say it: "To the Military Wing". */
export function destinationLabel(filing: Pick<Filing, 'category' | 'wing' | 'section'>): string {
  const to = destinationOf(filing);
  switch (to.kind) {
    case 'board':
      return `For the Board · ${filing.section ? BOARD_INFO[filing.section].title : ''}`;
    case 'cabinet': {
      const { name } = WING_INFO[to.wing];
      return `To ${name.endsWith('Wing') ? 'the ' : ''}${name}`;
    }
    case 'clerk':
      return 'For the Clerk’s Table';
  }
}

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
  /**
   * The level's ink: the parchment's ribbon and the edge of the bot's post.
   * The Cabinet's own severity inks (web/src/styles/cabinet.css), so a level
   * reads the same everywhere.
   */
  ink: string;
}

export const IMPORTANCE_INFO: Record<Importance, ImportanceInfo> = {
  routine: { name: 'Standard Routine', meaning: 'Routine', severity: 'low', summons: 'none', ink: '#58703c' },
  nominal: { name: 'Nominal', meaning: 'Trivial', severity: 'informational', summons: 'none', ink: '#496b76' },
  notable: { name: 'Notable', meaning: 'Of some weight', severity: 'medium', summons: 'none', ink: '#8b6c1d' },
  strategic: {
    name: 'Strategic',
    meaning: 'All Justiciars and departments meet',
    severity: 'high',
    summons: 'command',
    ink: '#a85824',
  },
  cataclysm: { name: 'Cataclysm', meaning: 'All hands on deck', severity: 'critical', summons: 'all', ink: '#8b251d' },
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
  /** Reports only: the wing it is filed under. */
  wing: ReportWing | null;
  /** Reports only: what kind of report it is. */
  kind: ReportKind | null;
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

  let wing: ReportWing | null = null;
  let kind: ReportKind | null = null;
  if (category === 'report') {
    if (!isReportWing(raw.wing)) return fail('wing', 'Choose the wing it is filed under.');
    if (!isReportKind(raw.kind)) return fail('kind', 'Choose what kind of report it is.');
    wing = raw.wing;
    kind = raw.kind;
  }

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
    return fail('body', `Write the ${filingName({ category, kind })} itself, ${FILING_LIMITS.bodyMinimum} letters at least.`);
  }
  if (body.length > FILING_LIMITS.body) return fail('body', `It runs to ${FILING_LIMITS.body} letters at most.`);

  return {
    ok: true,
    value: { category, wing, kind, importance, section, rank, name, superior: superior || null, title, time, body },
  };
}

/**
 * A filing given step by step (the bot's wizard and the Scribe Table's), judged
 * by what it has so far: the fields not yet reached are filled with stand-ins
 * that pass, and only a problem with one of `fields` is reported. A field the
 * step asks for gets no stand-in, so one left unanswered is reported too. On
 * success the value is the cleaned filing, stand-ins included; take only the
 * fields the step asked for.
 */
export function checkFilingSoFar(
  draft: Partial<Filing>,
  fields: readonly FilingField[],
  now: IncidentTime = incidentNow(),
): { ok: true; value: Filing } | { ok: false; field: FilingField; error: string } {
  const stand: Partial<Filing> = {
    category: 'report',
    wing: 'military',
    kind: 'activity',
    importance: 'routine',
    section: 'propaganda',
    rank: 'Agent',
    name: 'Scribe',
    superior: null,
    title: 'Untitled',
    time: now,
    body: 'x'.repeat(FILING_LIMITS.bodyMinimum),
  };
  for (const field of fields) delete stand[field];
  const given = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined));
  const checked = checkFiling({ ...stand, ...given });
  if (checked.ok || fields.includes(checked.field)) return checked;
  return { ok: true, value: { ...stand, ...(given as Partial<Filing>) } as Filing };
}

// ── The Clerk's stamp, and what a parchment is drawn from ───────────────────

export const STAMP_MARKS = ['approved', 'denied'] as const;
export type StampMark = (typeof STAMP_MARKS)[number];

export interface FilingStamp {
  mark: StampMark;
  /** When it was stamped, in-world. */
  at: IncidentTime;
}

/**
 * Everything a parchment shows, so the same request always draws the same
 * sheet (web/src/scribe/Parchment.tsx). The site's routes answer it already
 * checked: a filing is checked before it is stored.
 */
export interface ParchmentRequest {
  filing: Filing;
  /** The archive's entry number once filed; a preview has none. */
  serial: number | null;
  stamp: FilingStamp | null;
}

// ── What the website's Scribe routes answer ─────────────────────────────────

/** /api/scribe/seal: the member a code names, filled in on their filings. */
export interface ScribeHolder {
  rank: string;
  office: string;
  name: string;
}

/** POST /api/scribe/file: the entry number it was filed under. */
export interface FiledAnswer {
  id: number;
  /** Where the filing can be seen: the board, the Cabinet, or the Clerk Table. */
  destination: Destination['kind'];
}

/** GET /api/filings/:id: one filing, to draw as its parchment (the page the bot's posts link to). */
export interface FilingView {
  id: number;
  destination: Destination['kind'];
  filedAt: string;
  parchment: ParchmentRequest;
}

/** GET /api/solar/clerk: a filing at the Clerk Table, waiting for or bearing High Command's stamp. */
export interface ClerkFiling {
  id: number;
  category: FilingCategory;
  importance: Importance;
  title: string;
  /** Rank and name as signed. */
  signed: string;
  /** In-world: "4th of Heartfire, 4E 226, 6:04 PM". */
  incident: string;
  filedAt: string;
  stamp: StampMark | null;
  stampedAt: string | null;
  parchment: ParchmentRequest;
}

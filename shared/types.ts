// Shapes shared by the Worker (which produces them) and the web app (which
// renders them). Parsers in shared/parsers/ turn raw sheet grids into these.

/** Raw `values.get` result: rows of cell strings, index 0 = sheet row 1. */
export type Grid = string[][];

/** One cell from `spreadsheets.get?includeGridData=true`. */
export interface FormattedCell {
  value: string;
  /** Hover note, if any. Carries the calendar's event text. */
  note?: string;
  /** Background as `#rrggbb`. The calendar encodes day kind here. */
  background?: string;
}

/** Grid that keeps formatting. Only the calendar needs this. */
export type FormattedGrid = FormattedCell[][];

export type VolumeSlug =
  | 'roster'
  | 'statistics'
  | 'ledger'
  | 'stipends'
  | 'honor'
  | 'calendar'
  | 'history';

export type VolumeCategory =
  | 'Personnel'
  | 'Finance'
  | 'Honors & Calendar'
  | 'Chronicles';

/**
 * A volume the Embassy writes itself rather than reading from the spreadsheet.
 *
 * It has no tab, no range and no API route: its text is settled history, held
 * in the web app the same way the First Emissaries' deeds are. Keeping these
 * out of `VOLUMES` is deliberate — the Worker iterates that list to resolve tab
 * titles, so a chronicle listed there would be reported as withdrawn on every
 * request for want of a tab that was never meant to exist.
 */
export interface KeptVolume {
  slug: VolumeSlug;
  title: string;
  category: VolumeCategory;
}

export interface VolumeDefinition {
  slug: VolumeSlug;
  /** In-world title, as the sheet's own Index tab names it. */
  title: string;
  category: VolumeCategory;
  /**
   * How to find the tab. gids are not stable in this spreadsheet and the
   * calendar's title carries the in-world year, so matching is by title.
   */
  tab: { exact: string } | { prefix: string };
  /** A1 range to request, without the tab prefix. */
  range: string;
  /**
   * True when `values.get` is insufficient because meaning lives in cell
   * colours or notes. Only the calendar sets this.
   */
  needsGridData: boolean;
}

/** Every volume response carries this envelope. */
export interface VolumeEnvelope<T> {
  slug: VolumeSlug;
  title: string;
  /** Resolved tab title at read time — may drift from the definition. */
  tab: string;
  fetchedAtUtc: string;
  data: T;
}

// ── Roster ────────────────────────────────────────────────────────────────

export interface Member {
  /** 1-based sheet row, so the phase-2 admin console can address the cell. */
  row: number;
  unit: string;
  rank: string;
  name: string;
  race: string;
  /** Column E may list several handles separated by `/`. */
  discord: string[];
  status: string;
  /** Bot-owned (column G) — display only. */
  owed: boolean;
  /** Bot-owned (column H) — display only. */
  paid: boolean;
  notes: string;
  /** Bot-owned (column J), `YYYY-MM-DD HH:mm` UTC. */
  lastActive: string;
  /** Bot-owned (column K), reset every Monday. */
  hours: number;
}

// ── Statistics ────────────────────────────────────────────────────────────

export interface Tally {
  label: string;
  count: number;
}

/** Corps counts split across the JUNIOR/SENIOR/ELITE/LEADER columns. */
export interface CorpsTally {
  label: string;
  tiers: Record<string, number | null>;
  total: number;
}

export interface Statistics {
  membership: Tally[];
  corps: { tiers: string[]; rows: CorpsTally[] };
  races: Tally[];
  wings: Tally[];
}

// ── Ledger ────────────────────────────────────────────────────────────────

export interface PayTier {
  row: number;
  role: string;
  payment: number;
  /** Live COUNTIFS result over the Roster Owed checkboxes — never recomputed. */
  owed: number;
  total: number;
  /** A *count* of members already paid, not a checkbox. */
  paidCount: number;
  notes: string;
}

export interface Expense {
  row: number;
  expense: string;
  amount: number;
  to: string;
  /** A checkbox here, unlike `paidCount` on a pay tier. */
  paid: boolean;
  description: string;
}

export interface Ledger {
  tiers: PayTier[];
  totalActiveTroopsOwed: number | null;
  expenses: Expense[];
  /** Label/value pairs read off the summary row, in sheet order. */
  summary: { label: string; value: string; numeric: number | null }[];
  /** The treasurer's free-text note beneath the table, if present. */
  commentary: string;
}

// ── Stipends ──────────────────────────────────────────────────────────────

export interface StipendWeek {
  row: number;
  /** Column B is a two-line in-world date range. */
  from: string;
  to: string;
  received: number;
  spent: number;
  balance: number;
  /** Comma-formatted originals, for display. */
  display: { received: string; spent: string; balance: string };
  note: string;
}

export interface Stipends {
  weeks: StipendWeek[];
  balanceForWeek: string;
}

// ── Hall of Honor ─────────────────────────────────────────────────────────

export interface HonorEntry {
  row: number;
  name: string;
  citation: string;
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface CalendarEvent {
  name: string;
  /** In-world date line, e.g. `Frostfall 13, 4E 226`. */
  date: string;
  /** Remaining note lines, e.g. the unlawful-observance warning. */
  caution: string;
}

export interface CalendarDay {
  day: number;
  weekday: string;
  /** Legend label resolved from the cell's background colour. */
  kind: string;
  event: CalendarEvent | null;
}

export interface CalendarMonth {
  name: string;
  /** 1-based position in the Tamrielic year. */
  index: number;
  /** Rows of 7, `null` where the month has not started or has ended. */
  weeks: (CalendarDay | null)[][];
}

export interface CalendarYear {
  title: string;
  weekdays: string[];
  legend: { color: string; label: string }[];
  months: CalendarMonth[];
}

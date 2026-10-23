import type { ServedFiling } from '../../shared/filings';
// Client for /api. Same origin in development (Vite proxies to the Functions)
// and in production (Pages serves both), so there is no base URL to configure.

import { useEffect, useState } from 'react';
import type {
  CalendarYear, HonorEntry, Ledger, Member, Precedence, Stipends,
  VolumeCategory, VolumeEnvelope, VolumeSlug,
} from '../../shared/types';
import type { ReportSeverity } from '../../shared/reports';

export interface ShelfEntry {
  slug: VolumeSlug;
  title: string;
  category: VolumeCategory;
  /** Null when the volume's tab is missing from the spreadsheet. */
  tab: string | null;
}

export interface Shelf {
  reachable: boolean;
  fetchedAtUtc: string;
  volumes: ShelfEntry[];
}

/** The roster endpoint returns its summary alongside the members. */
export interface RosterData {
  members: Member[];
  total: number;
  byStatus: { label: string; count: number }[];
}

/**
 * Payload type per volume, so views are not handed `unknown`.
 *
 * Deliberately keyed on its own entries rather than on VolumeSlug: volumes the
 * Embassy keeps itself have no API route and no payload, and listing them here
 * would promise a fetch that will never happen. `useVolume` is constrained to
 * these keys, so asking the archivist for a chronicle is a type error.
 */
export interface VolumeData {
  roster: RosterData;
  statistics: Precedence;
  ledger: Ledger;
  stipends: Stipends;
  honor: HonorEntry[];
  calendar: CalendarYear;
}

/** Volumes with a register behind them, and therefore something to fetch. */
export type FetchableSlug = keyof VolumeData;

class ApiError extends Error {}

/*
 * There was a GATE_SEALED_EVENT here, and a RESEAL_GRACE_MS beside it. Any 401
 * meant the reader's writ had expired or been rotated out, so every fetch in
 * this file raised the event, App.tsx dropped back to the gate on it, and the
 * shell announced why before the page went. None of that has anything left to
 * fire it: the registers are public and answer no 401 at all, and the one
 * remaining lock — the Chronicles' — answers 403 for its own volume without
 * implying anything about the reader's standing anywhere else.
 */

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(body?.error ?? `The archive returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Async<T> =
  | { state: 'loading' }
  | { state: 'ready'; value: T }
  | { state: 'error'; message: string };

/**
 * `path` may be null to hold the request back — used by volumes that are shut
 * behind a second lock, so the archive is not asked for a body the reader is
 * not yet entitled to and handed a 403 to render as a failure.
 */
function useAsync<T>(path: string | null): Async<T> {
  const [result, setResult] = useState<Async<T>>({ state: 'loading' });

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    setResult({ state: 'loading' });

    get<T>(path, controller.signal)
      .then((value) => setResult({ state: 'ready', value }))
      .catch((error: unknown) => {
        // An abort is a navigation, not a failure — leave the state alone so
        // the outgoing view does not flash an error on its way out.
        if (controller.signal.aborted) return;
        setResult({
          state: 'error',
          message: error instanceof Error ? error.message : 'The archive is unreachable',
        });
      });

    return () => controller.abort();
  }, [path]);

  return result;
}

export const useShelf = () => useAsync<Shelf>('/api/volumes');

// ── Sealed volumes ────────────────────────────────────────────────────────

export interface ChronicleEntry {
  date: string;
  text: string;
  weight?: 'grave';
}

export interface ChronicleMonth {
  name: string;
  standfirst: string;
  entries: ChronicleEntry[];
}

export interface Chronicle {
  fetchedAtUtc: string;
  months: ChronicleMonth[];
  powers: { name: string; note: string }[];
  unresolved: { name: string; note: string }[];
  /*
   * The funeral notice that closes the volume's one open thread. Optional
   * because an archive deployed against an older Worker will not send it, and a
   * missing notice must render as no section rather than as an error.
   */
  funeral?: { lead: string; notice: string[]; close: string };
  /*
   * The Latest Filings — raw reports the chronicler Worker pulled overnight.
   *
   * OPTIONAL, because the Worker, its KV namespace and its token are each
   * allowed to be absent: an archive deployed without any of them serves the
   * written volume and no filings, which is the state this shipped in. Anything
   * reading this must treat missing and empty as the same.
   */
  filings?: ServedFiling[];
}

/**
 * Thalmor Chronicles. Fetched rather than bundled, so its text can be corrected
 * without a rebuild and the nightly filings laid after it. Public since
 * 2026-10-23, when its own word was retired with Ancarion's gate.
 */
export const useChronicle = () => useAsync<Chronicle>('/api/chronicle');

export interface EnforcementEntry {
  date: string;
  agent: string;
  /** The one name the act is filed under; see functions/lib/enforcement.ts. */
  hand: string;
  act: string;
  subject: string;
  title: string;
  method: string;
  outcome: string;
  kind: string;
}

export interface LedgerOfEnforcement {
  fetchedAtUtc: string;
  entries: EnforcementEntry[];
}

/**
 * Ledger of Enforcement. Served rather than bundled, like the Chronicles, but
 * behind NO lock: its one check was the archive writ, and that is gone. It is
 * fetched this way now only to keep its text out of the repository — see the
 * note at the head of functions/api/enforcement/index.ts.
 */
export const useEnforcement = () => useAsync<LedgerOfEnforcement>('/api/enforcement');

export interface Report {
  id: string;
  category: string;
  subcategory: string | null;
  severity: ReportSeverity;
  title: string;
  body: string;
  timestamp: string;
  authorName: string | null;
}

export interface ReportsResponse { reports: Report[]; nextCursor: string | null; }

/** The reader's filters. Held in the page URL too, so a view can be shared. */
export interface ReportsFilters {
  category: string | null;
  subcategory: string | null;
  severity: ReportSeverity | null;
  q: string | null;
  from: string | null;
  to: string | null;
}

export const NO_REPORT_FILTERS: ReportsFilters = {
  category: null, subcategory: null, severity: null, q: null, from: null, to: null,
};

/** Filters as query parameters, in a fixed order so equal views share a URL. */
export function reportsFilterQuery(filters: ReportsFilters): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of ['category', 'subcategory', 'severity', 'q', 'from', 'to'] as const) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  return query;
}

export const useReports = (unlocked: boolean, filters: ReportsFilters, cursor: string | null) => {
  const query = reportsFilterQuery(filters);
  if (cursor) query.set('cursor', cursor);
  return useAsync<ReportsResponse>(unlocked ? `/api/reports${query.size ? `?${query}` : ''}` : null);
};

export interface DrawerState {
  state: 'loading' | 'ready' | 'error';
  letters: Report[];
  /** True while the drawer holds more than has been read from the register. */
  more: boolean;
  loadMore: () => void;
}

/**
 * One drawer of the Cabinet: the register read by the drawer's date range,
 * thirty at a time, keeping exactly the drawer's own letters (the range is a
 * day wider than the drawer at each end). `range` and `keep` come from
 * web/src/room/cabinet-drawers.ts.
 */
export function useDrawer(
  unlocked: boolean,
  range: { from: string | null; to: string | null },
  keep: (report: Report) => boolean,
): DrawerState {
  const [letters, setLetters] = useState<Report[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<DrawerState['state']>('loading');
  const key = `${range.from ?? ''}|${range.to ?? ''}`;

  // A new range starts the drawer over.
  useEffect(() => { setLetters([]); setCursor(null); setNext(null); }, [key]);

  useEffect(() => {
    if (!unlocked) return;
    const controller = new AbortController();
    const query = reportsFilterQuery({ ...NO_REPORT_FILTERS, from: range.from, to: range.to });
    if (cursor) query.set('cursor', cursor);
    setState('loading');
    get<ReportsResponse>(`/api/reports${query.size ? `?${query}` : ''}`, controller.signal)
      .then((page) => {
        setLetters((held) => [...held, ...page.reports.filter(keep)]);
        setNext(page.nextCursor);
        setState('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
    // `keep` follows the range; the key and the cursor are what change a page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, key, cursor]);

  return { state, letters, more: next !== null, loadMore: () => { if (next) setCursor(next); } };
}

export const useReport = (unlocked: boolean, id: string | null) =>
  useAsync<{ report: Report }>(unlocked && id ? `/api/reports/${encodeURIComponent(id)}` : null);

export interface ReportsSummary {
  total: { category: string; severity: ReportSeverity; count: number }[];
  week: { category: string; severity: ReportSeverity; count: number }[];
  desks: { category: string; subcategory: string | null; filed: number; unassessed: number }[];
}

export const useReportsSummary = (unlocked: boolean) =>
  useAsync<ReportsSummary>(unlocked ? '/api/reports/summary' : null);

export async function reportsIsOpen(): Promise<boolean> {
  try {
    const response = await fetch('/api/reports/gate', { headers: { Accept: 'application/json' } });
    return Boolean(((await response.json()) as { open?: boolean }).open);
  } catch { return false; }
}

export interface GateResult {
  ok: boolean;
  message: string;
  retryAfterSeconds?: number;
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function submitGate(endpoint: string, passphrase: string, signal?: AbortSignal): Promise<GateResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ passphrase }),
  });
  if (response.ok) return { ok: true, message: '' };
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return {
    ok: false,
    message: body?.error ?? `The seal returned ${response.status}.`,
    retryAfterSeconds: response.status === 429 ? retryAfterSeconds(response.headers.get('Retry-After')) : undefined,
  };
}

export async function openReports(passphrase: string, signal?: AbortSignal): Promise<GateResult> {
  return submitGate('/api/reports/gate', passphrase, signal);
}

/** Whether this browser holds the Solar's writ (Ancarion's plate). */
export async function solarIsOpen(): Promise<boolean> {
  try {
    const response = await fetch('/api/solar/gate', { headers: { Accept: 'application/json' } });
    return Boolean(((await response.json()) as { open?: boolean }).open);
  } catch { return false; }
}

export async function openSolar(passphrase: string, signal?: AbortSignal): Promise<GateResult> {
  return submitGate('/api/solar/gate', passphrase, signal);
}

export function useVolume<S extends FetchableSlug>(
  slug: S,
): Async<VolumeEnvelope<VolumeData[S]>> {
  return useAsync<VolumeEnvelope<VolumeData[S]>>(`/api/volumes/${slug}`);
}

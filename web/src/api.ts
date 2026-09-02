import type { ServedFiling } from '../../shared/filings';
// Client for /api. Same origin in development (Vite proxies to the Functions)
// and in production (Pages serves both), so there is no base URL to configure.

import { useEffect, useState } from 'react';
import type {
  CalendarYear, HonorEntry, Ledger, Member, Precedence, Stipends,
  VolumeCategory, VolumeEnvelope, VolumeSlug,
} from '../../shared/types';

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
 * Thalmor Chronicles. Unlike History of the Realm this one is fetched rather
 * than bundled: its text is the Embassy's own intelligence, and a bundled
 * volume is a static asset that the Worker never gets to refuse. That is now
 * the only reason — with the archive open, everything else here is readable by
 * anyone, and this volume's own word is what still separates it from them.
 *
 * Held back until that lock is open — see useChronicle's caller.
 */
export const useChronicle = (unlocked: boolean) =>
  useAsync<Chronicle>(unlocked ? '/api/chronicle' : null);

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

/** Whether this browser already holds a writ for the volume itself. */
export async function chronicleIsOpen(): Promise<boolean> {
  try {
    const res = await fetch('/api/chronicle/gate', { headers: { Accept: 'application/json' } });
    const body = (await res.json()) as { open?: boolean };
    return Boolean(body.open);
  } catch {
    return false;
  }
}

/** Offer the volume's word. Resolves to null on success, or the refusal. */
export async function openChronicle(passphrase: string): Promise<string | null> {
  const res = await fetch('/api/chronicle/gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ passphrase }),
  });
  if (res.ok) return null;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `The volume returned ${res.status}`;
}

export function useVolume<S extends FetchableSlug>(
  slug: S,
): Async<VolumeEnvelope<VolumeData[S]>> {
  return useAsync<VolumeEnvelope<VolumeData[S]>>(`/api/volumes/${slug}`);
}

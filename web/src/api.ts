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

/** Fired when any volume answers 401 — the writ has expired or been rotated
 *  out, and the app should fall back to the gate. */
export const GATE_SEALED_EVENT = 'gate:sealed';

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(GATE_SEALED_EVENT));
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
}

/**
 * Thalmor Chronicles. Unlike History of the Realm this one is fetched
 * rather than bundled, because its text is the Embassy's own intelligence and
 * a static asset is readable without a writ. See SealedVolume in shared/types.
 *
 * Held back until the volume's own lock is open — see useChronicle's caller.
 */
export const useChronicle = (unlocked: boolean) =>
  useAsync<Chronicle>(unlocked ? '/api/chronicle' : null);

/** Whether this browser already holds a writ for the volume itself. */
export async function chronicleIsOpen(): Promise<boolean> {
  try {
    const res = await fetch('/api/chronicle/gate', { headers: { Accept: 'application/json' } });
    if (res.status === 401) {
      // The archive itself has resealed; that is the outer gate's business.
      window.dispatchEvent(new Event(GATE_SEALED_EVENT));
      return false;
    }
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
  if (res.status === 401 && !passphrase) window.dispatchEvent(new Event(GATE_SEALED_EVENT));
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `The volume returned ${res.status}`;
}

export function useVolume<S extends FetchableSlug>(
  slug: S,
): Async<VolumeEnvelope<VolumeData[S]>> {
  return useAsync<VolumeEnvelope<VolumeData[S]>>(`/api/volumes/${slug}`);
}

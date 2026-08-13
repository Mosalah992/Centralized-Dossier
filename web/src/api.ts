// Client for /api. Same origin in development (Vite proxies to the Functions)
// and in production (Pages serves both), so there is no base URL to configure.

import { useEffect, useState } from 'react';
import type {
  CalendarYear, HonorEntry, Ledger, Member, Statistics, Stipends,
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

/** Payload type per volume, so views are not handed `unknown`. */
export interface VolumeData {
  roster: RosterData;
  statistics: Statistics;
  ledger: Ledger;
  stipends: Stipends;
  honor: HonorEntry[];
  calendar: CalendarYear;
}

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

function useAsync<T>(path: string): Async<T> {
  const [result, setResult] = useState<Async<T>>({ state: 'loading' });

  useEffect(() => {
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

export function useVolume<S extends VolumeSlug>(
  slug: S,
): Async<VolumeEnvelope<VolumeData[S]>> {
  return useAsync<VolumeEnvelope<VolumeData[S]>>(`/api/volumes/${slug}`);
}

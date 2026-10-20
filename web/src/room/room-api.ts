// Reading /api/room/*, which does not exist until the Librarian backend lands.
//
// An absent backend is a supported state, not an error (CODEX invariant 4:
// optional infrastructure degrades quietly). The root middleware answers an
// unknown /api path with a JSON 404, and a 404 — or anything that is not JSON,
// such as an index.html from an older deploy — reads as "absent", which each
// surface turns into its own in-world empty state.

import { useEffect, useState } from 'react';

export type RoomData<T> =
  | { state: 'loading' }
  | { state: 'absent' }
  | { state: 'error'; status?: number }
  | { state: 'ok'; data: T };

export async function fetchRoom<T>(path: string, signal?: AbortSignal): Promise<RoomData<T>> {
  try {
    const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
    const json = (res.headers.get('Content-Type') ?? '').includes('application/json');
    if (res.status === 404 || res.status === 503 || !json) return { state: 'absent' };
    if (!res.ok) return { state: 'error', status: res.status };
    return { state: 'ok', data: (await res.json()) as T };
  } catch (error) {
    if (signal?.aborted) return { state: 'loading' };
    return { state: 'error' };
  }
}

/** Fetch a room path once per `path`; null skips the request. */
export function useRoomData<T>(path: string | null): RoomData<T> {
  const [data, setData] = useState<RoomData<T>>({ state: 'loading' });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setData({ state: 'loading' });
    void fetchRoom<T>(path, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [path]);
  return data;
}

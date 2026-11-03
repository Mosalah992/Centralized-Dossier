// The Clerk Table's list, shared by the table itself (ClerkTable.tsx), the
// count on its plaque and the alert that a new filing has arrived
// (views/Solar.tsx). Asked again every minute while the Solar is on screen and
// whenever the reader comes back to it, so a filing made meanwhile is
// announced without a reload. A failed check keeps the last list it had.

import { useCallback, useEffect, useState } from 'react';

import type { ClerkFiling, StampMark } from '../../../../shared/filing';

export interface ClerkList {
  waiting: ClerkFiling[];
  stamped: ClerkFiling[];
}

export type ClerkState = ClerkList | 'loading' | 'absent';

export type StampAnswer = { ok: true; filing: ClerkFiling } | { ok: false; error: string };

export interface Clerk {
  table: ClerkState;
  reload(): Promise<void>;
  stamp(filing: ClerkFiling, mark: StampMark): Promise<StampAnswer>;
}

/** How often the Solar asks whether anything new waits. */
export const CLERK_POLL_MS = 60_000;

export function useClerk(pollMs: number = CLERK_POLL_MS): Clerk {
  const [table, setTable] = useState<ClerkState>('loading');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/solar/clerk', { headers: { Accept: 'application/json' } });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) {
        setTable((was) => (typeof was === 'object' ? was : 'absent'));
        return;
      }
      setTable((await res.json()) as ClerkList);
    } catch {
      setTable((was) => (typeof was === 'object' ? was : 'absent'));
    }
  }, []);

  useEffect(() => {
    void reload();
    const onScreen = () => document.visibilityState === 'visible';
    const timer = window.setInterval(() => {
      if (onScreen()) void reload();
    }, pollMs);
    const back = () => {
      if (onScreen()) void reload();
    };
    document.addEventListener('visibilitychange', back);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', back);
    };
  }, [reload, pollMs]);

  const stamp = useCallback(
    async (filing: ClerkFiling, mark: StampMark): Promise<StampAnswer> => {
      try {
        const res = await fetch(`/api/solar/clerk/${filing.id}`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ mark }),
        });
        const data = (await res.json().catch(() => ({}))) as ClerkFiling & { error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? 'The stamp would not take.' };
        await reload();
        return { ok: true, filing: data };
      } catch {
        return { ok: false, error: 'The Clerk Table cannot be reached just now.' };
      }
    },
    [reload],
  );

  return { table, reload, stamp };
}

// The Clerk Table, in the Solar: what waits for High Command's stamp and what
// was lately stamped. Applications and Public Requests wait there, and so does
// any report that summoned High Command (Strategic, Cataclysm), until seen.
// Behind the Solar writ (lib/solar.ts); pure over the filing store.

import { incidentClock, incidentDate, type ClerkFiling } from '../../shared/filing';
import { CLERK_CATEGORIES, CLERK_LEVELS, type FilingRecord, type FilingStore } from './scribe';

export const CLERK_PAGE = 50;

export function clerkFiling(record: FilingRecord): ClerkFiling {
  const { filing } = record;
  return {
    id: record.id,
    category: filing.category,
    importance: filing.importance,
    title: filing.title,
    signed: [filing.rank, filing.name].filter(Boolean).join(' '),
    incident: `${incidentDate(filing.time)}, ${incidentClock(filing.time)}`,
    filedAt: record.filedAt,
    stamp: record.stamp?.mark ?? null,
    stampedAt: record.stampedAt,
    parchment: `/api/filings/${record.id}/parchment.png${record.stamp ? `?stamp=${record.stamp.mark}` : ''}`,
  };
}

export async function clerkTable(store: Pick<FilingStore, 'unstamped' | 'recentlyStamped'>) {
  const [waiting, stamped] = await Promise.all([store.unstamped(CLERK_CATEGORIES, CLERK_LEVELS, CLERK_PAGE), store.recentlyStamped(20)]);
  return { waiting: waiting.map(clerkFiling), stamped: stamped.map(clerkFiling) };
}

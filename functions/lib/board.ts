// The bulletin board from the Scribe's filings: every Bulletin Post not
// Denied by the Clerk, in its section, newest first (shared/room.ts shapes).
// Pure over the filing store, so the shapes are tested without D1.

import { BOARD_INFO, BOARD_SECTIONS, type BoardSection, type BoardSectionSummary, type Notice } from '../../shared/room';
import type { FilingRecord, FilingStore } from './scribe';

/** Notices shown in a section at once. */
export const BOARD_PAGE = 60;

export async function boardSummary(store: Pick<FilingStore, 'boardCounts'>): Promise<BoardSectionSummary[]> {
  const counts = new Map((await store.boardCounts()).map((c) => [c.section, c]));
  return BOARD_SECTIONS.map((id) => {
    const c = counts.get(id);
    return { id, ...BOARD_INFO[id], count: c?.count ?? 0, ...(c?.latestAt ? { latestAt: c.latestAt } : {}) };
  });
}

export function noticeOf(record: FilingRecord, section: BoardSection): Notice {
  const { filing } = record;
  return {
    id: record.id,
    section,
    title: filing.title,
    body: filing.body,
    postedBy: [filing.rank, filing.name].filter(Boolean).join(' '),
    stamp: 'aldmeri',
    postedAt: record.filedAt,
  };
}

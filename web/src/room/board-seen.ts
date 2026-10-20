// Which notices this reader has already seen, per browser.
//
// The Bruma board had no notion of "new". Here the board marks a section that
// has had something nailed to it since the reader last looked, and the room's
// board object carries a count. It is a convenience and nothing more: kept in
// localStorage, lost with a cleared browser, never sent anywhere, and every
// read and write survives storage being refused (private windows, previews).

import type { BoardSection, BoardSectionSummary } from '../../../shared/room';

const KEY = 'thalmor.board.seen';

/** Per section, the newest notice's postedAt the reader has seen. */
export type SeenState = Partial<Record<BoardSection, string>>;

export function readSeen(storage: Pick<Storage, 'getItem'> | null = safeStorage()): SeenState {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: SeenState = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k as BoardSection] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function markSeen(
  section: BoardSection,
  latestAt: string | undefined,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage(),
): SeenState {
  const seen = readSeen(storage);
  if (!latestAt) return seen;
  const next = { ...seen, [section]: latestAt };
  try {
    storage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* refused: the marks simply are not remembered */
  }
  return next;
}

/** True when the section holds something newer than the reader has seen. */
export function isUnseen(summary: Pick<BoardSectionSummary, 'id' | 'count' | 'latestAt'>, seen: SeenState): boolean {
  if (!summary.count || !summary.latestAt) return false;
  const last = seen[summary.id];
  return !last || summary.latestAt > last;
}

export function unseenCount(sections: readonly BoardSectionSummary[], seen: SeenState): number {
  return sections.filter((s) => isUnseen(s, seen)).length;
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

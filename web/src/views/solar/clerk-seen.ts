// Which filings at the Clerk Table this reader has already seen, per browser.
//
// The Solar marks a filing as new until the Clerk Table is opened (or the
// alert is put aside) after it arrived. Kept as the newest filing time seen,
// not an entry number, so renumbering the entries never hides a new one. A
// convenience and nothing more, as the board's marks are (room/board-seen.ts):
// kept in localStorage, lost with a cleared browser, never sent anywhere, and
// every read and write survives storage being refused.

import type { ClerkFiling } from '../../../../shared/filing';

const KEY = 'thalmor.clerk.seen';

/** The newest filedAt this reader has seen at the Clerk Table, or '' for none. */
export function readClerkSeen(storage: Pick<Storage, 'getItem'> | null = safeStorage()): string {
  try {
    const raw = storage?.getItem(KEY);
    return typeof raw === 'string' ? raw : '';
  } catch {
    return '';
  }
}

/** Remember everything filed up to `latestAt` as seen. Never moves backwards. */
export function markClerkSeen(latestAt: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): string {
  const seen = readClerkSeen(storage);
  if (!latestAt || latestAt <= seen) return seen;
  try {
    storage?.setItem(KEY, latestAt);
  } catch {
    /* refused: the marks simply are not remembered */
  }
  return latestAt;
}

/** The waiting filings filed after the reader last looked, newest first. */
export function unseenFilings<T extends Pick<ClerkFiling, 'filedAt'>>(waiting: readonly T[], seen: string): T[] {
  return waiting.filter((f) => f.filedAt > seen).sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
}

/** The newest filedAt among these filings, or '' for none. */
export const latestFiled = (filings: readonly Pick<ClerkFiling, 'filedAt'>[]): string =>
  filings.reduce((latest, f) => (f.filedAt > latest ? f.filedAt : latest), '');

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

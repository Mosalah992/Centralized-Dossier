import { describe, expect, it } from 'vitest';

import { latestFiled, markClerkSeen, readClerkSeen, unseenFilings } from '../web/src/views/solar/clerk-seen';

function memory(): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const filing = (id: number, filedAt: string) => ({ id, filedAt });

describe('what the Clerk Table has shown this reader', () => {
  it('counts everything waiting as new until the table is first opened', () => {
    const waiting = [filing(1, '2026-11-03T16:00:00.000Z'), filing(2, '2026-11-03T17:00:00.000Z')];
    expect(unseenFilings(waiting, readClerkSeen(memory())).map((f) => f.id)).toEqual([2, 1]);
  });

  it('marks up to the newest filing seen, and only what is filed after it is new', () => {
    const storage = memory();
    const seen = markClerkSeen(latestFiled([filing(1, '2026-11-03T16:00:00.000Z'), filing(2, '2026-11-03T17:00:00.000Z')]), storage);
    expect(seen).toBe('2026-11-03T17:00:00.000Z');
    const later = [filing(2, '2026-11-03T17:00:00.000Z'), filing(3, '2026-11-03T18:00:00.000Z')];
    expect(unseenFilings(later, readClerkSeen(storage)).map((f) => f.id)).toEqual([3]);
  });

  it('goes by when it was filed, so renumbered entries are still new', () => {
    const storage = memory();
    markClerkSeen('2026-11-03T17:00:00.000Z', storage);
    expect(unseenFilings([filing(1, '2026-11-04T09:00:00.000Z')], readClerkSeen(storage))).toHaveLength(1);
  });

  it('never moves the mark backwards, and survives storage being refused', () => {
    const storage = memory();
    markClerkSeen('2026-11-03T18:00:00.000Z', storage);
    expect(markClerkSeen('2026-11-03T12:00:00.000Z', storage)).toBe('2026-11-03T18:00:00.000Z');
    const refusing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readClerkSeen(refusing)).toBe('');
    expect(markClerkSeen('2026-11-03T18:00:00.000Z', refusing)).toBe('2026-11-03T18:00:00.000Z');
    expect(readClerkSeen(null)).toBe('');
  });
});

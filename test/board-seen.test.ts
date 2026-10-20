import { describe, expect, it } from 'vitest';

import { BOARD_INFO, BOARD_SECTIONS, isBoardSection, type BoardSectionSummary } from '../shared/room';
import { isUnseen, markSeen, readSeen, unseenCount } from '../web/src/room/board-seen';

function memory(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
}

const section = (id: BoardSectionSummary['id'], count: number, latestAt?: string): BoardSectionSummary => ({
  id,
  ...BOARD_INFO[id],
  count,
  latestAt,
});

describe("the board's sections", () => {
  it("are Bruma's six, with the Embassy's agenda in place of Bruma's", () => {
    expect(BOARD_SECTIONS).toEqual(['bounties', 'new-laws', 'figures-of-interest', 'embassy-agenda', 'bread-and-circus', 'news']);
    expect(isBoardSection('bruma-agenda')).toBe(false);
    expect(isBoardSection('bounties')).toBe(true);
  });
});

describe('what this reader has seen', () => {
  it('marks a section new until its newest notice has been read', () => {
    const storage = memory();
    const news = section('news', 2, '2026-10-19T10:00:00Z');
    expect(isUnseen(news, readSeen(storage))).toBe(true);
    markSeen('news', '2026-10-19T10:00:00Z', storage);
    expect(isUnseen(news, readSeen(storage))).toBe(false);
    expect(isUnseen(section('news', 3, '2026-10-19T12:00:00Z'), readSeen(storage))).toBe(true);
  });

  it('never marks an empty section', () => {
    expect(isUnseen(section('bounties', 0), {})).toBe(false);
  });

  it('counts the sections with something new', () => {
    const seen = { news: '2026-10-19T10:00:00Z' };
    expect(unseenCount([
      section('news', 1, '2026-10-19T10:00:00Z'),
      section('bounties', 1, '2026-10-18T09:00:00Z'),
      section('new-laws', 0),
    ], seen)).toBe(1);
  });

  it('survives storage that refuses or holds rubbish', () => {
    const refusing = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readSeen(refusing)).toEqual({});
    expect(markSeen('news', '2026-10-19T10:00:00Z', refusing)).toEqual({ news: '2026-10-19T10:00:00Z' });
    expect(readSeen(memory({ 'thalmor.board.seen': '{not json' }))).toEqual({});
    expect(readSeen(memory({ 'thalmor.board.seen': '{"news":4}' }))).toEqual({});
    expect(readSeen(null)).toEqual({});
  });
});

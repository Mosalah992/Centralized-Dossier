import { describe, expect, it } from 'vitest';

import {
  NO_SIEVE,
  filterRoster,
  rankTier,
  siftRoster,
  sortRoster,
  statusesOf,
  tiersOf,
  unitsOf,
} from '../web/src/views/roster-filter';
import type { Member } from '../shared/types';

/**
 * Invented names, as in fixtures.ts: the repository never holds the live roster.
 *
 * The roll is deliberately given in the Embassy's own order — Command first,
 * then the Militant Wing, then Supply — because the order it arrives in is
 * itself something the tests have to hold on to.
 */
const member = (m: Partial<Member> & { name: string }): Member => ({
  row: 0,
  unit: 'Militant Wing',
  rank: 'Soldier',
  race: 'Altmer',
  discord: [],
  status: 'ACTIVE',
  owed: false,
  paid: false,
  notes: '',
  lastActive: '2026-08-01 12:00',
  hours: 0,
  ...m,
});

const ROLL: Member[] = [
  member({ row: 4, name: 'Aranwe', unit: 'Command', rank: 'First Emissary', hours: 11.26, lastActive: '2026-08-11 04:12' }),
  member({ row: 5, name: 'Torvaril', rank: 'Justiciar', hours: 36.69, notes: 'FIREBALL', lastActive: '2026-08-09 21:03' }),
  member({ row: 6, name: 'Miraleth', unit: 'Supply', rank: 'Recruit', race: 'Khajiit', status: 'JUST JOINED', hours: 0, lastActive: '' }),
  member({ row: 7, name: 'Sildwen', unit: 'Diplomatic Wing', rank: 'Ambassador', race: 'Bosmer', status: 'LOA', notes: 'on leave', hours: 4, lastActive: '2026-07-02 10:00' }),
  member({ row: 8, name: 'Elenwen', unit: 'Command', rank: '', status: '', hours: 2, lastActive: '' }),
];

const names = (ms: Member[]) => ms.map((m) => m.name);

describe('reading the roll by tier', () => {
  it('places a rank in the tier its wording earns', () => {
    expect(rankTier('First Emissary')).toBe('command');
    expect(rankTier('High Justiciar')).toBe('command');
    expect(rankTier('Justiciar')).toBe('justiciar');
    expect(rankTier('Black Talon')).toBe('talon');
    expect(rankTier('Recruit')).toBe('entry');
  });

  it('takes the most specific match rather than the first plausible one', () => {
    // Both patterns match the words; command is listed first for this reason.
    expect(rankTier('High Justiciar')).toBe('command');
  });

  it('calls a rank it does not recognise blank rather than guessing', () => {
    expect(rankTier('Cook')).toBe('blank');
    expect(rankTier('')).toBe('blank');
  });
});

describe('the options offered', () => {
  it('names the wings on the roll, alphabetically and once each', () => {
    expect(unitsOf(ROLL)).toEqual(['Command', 'Diplomatic Wing', 'Militant Wing', 'Supply']);
  });

  it('leaves a blank wing out rather than offering an unnamed option', () => {
    expect(unitsOf([...ROLL, member({ name: 'Nobody', unit: '' })])).not.toContain('');
  });

  it('offers standings actually held', () => {
    expect(statusesOf(ROLL)).toEqual(['ACTIVE', 'JUST JOINED', 'LOA']);
  });

  it('offers tiers in seniority order, not alphabetically, with the unranked last', () => {
    // No soldier is on this roll, so no soldier tier is offered — the controls
    // list what is there, not what the scheme could describe.
    expect(tiersOf(ROLL)).toEqual(['command', 'justiciar', 'diplomatic', 'entry', 'blank']);
  });
});

describe('narrowing the roll', () => {
  it('keeps everyone when nothing is asked', () => {
    expect(filterRoster(ROLL, NO_SIEVE)).toHaveLength(ROLL.length);
  });

  it('matches a name regardless of case', () => {
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: 'TORV' }))).toEqual(['Torvaril']);
  });

  it('searches the race, the rank, the wing and the note as well as the name', () => {
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: 'khajiit' }))).toEqual(['Miraleth']);
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: 'ambassador' }))).toEqual(['Sildwen']);
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: 'supply' }))).toEqual(['Miraleth']);
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: 'fireball' }))).toEqual(['Torvaril']);
  });

  it('does not search the Discord handles, which this table never prints', () => {
    const withHandle = [member({ name: 'Aranwe', discord: ['@aranwe'] })];
    expect(filterRoster(withHandle, { ...NO_SIEVE, query: 'aranwe' })).toHaveLength(1);
    expect(filterRoster(withHandle, { ...NO_SIEVE, query: '@aranwe' })).toHaveLength(0);
  });

  it('ignores surrounding whitespace in the term', () => {
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, query: '  sildwen  ' }))).toEqual(['Sildwen']);
  });

  it('narrows by wing, by tier and by standing', () => {
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, unit: 'Command' }))).toEqual(['Aranwe', 'Elenwen']);
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, tier: 'entry' }))).toEqual(['Miraleth']);
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, status: 'LOA' }))).toEqual(['Sildwen']);
  });

  it('takes every condition together, not the loosest of them', () => {
    expect(filterRoster(ROLL, { ...NO_SIEVE, unit: 'Command', tier: 'entry' })).toHaveLength(0);
    expect(names(filterRoster(ROLL, { query: 'aranwe', unit: 'Command', tier: 'command', status: 'ACTIVE' })))
      .toEqual(['Aranwe']);
  });

  it('finds the unranked under the blank tier rather than losing them', () => {
    expect(names(filterRoster(ROLL, { ...NO_SIEVE, tier: 'blank' }))).toEqual(['Elenwen']);
  });

  it('does not alter the roll it was given', () => {
    const before = names(ROLL);
    filterRoster(ROLL, { ...NO_SIEVE, query: 'a' });
    expect(names(ROLL)).toEqual(before);
  });
});

describe('ordering the roll', () => {
  it('orders by name both ways', () => {
    expect(names(sortRoster(ROLL, { column: 'name', direction: 'ascending' })))
      .toEqual(['Aranwe', 'Elenwen', 'Miraleth', 'Sildwen', 'Torvaril']);
    expect(names(sortRoster(ROLL, { column: 'name', direction: 'descending' })))
      .toEqual(['Torvaril', 'Sildwen', 'Miraleth', 'Elenwen', 'Aranwe']);
  });

  it('orders hours as numbers, not as text', () => {
    // 11.26 must sit below 36.69; as strings it would sit above it.
    expect(names(sortRoster(ROLL, { column: 'hours', direction: 'ascending' })))
      .toEqual(['Miraleth', 'Elenwen', 'Sildwen', 'Aranwe', 'Torvaril']);
  });

  it('treats zero hours as a figure rather than as a blank', () => {
    // Miraleth is at 0 and leads the ascending order; were 0 read as missing,
    // the blanks-last rule would sink them to the bottom instead.
    const ordered = sortRoster(ROLL, { column: 'hours', direction: 'ascending' });
    expect(names(ordered).at(0)).toBe('Miraleth');
  });

  it('orders posting by seniority rather than by the rank alphabetically', () => {
    // Ambassador would lead alphabetically; the First Emissary leads by rank.
    const ordered = names(sortRoster(ROLL, { column: 'posting', direction: 'ascending' }));
    expect(ordered.slice(0, 4)).toEqual(['Aranwe', 'Torvaril', 'Sildwen', 'Miraleth']);
  });

  it('sinks blanks to the bottom whichever way the column is turned', () => {
    for (const direction of ['ascending', 'descending'] as const) {
      const ordered = sortRoster(ROLL, { column: 'lastActive', direction });
      expect(ordered.slice(-2).map((m) => m.lastActive)).toEqual(['', '']);
    }
    // And the unranked stay last when the posting column is reversed.
    const posting = sortRoster(ROLL, { column: 'posting', direction: 'descending' });
    expect(names(posting).at(-1)).toBe('Elenwen');
  });

  it('holds ties in the order the register keeps them', () => {
    const tied = [
      member({ row: 3, name: 'Third', unit: 'Command' }),
      member({ row: 1, name: 'First', unit: 'Command' }),
      member({ row: 2, name: 'Second', unit: 'Command' }),
    ];
    // Every one of these is an ACTIVE soldier, so the column decides nothing
    // and the sheet's order must survive — in both directions.
    expect(names(sortRoster(tied, { column: 'status', direction: 'ascending' })))
      .toEqual(['Third', 'First', 'Second']);
    expect(names(sortRoster(tied, { column: 'status', direction: 'descending' })))
      .toEqual(['Third', 'First', 'Second']);
  });

  it('does not alter the roll it was given', () => {
    const before = names(ROLL);
    sortRoster(ROLL, { column: 'name', direction: 'descending' });
    expect(names(ROLL)).toEqual(before);
  });
});

describe('both passes together', () => {
  it('narrows first and orders what is left', () => {
    expect(names(siftRoster(ROLL, { ...NO_SIEVE, unit: 'Command' }, { column: 'name', direction: 'descending' })))
      .toEqual(['Elenwen', 'Aranwe']);
  });

  it('leaves the register in its own order when nothing is asked of it', () => {
    expect(names(siftRoster(ROLL, NO_SIEVE, null))).toEqual(names(ROLL));
  });
});

import { describe, expect, it } from 'vitest';

import { RANK_PRECEDENCE, buildHierarchy, unrankedRanks } from '../shared/hierarchy';
import { UNRECORDED, WING_ORDER } from '../shared/statistics';
import type { Member } from '../shared/types';

let row = 3;
const member = (unit: string, rank: string, name: string, race = 'Altmer'): Member => ({
  row: ++row,
  unit, rank, name, race,
  discord: ['someone'], status: 'ACTIVE', owed: false, paid: false,
  notes: 'a private note', lastActive: '2026-08-01 00:00', hours: 4,
});

/**
 * The live roster's shape, by wing and rank. Taken from the register itself,
 * not invented: Militant sums to 59, which is the figure the roster and the
 * request independently agree on.
 */
const LIVE: [string, string, number][] = [
  ['Command', 'First Emissary', 1],
  ['Command', 'Inquisitor', 1],
  ['Command', 'Battlereeve', 1],
  ['Command', 'Justiciar', 2],
  ['Command', 'Canonreeve', 1],

  ['Militant Wing', 'Black Talon', 3],
  ['Militant Wing', 'Junior Officer', 8],
  ['Militant Wing', 'Elite Soldier', 3],
  ['Militant Wing', 'Senior Soldier', 8],
  ['Militant Wing', 'Junior Soldier', 15],
  ['Militant Wing', 'Recruit', 22],

  ['Diplomatic Wing', 'Advisor', 1],
  ['Diplomatic Wing', 'Grand Ambassador', 1],
  ['Diplomatic Wing', 'Ambassador', 3],
  ['Diplomatic Wing', 'Embassy Staff', 9],
  ['Diplomatic Wing', 'Intern', 1],

  ['Administrative Wing', 'Quartermaster', 1],
  ['Administrative Wing', 'Lead Medical', 1],
  ['Administrative Wing', 'Medical Staff', 4],
  ['Administrative Wing', 'Supply Corps', 6],
  ['Administrative Wing', 'Admin Assistant', 1],
  ['Administrative Wing', 'Steward', 1],
];

const liveRoster = (): Member[] =>
  LIVE.flatMap(([unit, rank, n]) =>
    Array.from({ length: n }, (_, i) => member(unit, rank, `${rank} ${String(i).padStart(2, '0')}`)));

const leaves = (tree: ReturnType<typeof buildHierarchy>) =>
  tree.flatMap((w) => w.ranks.flatMap((r) => r.members));

describe('the Embassy as a tree', () => {
  it('places every member exactly once', () => {
    const roster = liveRoster();
    const all = leaves(buildHierarchy(roster));
    expect(all).toHaveLength(roster.length);
    expect(new Set(all.map((p) => p.name)).size).toBe(roster.length);
  });

  it('reconciles the Militant Wing to 59 across its six ranks', () => {
    const militant = buildHierarchy(liveRoster()).find((w) => w.wing === 'Militant Wing')!;
    expect(militant.ranks).toHaveLength(6);
    expect(militant.total).toBe(59);
  });

  it('states a total per wing that matches its own leaves', () => {
    for (const wing of buildHierarchy(liveRoster())) {
      const counted = wing.ranks.reduce((n, r) => n + r.members.length, 0);
      expect(wing.total).toBe(counted);
    }
  });

  it('orders the wings by precedence, not by size or the alphabet', () => {
    expect(buildHierarchy(liveRoster()).map((w) => w.wing)).toEqual(WING_ORDER);
  });

  it('orders the rungs by standing', () => {
    const command = buildHierarchy(liveRoster()).find((w) => w.wing === 'Command')!;
    expect(command.ranks.map((r) => r.rank)).toEqual([
      'First Emissary', 'Inquisitor', 'Battlereeve', 'Justiciar', 'Canonreeve',
    ]);
    // All five are LEADER tier in the corps table, so nothing derivable
    // separates them — this ordering is the point of RANK_PRECEDENCE.
    expect(RANK_PRECEDENCE.indexOf('First Emissary'))
      .toBeLessThan(RANK_PRECEDENCE.indexOf('Canonreeve'));
  });

  it('names people alphabetically within a rank', () => {
    const tree = buildHierarchy([
      member('Command', 'Justiciar', 'Sir Havi of House Velrith'),
      member('Command', 'Justiciar', 'Iwelien Loraenthal'),
    ]);
    expect(tree[0]!.ranks[0]!.members.map((m) => m.name))
      .toEqual(['Iwelien Loraenthal', 'Sir Havi of House Velrith']);
  });
});

describe('nothing is dropped', () => {
  it('keeps a rank the precedence list has never heard of, at the end', () => {
    const tree = buildHierarchy([
      member('Command', 'Hortator', 'Someone New'),
      member('Command', 'First Emissary', 'Lord Lakkon Lourinien'),
    ]);
    const ranks = tree[0]!.ranks.map((r) => r.rank);
    expect(ranks).toEqual(['First Emissary', 'Hortator']);
    expect(leaves(tree)).toHaveLength(2);
  });

  it('keeps a wing the ordering has never heard of, at the end', () => {
    const tree = buildHierarchy([
      member('Shadow Wing', 'Recruit', 'A'),
      member('Command', 'First Emissary', 'B'),
    ]);
    expect(tree.map((w) => w.wing)).toEqual(['Command', 'Shadow Wing']);
  });

  it('gives a member with no unit and no rank a place to stand', () => {
    // The live roster has exactly one of these, and the last time a list was
    // assumed complete two ranks went uncounted with nothing to say so.
    const tree = buildHierarchy([member('', '', 'The Unplaced')]);
    expect(tree[0]!.wing).toBe(UNRECORDED);
    expect(tree[0]!.ranks[0]!.rank).toBe(UNRECORDED);
    expect(leaves(tree)).toHaveLength(1);
  });

  it('names the ranks the precedence list does not place', () => {
    expect(unrankedRanks(liveRoster())).toEqual([]);
    expect(unrankedRanks([member('Command', 'Hortator', 'X')])).toEqual(['Hortator']);
  });
});

describe('what the tree does not carry', () => {
  it('sends a name and a race, and nothing else about a person', () => {
    // The Member handed in has a handle, a private note, hours and a last-active
    // time. None of it may reach the browser for this volume.
    const [person] = leaves(buildHierarchy([member('Command', 'Advisor', 'Akira Frey', 'Khajiit')]));
    expect(person).toEqual({ name: 'Akira Frey', race: 'Khajiit' });
    expect(Object.keys(person!)).toEqual(['name', 'race']);

    const wire = JSON.stringify(buildHierarchy(liveRoster()));
    expect(wire).not.toContain('someone');        // discord handle
    expect(wire).not.toContain('a private note'); // notes
    expect(wire).not.toContain('lastActive');
    expect(wire).not.toContain('hours');
  });
});

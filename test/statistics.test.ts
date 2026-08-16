import { describe, expect, it } from 'vitest';

import { POSTINGS, computeStatistics, postingOf, unplacedRanks, UNRECORDED } from '../shared/statistics';
import type { Member } from '../shared/types';

let row = 3;
const member = (over: Partial<Member> = {}): Member => ({
  row: ++row,
  unit: 'Militant Wing',
  rank: 'Recruit',
  name: `Member ${row}`,
  race: 'Altmer',
  discord: [],
  status: 'ACTIVE',
  owed: false,
  paid: false,
  notes: '',
  lastActive: '',
  hours: 0,
  ...over,
});

const sum = (rows: { count: number }[]) => rows.reduce((a, r) => a + r.count, 0);

/** The live roster as it actually stands, by rank. */
const LIVE_RANKS: [string, number][] = [
  ['Recruit', 22], ['Junior Soldier', 15], ['Embassy Staff', 9], ['Junior Officer', 8],
  ['Senior Soldier', 8], ['Supply Corps', 6], ['Medical Staff', 4], ['Ambassador', 3],
  ['Black Talon', 3], ['Elite Soldier', 3], ['Justiciar', 2], ['First Emissary', 1],
  ['Inquisitor', 1], ['Battlereeve', 1], ['Canonreeve', 1], ['Advisor', 1],
  ['Grand Ambassador', 1], ['Lead Medical', 1], ['Quartermaster', 1],
  ['Admin Assistant', 1], ['Steward', 1], ['Intern', 1], ['', 1],
];

const liveRoster = (): Member[] =>
  LIVE_RANKS.flatMap(([rank, n]) => Array.from({ length: n }, () => member({ rank })));

describe('counting the roster', () => {
  it('takes TOTAL MEMBERS from the rows themselves', () => {
    const stats = computeStatistics([member(), member(), member()]);
    expect(stats.membership[0]).toEqual({ label: 'TOTAL MEMBERS', count: 3 });
  });

  it('is the figure the Stats tab got wrong', () => {
    // The sheet read 96 while its own status rows summed to 95.
    const roster = liveRoster();
    expect(roster).toHaveLength(95);
    expect(computeStatistics(roster).membership[0]!.count).toBe(95);
  });

  it('never loses a member out of the corps block', () => {
    // The Stats tab summed to 91 against a roster of 95. This is the guarantee
    // that replaces it, and it has to hold for ranks the table does not know.
    const stats = computeStatistics(liveRoster());
    const total = stats.corps.rows.reduce((a, r) => a + r.total, 0);
    expect(total).toBe(95);
  });

  it('balances every block against the roster', () => {
    const roster = liveRoster();
    const stats = computeStatistics(roster);
    expect(sum(stats.membership.slice(1))).toBe(roster.length);
    expect(sum(stats.races)).toBe(roster.length);
    expect(sum(stats.wings)).toBe(roster.length);
  });

  it('records the Inquisitor the sheet reported as zero', () => {
    const stats = computeStatistics(liveRoster());
    const inquisitor = stats.corps.rows.find((r) => r.label === 'INQUISITOR');
    expect(inquisitor?.total).toBe(1);
    expect(inquisitor?.tiers.LEADER).toBe(1);
  });
});

describe('ranks the table does not place', () => {
  it('has none left on the live roster', () => {
    expect(unplacedRanks(liveRoster())).toEqual([]);
  });

  it('gives an unknown rank a row of its own rather than dropping it', () => {
    const stats = computeStatistics([member({ rank: 'Hortator' }), member()]);
    const row = stats.corps.rows.find((r) => r.label === 'HORTATOR');
    expect(row?.total).toBe(1);
    // Tiers left blank: it is counted, and where it belongs is not yet known.
    expect(Object.values(row!.tiers).every((v) => v === null)).toBe(true);
    expect(stats.corps.rows.reduce((a, r) => a + r.total, 0)).toBe(2);
  });

  it('counts a member with no rank at all', () => {
    const stats = computeStatistics([member({ rank: '' })]);
    const row = stats.corps.rows.find((r) => r.label === UNRECORDED.toUpperCase());
    expect(row?.total).toBe(1);
    expect(stats.corps.rows.reduce((a, r) => a + r.total, 0)).toBe(1);
  });
});

describe('the corps grid', () => {
  it('splits a corps across its tiers', () => {
    const stats = computeStatistics([
      member({ rank: 'Junior Soldier' }), member({ rank: 'Junior Soldier' }),
      member({ rank: 'Senior Soldier' }), member({ rank: 'Elite Soldier' }),
    ]);
    const soldiers = stats.corps.rows.find((r) => r.label === 'SOLDIERS')!;
    expect(soldiers.tiers).toEqual({ JUNIOR: 2, SENIOR: 1, ELITE: 1, LEADER: null });
    expect(soldiers.total).toBe(4);
  });

  it('leaves a tier blank rather than zero where no one holds it', () => {
    // A blank means "not applicable to this corps", which the sheet's own
    // rendering distinguishes from an explicit nobody.
    const stats = computeStatistics([member({ rank: 'Canonreeve' })]);
    const row = stats.corps.rows.find((r) => r.label === 'CANONREEVE')!;
    expect(row.tiers.LEADER).toBe(1);
    expect(row.tiers.JUNIOR).toBeNull();
  });

  it('reads rank case- and space-insensitively', () => {
    expect(postingOf('  SENIOR SOLDIER ')).toEqual({ corps: 'SOLDIERS', tier: 'SENIOR' });
    expect(postingOf('Not A Rank')).toBeNull();
  });

  it('places every rank the live roster uses', () => {
    const named = LIVE_RANKS.map(([r]) => r).filter(Boolean);
    expect(named.every((r) => postingOf(r))).toBe(true);
    expect(Object.keys(POSTINGS).length).toBeGreaterThanOrEqual(named.length);
  });

  it('seats the Canonreeve’s two staff between the corps and its Quartermaster', () => {
    const stats = computeStatistics(liveRoster());
    const supply = stats.corps.rows.find((r) => r.label === 'SUPPLY CORPS')!;
    expect(supply.tiers).toEqual({ JUNIOR: 6, SENIOR: 2, ELITE: 1, LEADER: null });
    // The Stats tab had this corps at 7, missing both of them.
    expect(supply.total).toBe(9);
  });
});

describe('the tallies', () => {
  it('keeps a known status at zero rather than hiding it', () => {
    const stats = computeStatistics([member({ status: 'ACTIVE' })]);
    expect(stats.membership.find((m) => m.label === 'ARRESTED')).toEqual({
      label: 'ARRESTED', count: 0,
    });
  });

  it('surfaces a status the Embassy has not used before', () => {
    const stats = computeStatistics([member({ status: 'SECONDED' })]);
    expect(stats.membership.find((m) => m.label === 'SECONDED')?.count).toBe(1);
  });

  it('counts a member whose wing or race is blank', () => {
    const stats = computeStatistics([member({ unit: '', race: '' })]);
    expect(stats.wings.find((w) => w.label === UNRECORDED)?.count).toBe(1);
    expect(stats.races.find((r) => r.label === UNRECORDED)?.count).toBe(1);
  });

  it('orders wings by precedence and races by count', () => {
    const stats = computeStatistics([
      member({ unit: 'Militant Wing', race: 'Khajiit' }),
      member({ unit: 'Command', race: 'Altmer' }),
      member({ unit: 'Command', race: 'Altmer' }),
    ]);
    expect(stats.wings.map((w) => w.label).slice(0, 2)).toEqual(['Command', 'Militant Wing']);
    expect(stats.races.map((r) => r.label)).toEqual(['Altmer', 'Khajiit']);
  });
});

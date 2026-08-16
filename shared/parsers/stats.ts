// Stats tab. Not a table — four independent blocks share one grid, each with
// its own label column:
//
//   B/C   membership    TOTAL MEMBERS, ACTIVE, INACTIVE, ABSENT, LOA, …
//   E     corps         counts spread across F/G/H/I = JUNIOR/SENIOR/ELITE/LEADER
//   K/L   race
//   N/O   wing
//
// Blocks have interior gaps (MEDICAL has no JUNIOR count; the race list skips a
// row), so each is swept over a window and blank label rows are dropped rather
// than treated as the end of the block.
//
// NO LONGER WHAT THE VOLUME RENDERS. The drift this comment used to shrug at
// turned out to be real and one-sided: the tab read 96 TOTAL MEMBERS while its
// own status rows summed to 95, and its corps block summed to 91 against a
// roster of 95, losing four people and recording no Inquisitor where the roster
// has one. Roster Statistics is now counted off the Roster itself — see
// shared/statistics.ts, and server/archive.ts for the dispatch.
//
// This parser is kept, and kept under test, because the Stats tab is still in
// the spreadsheet and still maintained by hand: reading it is how anyone would
// compare the two. Nothing in the serving path calls it.

import type { CorpsTally, Grid, Statistics, Tally } from '../types';
import { at, isOrnament, num } from '../text';

const TIER_HEADER_ROW = 2; // 0-based: sheet row 3
const FIRST_DATA_ROW = 3;  // 0-based: sheet row 4
const LAST_DATA_ROW = 20;  // 0-based: sheet row 21, past the longest block

const COL = {
  MEMBERSHIP_LABEL: 1, MEMBERSHIP_COUNT: 2,
  CORPS_LABEL: 4, CORPS_FIRST_TIER: 5, CORPS_LAST_TIER: 8,
  RACE_LABEL: 10, RACE_COUNT: 11,
  WING_LABEL: 13, WING_COUNT: 14,
} as const;

/** Sweep a label/count column pair, skipping gaps and ornamental rows. */
function sweepTally(grid: Grid, labelCol: number, countCol: number): Tally[] {
  const out: Tally[] = [];
  for (let r = FIRST_DATA_ROW; r <= LAST_DATA_ROW; r++) {
    const label = at(grid, r, labelCol);
    if (!label || isOrnament(label)) continue;
    out.push({ label, count: num(at(grid, r, countCol)) ?? 0 });
  }
  return out;
}

export function parseStats(grid: Grid): Statistics {
  const tiers: string[] = [];
  for (let c = COL.CORPS_FIRST_TIER; c <= COL.CORPS_LAST_TIER; c++) {
    const header = at(grid, TIER_HEADER_ROW, c);
    if (header) tiers.push(header);
  }

  const corpsRows: CorpsTally[] = [];
  for (let r = FIRST_DATA_ROW; r <= LAST_DATA_ROW; r++) {
    const label = at(grid, r, COL.CORPS_LABEL);
    if (!label || isOrnament(label)) continue;

    const tierCounts: Record<string, number | null> = {};
    let total = 0;
    tiers.forEach((tier, i) => {
      // A blank tier cell means "not applicable to this corps", which is not
      // the same as an explicit 0 — keep the distinction for rendering.
      const value = num(at(grid, r, COL.CORPS_FIRST_TIER + i));
      tierCounts[tier] = value;
      total += value ?? 0;
    });

    corpsRows.push({ label, tiers: tierCounts, total });
  }

  return {
    membership: sweepTally(grid, COL.MEMBERSHIP_LABEL, COL.MEMBERSHIP_COUNT),
    corps: { tiers, rows: corpsRows },
    races: sweepTally(grid, COL.RACE_LABEL, COL.RACE_COUNT),
    wings: sweepTally(grid, COL.WING_LABEL, COL.WING_COUNT),
  };
}

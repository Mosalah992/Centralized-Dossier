// Roster Statistics, counted off the Roster itself.
//
// This volume used to render the Stats tab, which keeps its own tallies by hand.
// Those tallies had drifted, and the sheet disagreed with itself: TOTAL MEMBERS
// read 96 while its own status rows summed to 95, which is what the Roster
// actually holds. The corps block summed to 91, losing four people outright, and
// recorded no Inquisitor where the Roster has one.
//
// The status, race and wing blocks were already right — they matched the Roster
// exactly — so this is not a rebuke of the sheet so much as a decision about
// which copy is the record. The Roster is: it is the thing that is edited when a
// member joins, moves or leaves, and every other count is downstream of it.
//
// WHAT IS COUNTED DIRECTLY. Status, race and wing are columns on the Roster, so
// those three blocks are a tally and nothing more — no table, no judgement, and
// they cannot fall out of step with the register they came from.
//
// WHAT NEEDS A TABLE. The corps block is a grid of corps against JUNIOR/SENIOR/
// ELITE/LEADER, and the Roster records neither: it records a rank. "Senior
// Soldier" is a soldier of the senior tier, but "Quartermaster" is the elite of
// the Supply Corps and nothing in the string says so. So POSTINGS maps rank to
// the two, and it was not invented — it is the mapping that reproduces the
// sheet's own corps figures, which is how it was checked.
//
// A rank not in that table is NOT dropped. It becomes a row of its own with its
// tiers left blank, so the corps block always sums to the roster and an unknown
// rank shows up as a question rather than as a silent absence. That is the
// specific failure this file exists to prevent.

import type { CorpsTally, Member, Statistics, Tally } from './types';

export const TIERS = ['JUNIOR', 'SENIOR', 'ELITE', 'LEADER'] as const;
export type Tier = (typeof TIERS)[number];

export interface Posting {
  corps: string;
  tier: Tier;
}

/**
 * Rank as the Roster writes it (lowercased) to its place in the corps grid.
 * Verified against the Stats tab: every rank here reproduces that block's own
 * number, which is what makes it a transcription rather than a guess.
 */
export const POSTINGS: Readonly<Record<string, Posting>> = {
  'recruit': { corps: 'RECRUITS', tier: 'JUNIOR' },

  'intern': { corps: 'STAFF', tier: 'JUNIOR' },
  'embassy staff': { corps: 'STAFF', tier: 'SENIOR' },

  'junior soldier': { corps: 'SOLDIERS', tier: 'JUNIOR' },
  'senior soldier': { corps: 'SOLDIERS', tier: 'SENIOR' },
  'elite soldier': { corps: 'SOLDIERS', tier: 'ELITE' },

  'junior officer': { corps: 'OFFICERS', tier: 'JUNIOR' },

  'medical staff': { corps: 'MEDICAL', tier: 'SENIOR' },
  'lead medical': { corps: 'MEDICAL', tier: 'ELITE' },

  'supply corps': { corps: 'SUPPLY CORPS', tier: 'JUNIOR' },
  // Both answer to the Canonreeve directly, which puts them above the corps'
  // rank and file and below its Quartermaster. They fill the SENIOR column the
  // Stats tab left blank here — and neither appeared in that block at all,
  // which is two of the four members it was losing.
  'admin assistant': { corps: 'SUPPLY CORPS', tier: 'SENIOR' },
  'steward': { corps: 'SUPPLY CORPS', tier: 'SENIOR' },
  'quartermaster': { corps: 'SUPPLY CORPS', tier: 'ELITE' },

  'black talon': { corps: 'BLACK TALON', tier: 'ELITE' },

  'ambassador': { corps: 'AMBASSADORS', tier: 'JUNIOR' },
  'grand ambassador': { corps: 'AMBASSADORS', tier: 'ELITE' },

  'canonreeve': { corps: 'CANONREEVE', tier: 'LEADER' },
  'battlereeve': { corps: 'BATTLEREEVE', tier: 'LEADER' },
  'advisor': { corps: 'ADVISOR', tier: 'LEADER' },
  'inquisitor': { corps: 'INQUISITOR', tier: 'LEADER' },
  'justiciar': { corps: 'JUSTICIARS', tier: 'LEADER' },
  'high justiciar': { corps: 'HIGH JUSTICIAR', tier: 'LEADER' },
  'first emissary': { corps: 'EMISSARY', tier: 'LEADER' },
};

/** Corps order for the block, so it reads the way the Embassy is arranged. */
const CORPS_ORDER = [
  'RECRUITS', 'STAFF', 'SOLDIERS', 'OFFICERS', 'MEDICAL', 'SUPPLY CORPS',
  'BLACK TALON', 'AMBASSADORS', 'CANONREEVE', 'BATTLEREEVE', 'ADVISOR',
  'INQUISITOR', 'JUSTICIARS', 'HIGH JUSTICIAR', 'EMISSARY',
];

/** Status order as the Embassy reads them; anything else follows, by count. */
const STATUS_ORDER = ['ACTIVE', 'INACTIVE', 'ABSENT', 'LOA', 'JUST JOINED', 'ARRESTED'];

/** Wings in precedence order. */
const WING_ORDER = ['Command', 'Militant Wing', 'Diplomatic Wing', 'Administrative Wing'];

/** Shown where a member's cell is empty, so they are still counted. */
export const UNRECORDED = 'Unrecorded';

/**
 * Tally one column. Known values keep the given order and are listed even at
 * zero — an empty ARRESTED row is a fact worth printing. Anything unlisted
 * follows in descending count, so a new status appears rather than vanishing.
 */
function tally(values: string[], order: readonly string[]): Tally[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim() || UNRECORDED;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const out: Tally[] = order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
  const known = new Set(order.map((l) => l.toLowerCase()));

  const extra = [...counts.entries()]
    .filter(([label]) => !known.has(label.toLowerCase()))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));

  return [...out, ...extra];
}

/** Where a rank sits in the corps grid, or null if the table does not say. */
export const postingOf = (rank: string): Posting | null =>
  POSTINGS[rank.trim().toLowerCase()] ?? null;

/** Every rank on the roster that has no place in POSTINGS. */
export function unplacedRanks(members: readonly Member[]): string[] {
  const seen = new Set<string>();
  for (const m of members) {
    const rank = m.rank.trim();
    if (rank && !postingOf(rank)) seen.add(rank);
  }
  return [...seen].sort();
}

function corpsBlock(members: readonly Member[]): Statistics['corps'] {
  const grid = new Map<string, Record<string, number | null>>();
  const blank = (): Record<string, number | null> =>
    Object.fromEntries(TIERS.map((t) => [t, null]));

  // Rows whose rank the table does not place. Their tiers stay blank, which is
  // the honest rendering: they are counted, and where they belong is unknown.
  const unplaced = new Map<string, number>();

  for (const member of members) {
    const rank = member.rank.trim();
    const posting = rank ? postingOf(rank) : null;

    if (!posting) {
      const label = (rank || UNRECORDED).toUpperCase();
      unplaced.set(label, (unplaced.get(label) ?? 0) + 1);
      continue;
    }

    const row = grid.get(posting.corps) ?? blank();
    row[posting.tier] = (row[posting.tier] ?? 0) + 1;
    grid.set(posting.corps, row);
  }

  const ordered = [
    ...CORPS_ORDER.filter((c) => grid.has(c)),
    ...[...grid.keys()].filter((c) => !CORPS_ORDER.includes(c)).sort(),
  ];

  const rows: CorpsTally[] = ordered.map((label) => {
    const tiers = grid.get(label)!;
    const total = TIERS.reduce((sum, t) => sum + (tiers[t] ?? 0), 0);
    return { label, tiers, total };
  });

  for (const [label, count] of [...unplaced.entries()].sort((a, b) => b[1] - a[1])) {
    rows.push({ label, tiers: blank(), total: count });
  }

  return { tiers: [...TIERS], rows };
}

/**
 * The statistics of a roster, counted from its own rows.
 *
 * TOTAL MEMBERS is `members.length` and nothing else, which is the one figure
 * the sheet got wrong: it read 96 against its own status rows summing to 95.
 */
export function computeStatistics(members: readonly Member[]): Statistics {
  return {
    membership: [
      { label: 'TOTAL MEMBERS', count: members.length },
      ...tally(members.map((m) => m.status), STATUS_ORDER),
    ],
    corps: corpsBlock(members),
    races: tally(members.map((m) => m.race), []),
    wings: tally(members.map((m) => m.unit), WING_ORDER),
  };
}

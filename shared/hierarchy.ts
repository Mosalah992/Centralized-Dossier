// The Embassy's own shape: wing, then rank, then the people who hold it.
//
// Every fact here is already on the Roster — Unit is the wing, Rank is the rung,
// Name is the leaf — so the tree is derived and never authored. A promotion in
// the sheet moves someone on the site, and there is no second copy of the
// hierarchy to fall out of step with the register.
//
// WHAT IS NOT ON THE ROSTER is the order of the rungs. The sheet knows that
// Ancarion is a Canonreeve and that Lakkon is a First Emissary; it does not know
// which of them outranks the other. Neither does the corps table in
// statistics.ts — within Command, five ranks are all LEADER tier. So
// RANK_PRECEDENCE is a genuine addition rather than a derivation, and it is the
// only one in this file.
//
// NOTHING IS EVER DROPPED. A wing or a rank the ordering does not know sorts to
// the end rather than vanishing, and a blank cell becomes UNRECORDED. This is
// the same rule the corps block follows and it is there for the same reason: the
// last time a list of ranks was assumed complete, two of them — Admin Assistant
// and Steward — simply were not counted, and nothing said so.

import type { Member, Precedent, RankGroup, WingBranch } from './types';
import { UNRECORDED, WING_ORDER } from './statistics';

/**
 * Rank precedence, highest first. Not the alphabet, not the corps tier, and not
 * anything the spreadsheet can be asked — this is the Embassy's own order of
 * standing, and it is the one piece of knowledge this module adds.
 */
export const RANK_PRECEDENCE: readonly string[] = [
  // Command
  'First Emissary',
  'Inquisitor',
  'Battlereeve',
  'Justiciar',
  'High Justiciar',
  'Canonreeve',
  // Diplomatic
  'Advisor',
  'Grand Ambassador',
  'Ambassador',
  // Militant
  'Black Talon',
  'Junior Officer',
  'Elite Soldier',
  'Senior Soldier',
  'Junior Soldier',
  'Recruit',
  // Administrative
  'Quartermaster',
  'Lead Medical',
  'Medical Staff',
  'Supply Corps',
  'Embassy Staff',
  'Admin Assistant',
  'Steward',
  'Intern',
];

/** Position in an ordering, or Infinity for anything it does not name. */
const rankOf = (value: string, order: readonly string[]): number => {
  const at = order.findIndex((o) => o.toLowerCase() === value.toLowerCase());
  return at < 0 ? Infinity : at;
};

/**
 * Sort by a known ordering first, then alphabetically for whatever the ordering
 * does not cover — so an unfamiliar rank lands at the end of its wing in a
 * predictable place rather than wherever the roster happened to list it.
 */
const byOrderThenName = (order: readonly string[]) => (a: string, b: string) => {
  const ai = rankOf(a, order);
  const bi = rankOf(b, order);
  return ai === bi ? a.localeCompare(b) : ai - bi;
};

/**
 * The roster as a tree.
 *
 * Only what the tree draws comes out of here: a name, a race, a rank and a wing.
 * Discord handles, private notes, hours and last-active are deliberately absent
 * — this is the payload for a volume that has no business carrying them, and
 * leaving them behind is the point rather than an oversight.
 */
export function buildHierarchy(members: readonly Member[]): WingBranch[] {
  const wings = new Map<string, Map<string, Precedent[]>>();

  for (const member of members) {
    const wing = member.unit.trim() || UNRECORDED;
    const rank = member.rank.trim() || UNRECORDED;

    const ranks = wings.get(wing) ?? new Map<string, Precedent[]>();
    const people = ranks.get(rank) ?? [];
    people.push({ name: member.name.trim(), race: member.race.trim() });
    ranks.set(rank, people);
    wings.set(wing, ranks);
  }

  return [...wings.keys()]
    .sort(byOrderThenName(WING_ORDER))
    .map((wing) => {
      const ranks = wings.get(wing)!;
      const groups: RankGroup[] = [...ranks.keys()]
        .sort(byOrderThenName(RANK_PRECEDENCE))
        .map((rank) => ({
          rank,
          // Alphabetical within a rank: the roster's own row order carries no
          // meaning below this level, and pretending otherwise would invent a
          // seniority the sheet never recorded.
          members: ranks.get(rank)!.sort((a, b) => a.name.localeCompare(b.name)),
        }));

      return {
        wing,
        ranks: groups,
        total: groups.reduce((sum, g) => sum + g.members.length, 0),
      };
    });
}

/** Every rank on the roster that RANK_PRECEDENCE does not place. */
export function unrankedRanks(members: readonly Member[]): string[] {
  const known = new Set(RANK_PRECEDENCE.map((r) => r.toLowerCase()));
  const seen = new Set<string>();
  for (const m of members) {
    const rank = m.rank.trim();
    if (rank && !known.has(rank.toLowerCase())) seen.add(rank);
  }
  return [...seen].sort();
}

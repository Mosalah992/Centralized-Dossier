// Sifting the muster roll: which rows are shown, and in what order.
//
// Kept apart from the view for the same reason precedence-layout.ts is — it is
// pure, so it can be tested without a DOM, and the register itself is then only
// concerned with ink.
//
// This is also the answer to why the roster does not use a data grid. Sorting
// and filtering a hundred rows is the arithmetic below; what the reader needed
// was the controls to drive it. The table stays the hand-written one, which is
// what lets it go on folding into cards at 860px — see ledger.css. A grid would
// have brought its own DOM and taken that with it.

import type { Member } from '../../../shared/types';

/**
 * Ranks grouped into seniority tiers rather than coloured individually.
 *
 * The sheet carries 23 distinct ranks; 23 colours is a rainbow, and colouring
 * only the rare senior ones leaves the bulk of the roster undifferentiated
 * grey. Six tiers stay scannable and cover every rank.
 *
 * Matched by substring, longest-specific first, so a rank added to the sheet
 * lands in a sensible tier instead of falling out of the scheme.
 *
 * Order is meaning here, not just precedence of match: it is the order of
 * seniority, and sorting by Posting sorts by position in this list. That is why
 * a rank's tier is worth more than its spelling — alphabetical rank order puts
 * Recruit above Justiciar, which is not a roll anyone reads.
 */
export const RANK_TIERS: [RegExp, string][] = [
  [/emissary|high justiciar|canonreeve|battlereeve|inquisitor|advisor/i, 'command'],
  [/justiciar/i, 'justiciar'],
  [/ambassador/i, 'diplomatic'],
  [/talon/i, 'talon'],
  [/officer|quartermaster|lead medical|steward/i, 'officer'],
  [/soldier/i, 'soldier'],
  [/staff|supply|medical|assistant/i, 'support'],
  [/recruit|intern/i, 'entry'],
];

export const rankTier = (rank: string) =>
  RANK_TIERS.find(([pattern]) => pattern.test(rank))?.[1] ?? 'blank';

/** How a tier is named to the reader, since the token is a class name. */
export const TIER_LABELS: Record<string, string> = {
  command: 'Command',
  justiciar: 'Justiciars',
  diplomatic: 'Diplomatic',
  talon: 'Talons',
  officer: 'Officers',
  soldier: 'Soldiers',
  support: 'Support',
  entry: 'Recruits & interns',
  blank: 'Unranked',
};

/** Seniority as a number. Anything unmatched sits below everything matched. */
const tierRank = (rank: string) => {
  const tier = rankTier(rank);
  const at = RANK_TIERS.findIndex(([, name]) => name === tier);
  return at < 0 ? RANK_TIERS.length : at;
};

export type SortColumn = 'name' | 'posting' | 'status' | 'hours' | 'lastActive';
export type SortDirection = 'ascending' | 'descending';

export interface Sort {
  column: SortColumn;
  direction: SortDirection;
}

/**
 * What the reader has narrowed the roll to. An empty string means "everything"
 * on all four, so the resting state is the whole register and no control needs
 * a separate notion of being unset.
 */
export interface Sieve {
  query: string;
  unit: string;
  tier: string;
  status: string;
}

export const NO_SIEVE: Sieve = { query: '', unit: '', tier: '', status: '' };

export const isSifted = (sieve: Sieve) =>
  Boolean(sieve.query || sieve.unit || sieve.tier || sieve.status);

/** The units present on the roll, named as the sheet names them. */
export const unitsOf = (members: Member[]): string[] =>
  [...new Set(members.map((m) => m.unit).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

export const statusesOf = (members: Member[]): string[] =>
  [...new Set(members.map((m) => m.status).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

/** The tiers actually represented, in seniority order rather than alphabetically. */
export const tiersOf = (members: Member[]): string[] => {
  const present = new Set(members.map((m) => rankTier(m.rank)));
  const ordered = RANK_TIERS.map(([, tier]) => tier).filter((t) => present.has(t));
  return present.has('blank') ? [...ordered, 'blank'] : ordered;
};

/**
 * Which fields a typed term is matched against.
 *
 * Discord handles are deliberately not among them. They are on the Member and
 * the archive holds about a hundred of them, but this table does not print one
 * — and a search that silently matches something the reader cannot see returns
 * rows they have no way to explain.
 */
const haystack = (m: Member) =>
  `${m.name} ${m.race} ${m.rank} ${m.unit} ${m.notes}`.toLowerCase();

export function filterRoster(members: Member[], sieve: Sieve): Member[] {
  const term = sieve.query.trim().toLowerCase();

  return members.filter((m) => {
    if (sieve.unit && m.unit !== sieve.unit) return false;
    if (sieve.status && m.status !== sieve.status) return false;
    if (sieve.tier && rankTier(m.rank) !== sieve.tier) return false;
    if (term && !haystack(m).includes(term)) return false;
    return true;
  });
}

/**
 * Comparison for one column, always in ascending sense. Direction is applied by
 * the caller, so that the blanks rule below is not accidentally reversed with it.
 */
function compare(a: Member, b: Member, column: SortColumn): number {
  switch (column) {
    case 'hours':
      return a.hours - b.hours;
    // Held as `YYYY-MM-DD HH:mm`, which sorts chronologically as text.
    case 'lastActive':
      return a.lastActive.localeCompare(b.lastActive);
    case 'status':
      return a.status.localeCompare(b.status);
    // Posting is a rank and a unit in one cell, so it sorts the way the roll is
    // actually read: by seniority first, then by the rank's own name to keep
    // one tier's ranks together, then by unit.
    case 'posting':
      return (
        tierRank(a.rank) - tierRank(b.rank) ||
        a.rank.localeCompare(b.rank) ||
        a.unit.localeCompare(b.unit)
      );
    case 'name':
    default:
      return a.name.localeCompare(b.name);
  }
}

/** Whether this member has nothing recorded in the column being sorted on. */
function isBlank(m: Member, column: SortColumn): boolean {
  switch (column) {
    // Zero hours is a fact about the week, not a missing entry.
    case 'hours':
      return false;
    case 'lastActive':
      return !m.lastActive;
    case 'status':
      return !m.status;
    // A rank is what this column is ordered by, so a member without one is
    // blank here even when their wing is recorded. The cell still prints
    // "Unranked" beside that wing, but "Unranked" is a placeholder rather than
    // a posting, and letting the wing rescue it would float every unranked
    // member to the top of the roll the moment the column was reversed.
    case 'posting':
      return !m.rank;
    case 'name':
    default:
      return !m.name;
  }
}

/**
 * Sorted, stably, with blanks always last.
 *
 * Blanks sink regardless of direction. Reversing a column so that the fourteen
 * people with no recorded activity rise to the top buries the answer under the
 * absence of one, and it happens on the very first click of the very column a
 * reader is most likely to try.
 *
 * Stability is guaranteed by carrying the original index rather than trusting
 * the engine: the roll arrives from the sheet in the Embassy's own order, and
 * that order is what ties should fall back to.
 */
export function sortRoster(members: Member[], sort: Sort): Member[] {
  const way = sort.direction === 'ascending' ? 1 : -1;

  return members
    .map((member, at) => ({ member, at }))
    .sort((a, b) => {
      const blankA = isBlank(a.member, sort.column);
      const blankB = isBlank(b.member, sort.column);
      if (blankA !== blankB) return blankA ? 1 : -1;

      return way * compare(a.member, b.member, sort.column) || a.at - b.at;
    })
    .map(({ member }) => member);
}

/** Both passes, in the order the reader thinks of them: narrow, then order. */
export const siftRoster = (members: Member[], sieve: Sieve, sort: Sort | null): Member[] => {
  const kept = filterRoster(members, sieve);
  return sort ? sortRoster(kept, sort) : kept;
};

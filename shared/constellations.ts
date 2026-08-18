// The thirteen constellations, and the month each one governs.
//
// From *The Firmament* (Ffoulke), which is the in-world authority: "When the sun
// rises near one of the constellations, it is that constellation's season. Each
// constellation has a Season of approximately one month." Twelve signs take a
// month each; the Serpent takes none, "for it moves about in the heavens".
//
// The month-to-sign mapping is not a guess. The Firmament gives it sign by sign,
// and the Poetic Edda calendar the holidays came from prints the same mapping as
// a Birthsign column against its months. Two sources, independently, agree on
// all twelve — so this table is transcription, not reconstruction.
//
// THE STAR PATTERNS ARE DRAWN, NOT CHARTED. This is the one thing here that is
// invented, and it should not be mistaken for lore. The games show these
// constellations as painted icons and skill-tree art, never as coordinates, and
// there is no published star chart to copy. So each asterism below is composed
// to read as its sign at a glance — the Tower a keep, the Steed a horse at the
// gallop — in a 100x100 field. They sit in the margin of a calendar at the
// weight of a watermark, faint enough that no reader takes them for a record.
//
// Replacing them with real coordinates, if a chart is ever found, means editing
// `stars` and `lines` and nothing else.

/** A sign's guardian, or 'Serpent' for the one that guards nothing. */
export type Guardian = 'Warrior' | 'Mage' | 'Thief' | 'Serpent';

export interface Constellation {
  name: string;
  /** 1-based Tamrielic month the sign's season falls in; 0 for the Serpent. */
  monthIndex: number;
  /** Which Guardian holds it. A Guardian is its own. */
  guardian: Guardian;
  /** True for the three Guardians themselves. */
  isGuardian: boolean;
  /** The Firmament on those born under it. */
  born: string;
  /** Star positions in a 100x100 field, top-left origin. */
  stars: readonly (readonly [number, number])[];
  /** Indices into `stars`, joined pairwise into the asterism's lines. */
  lines: readonly (readonly [number, number])[];
}

/**
 * The twelve seasonal signs in calendar order, then the Serpent.
 *
 * Kept in one list rather than split by guardian: every consumer wants it by
 * month, and the guardian is a field away when it is wanted.
 */
export const CONSTELLATIONS: readonly Constellation[] = [
  {
    name: 'The Ritual',
    monthIndex: 1, // Morning Star
    guardian: 'Mage',
    isGuardian: false,
    born: 'Those born under this sign have a variety of abilities, depending on the aspects of the moons and the Divines.',
    // A closed ring about a single bright star: the circle a rite is worked in.
    stars: [[50, 50], [50, 20], [74, 32], [80, 58], [62, 79], [36, 78], [20, 56], [26, 29]],
    lines: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1]],
  },
  {
    name: 'The Lover',
    monthIndex: 2, // Sun's Dawn
    guardian: 'Thief',
    isGuardian: false,
    born: 'Those born under the sign of the Lover are graceful and passionate.',
    // Two strands leaning together and meeting at the crown.
    stars: [[26, 82], [22, 58], [29, 37], [42, 23], [58, 23], [71, 37], [78, 58], [74, 82]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
  {
    name: 'The Lord',
    monthIndex: 3, // First Seed
    guardian: 'Warrior',
    isGuardian: false,
    born: 'Those born under the sign of the Lord are stronger and healthier than those born under other signs.',
    // A broad standing figure, arms open over the planting.
    stars: [[50, 16], [31, 32], [69, 32], [50, 43], [20, 51], [80, 51], [50, 63], [35, 85], [65, 85]],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 6], [6, 7], [6, 8]],
  },
  {
    name: 'The Mage',
    monthIndex: 4, // Rain's Hand
    guardian: 'Mage',
    isGuardian: true,
    born: 'Those born under the Mage have more magicka and talent for all kinds of spellcasting, but are often arrogant and absent-minded.',
    // A robed figure holding a staff that overtops it. The robe is a closed
    // hem rather than legs, and the staff is one unbroken line from above the
    // head to the ground — the first cut drew the staff in segments with the
    // arm crossing them, and it came out a ladder.
    stars: [[38, 20], [38, 36], [54, 46], [70, 13], [68, 46], [65, 85], [26, 85], [50, 85]],
    lines: [[0, 1], [1, 2], [2, 4], [3, 4], [4, 5], [1, 6], [1, 7], [6, 7]],
  },
  {
    name: 'The Shadow',
    monthIndex: 5, // Second Seed
    guardian: 'Thief',
    isGuardian: false,
    born: 'The Shadow grants those born under her sign the ability to hide in shadows.',
    // A hooded form whose outline does not close — the sign will not be pinned
    // down, and a broken figure says that better than a complete one. The gap
    // is the last link, between the hem and the shoulder it would return to;
    // every star is still joined to the chain, so none of them reads as a
    // stray speck.
    stars: [[29, 73], [33, 51], [46, 36], [63, 32], [76, 45], [71, 66], [55, 79]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  {
    name: 'The Steed',
    monthIndex: 6, // Mid Year
    guardian: 'Warrior',
    isGuardian: false,
    born: 'Those born under the sign of the Steed are impatient, always hurrying from one place to another.',
    // A horse facing left: muzzle low, poll up, then a long level back to the
    // croup and a streaming tail. The back has to be the longest and flattest
    // line in the figure — without it the head and legs read as scatter, which
    // is how the first cut came out.
    // The croup sits far back so the tail leaves it at a steep angle: with the
    // two closer together the tail carried on the line of the back and the
    // whole hindquarter read as one long diagonal.
    stars: [
      [9, 40], [21, 25], [35, 31], [50, 41], [76, 37], [92, 19],
      [50, 62], [46, 85], [76, 61], [81, 85],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 7], [4, 8], [8, 9]],
  },
  {
    name: 'The Apprentice',
    monthIndex: 7, // Sun's Height
    guardian: 'Mage',
    isGuardian: false,
    born: 'Those born under the sign of the Apprentice have a special affinity for magic of all kinds, but are more vulnerable to magic as well.',
    // A smaller figure than the Mage, one hand raised and nothing in it.
    stars: [[50, 24], [37, 39], [63, 39], [74, 18], [26, 56], [50, 58], [39, 82], [61, 82]],
    lines: [[0, 1], [0, 2], [2, 3], [1, 4], [1, 5], [2, 5], [5, 6], [5, 7]],
  },
  {
    name: 'The Warrior',
    monthIndex: 8, // Last Seed
    guardian: 'Warrior',
    isGuardian: true,
    born: 'Those born under the sign of the Warrior are skilled with weapons of all kinds, but prone to short tempers.',
    // Blade raised: the longest line in the set, and the one the eye finds first.
    stars: [[41, 29], [29, 42], [56, 42], [69, 31], [86, 9], [19, 57], [41, 61], [31, 84], [54, 84]],
    lines: [[0, 1], [0, 2], [2, 3], [3, 4], [1, 5], [1, 6], [2, 6], [6, 7], [6, 8]],
  },
  {
    name: 'The Lady',
    monthIndex: 9, // Heartfire
    guardian: 'Warrior',
    isGuardian: false,
    born: 'Those born under the sign of the Lady are kind and tolerant.',
    // A standing figure whose hem closes at the foot, so the shape reads as a
    // gown rather than as legs.
    stars: [[50, 18], [39, 31], [61, 31], [26, 46], [74, 46], [50, 48], [31, 82], [69, 82]],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6], [5, 7], [6, 7]],
  },
  {
    name: 'The Tower',
    monthIndex: 10, // Frostfall
    guardian: 'Thief',
    isGuardian: false,
    born: 'Those born under the sign of the Tower have a knack for finding gold, and can open locks of all kinds.',
    // A keep: a narrow shaft, a parapet corbelled out wider than the wall, and
    // a crenellated crown. Narrow and tall on purpose — at the first cut's
    // proportions the walls were barely longer than the battlement was wide,
    // and the whole thing read as a box.
    stars: [[40, 90], [60, 90], [40, 50], [60, 50], [29, 40], [71, 40], [29, 25], [50, 32], [71, 25]],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [4, 6], [5, 8], [6, 7], [7, 8]],
  },
  {
    name: 'The Atronach',
    monthIndex: 11, // Sun's Dusk
    guardian: 'Mage',
    isGuardian: false,
    born: 'Those born under this sign are natural sorcerers with deep reserves of magicka, but they cannot generate magicka of their own.',
    // Blocky and squat: a barred torso on stumps, fists held out from it. Drawn
    // as a box rather than tapering to a closed base, because the first cut did
    // taper and came out a near-twin of the Lady two months earlier — the two
    // sit close enough on the page to be compared.
    stars: [[50, 26], [30, 42], [70, 42], [34, 66], [66, 66], [16, 60], [84, 60], [34, 87], [66, 87]],
    lines: [
      [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4],
      [1, 5], [2, 6], [3, 7], [4, 8],
    ],
  },
  {
    name: 'The Thief',
    monthIndex: 12, // Evening Star
    guardian: 'Thief',
    isGuardian: true,
    born: 'Those born under the sign of the Thief take risks more often and only rarely come to harm — though they run out of luck eventually, and rarely live as long as those born under other signs.',
    // Crouched, one arm at full reach. The lowest-set figure of the twelve.
    stars: [[35, 31], [53, 43], [76, 38], [29, 51], [41, 67], [59, 76], [28, 85]],
    lines: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [4, 6]],
  },
  {
    name: 'The Serpent',
    // No month. The Firmament: "The Serpent wanders about in the sky and has no
    // Season." Zero rather than a sentinel because every lookup here is by month
    // index, and no month is ever 0.
    monthIndex: 0,
    guardian: 'Serpent',
    isGuardian: false,
    born: 'No characteristics are common to all who are born under the sign of the Serpent. Those born under this sign are the most blessed and the most cursed.',
    // A coil crossing itself, anchored to no corner of the field.
    stars: [[16, 66], [30, 76], [48, 70], [58, 52], [50, 34], [34, 30], [24, 40], [70, 26], [86, 22]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [7, 8]],
  },
] as const;

/** The sign whose season is a given Tamrielic month, or null outside 1..12. */
export function constellationOf(monthIndex: number): Constellation | null {
  if (monthIndex < 1 || monthIndex > 12) return null;
  return CONSTELLATIONS.find((c) => c.monthIndex === monthIndex) ?? null;
}

/** The Serpent, wanted separately by every consumer because it has no month. */
export const SERPENT: Constellation = CONSTELLATIONS.find((c) => c.guardian === 'Serpent')!;

/**
 * How a sign stands in one line — "Guardian of the Mage" for the three that
 * guard, "Charge of the Warrior" for the nine that are guarded.
 */
export function standing(sign: Constellation): string {
  if (sign.guardian === 'Serpent') return 'Of no season, and no guardian';
  const bare = sign.name.replace(/^The /, '');
  return sign.isGuardian ? `Guardian of the ${bare}` : `Charge of the ${sign.guardian}`;
}

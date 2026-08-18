// The realm's own holidays, overlaid onto the sheet's year.
//
// These are not the Embassy's observances — see shared/observances.ts for those,
// which are days this office keeps and which it would write into the sheet if it
// held a token that could write. These are the calendar of Tamriel itself: feast
// days, the old provincial festivals, and the summoning days on which the
// Daedric princes are called. The Embassy records them because a Justiciar
// wanting to know when unlawful observance is likely wants exactly this list.
//
// SOURCE. Transcribed from the Poetic Edda calendar the community keeps
// (tes-sandbox.fandom.com, "Calendar (Poetic Edda)", Holidays). Wording is
// tightened to the register's voice but no date is moved and nothing is
// invented — a holiday not in that list is not in this one.
//
// THE ATMORAN FEASTS ARE DELIBERATELY ABSENT. The source marks eight holidays as
// Atmoran — the Feast of New Beginnings, Kyne's Blessing, the Day of Fertility,
// Midsummer's Eve, Kyne's Feast, the Autumn Feast, Winternights and Winter's
// Peak — and they are omitted by instruction, not by oversight. Two of them
// shared a day with a summoning: First Seed 21 and Evening Star 20 keep the
// summoning and lose the feast, which is why those two days are here at all.
//
// One judgement call worth recording: the Feast of the Dead (Sun's Dawn 13)
// recites the Five Hundred Companions and is Nordic to its bones, but the source
// does not label it Atmoran the way it labels the eight above. It is kept, on
// the rule that the source's own labelling decides — delete this entry if the
// intent was every Nord feast rather than every Atmoran-labelled one.

import type { Observance } from './observances';

export const TAMRIELIC_HOLIDAYS: readonly Observance[] = [
  // ── Morning Star ────────────────────────────────────────────────────────
  {
    monthIndex: 1,
    day: 1,
    name: 'New Life Day',
    // Two entries share this date in the source. Folded into one line because a
    // day cell carries a single note, and the first of the year should read as
    // the festival rather than as the summoning.
    note: 'Every race keeps the first day of the year after its own fashion. It is also the summoning day of Clavicus Vile.',
  },
  {
    monthIndex: 1,
    day: 13,
    name: 'Summoning Day of Meridia',
    note: 'Watch for unlawful observance.',
  },
  {
    monthIndex: 1,
    day: 16,
    name: 'Festival of Lights',
    note: 'Kept in the Skyrim city of Daganstjarna, where little candies are given out.',
  },
  {
    monthIndex: 1,
    day: 18,
    name: 'Waking Day',
    note: 'A Nedic tradition of southern High Rock. The spirits of nature are woken after a long, cold winter.',
  },

  // ── Sun's Dawn ──────────────────────────────────────────────────────────
  {
    monthIndex: 2,
    day: 2,
    name: 'Summoning Day of Sheogorath',
    note: 'Watch for unlawful observance.',
  },
  {
    monthIndex: 2,
    day: 13,
    name: 'Feast of the Dead',
    note: 'Kept in the Skyrim city of Vindhjalmr. The names of the Five Hundred Companions of Ysgramor are recited to honour their deeds in the Return.',
  },
  {
    monthIndex: 2,
    day: 16,
    name: 'Summoning Day of Sanguine',
    note: 'Watch for unlawful observance.',
  },

  // ── First Seed ──────────────────────────────────────────────────────────
  {
    monthIndex: 3,
    day: 5,
    name: 'Summoning Day of Hermaeus Mora',
    note: 'Watch for unlawful observance.',
  },
  {
    monthIndex: 3,
    day: 9,
    name: 'Day of Waiting',
    note: 'A very old holy day among the human settlements of the Dragontail Mountains, kept since the Merethic Era, when a dragon came out of the desert to devour the wicked and all shut themselves within.',
  },
  {
    monthIndex: 3,
    day: 21,
    name: 'Summoning Day of Azura',
    note: 'Watch for unlawful observance.',
  },

  // ── Rain's Hand ─────────────────────────────────────────────────────────
  {
    monthIndex: 4,
    day: 1,
    name: 'Gardtide',
    note: 'A Nedic festival honouring Druagaa, the old goddess of flowers. To the Reachmen it is the most holy day of the year.',
  },
  {
    monthIndex: 4,
    day: 9,
    name: 'Summoning Day of Peryite',
    note: 'Watch for unlawful observance.',
  },

  // ── Second Seed ─────────────────────────────────────────────────────────
  {
    monthIndex: 5,
    day: 9,
    name: 'Summoning Day of Namira',
    note: 'Watch for unlawful observance.',
  },

  // ── Mid Year ────────────────────────────────────────────────────────────
  {
    monthIndex: 6,
    day: 5,
    name: 'Summoning Day of Hircine',
    note: 'Watch for unlawful observance.',
  },

  // ── Sun's Height ────────────────────────────────────────────────────────
  {
    monthIndex: 7,
    day: 10,
    name: 'Summoning Day of Vaermina',
    note: 'Watch for unlawful observance.',
  },

  // Last Seed carries no holiday here: its only entry, Kyne's Feast, is one of
  // the eight Atmoran feasts left out.

  // ── Heartfire ───────────────────────────────────────────────────────────
  {
    monthIndex: 9,
    day: 8,
    name: 'Summoning Day of Nocturnal',
    note: 'Watch for unlawful observance.',
  },

  // ── Frostfall ───────────────────────────────────────────────────────────
  {
    monthIndex: 10,
    day: 8,
    name: 'Summoning Day of Malacath',
    note: 'Watch for unlawful observance.',
  },
  {
    monthIndex: 10,
    day: 13,
    name: 'Summoning Day of Mephala',
    // The sheet already writes the Witches' Festival here. When it does, that
    // note stands and this one is never laid down — which is correct: the sheet
    // is the authority, and the two are the same night seen from two sides.
    note: 'Watch for unlawful observance.',
  },

  // ── Sun's Dusk ──────────────────────────────────────────────────────────
  {
    monthIndex: 11,
    day: 2,
    name: 'Summoning Day of Boethiah',
    note: 'Watch for unlawful observance.',
  },
  {
    monthIndex: 11,
    day: 20,
    name: 'Summoning Day of Mehrunes Dagon',
    note: 'Watch for unlawful observance.',
  },

  // ── Evening Star ────────────────────────────────────────────────────────
  {
    monthIndex: 12,
    day: 20,
    name: 'Summoning Day of Molag Bal',
    note: 'Watch for unlawful observance.',
  },
] as const;

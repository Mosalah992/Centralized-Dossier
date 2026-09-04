/**
 * Which row of the flag sprite belongs to a country.
 *
 * `scripts/prepare-flags.mjs` writes the strip and, beside it, one concatenated
 * run of the alpha-2 codes it drew, in the order it drew them. A country's row
 * is simply its position in that run, so nothing is stored that the ordering
 * does not already imply — a `{code: row}` map cost 2.4 kB gzip of the entry
 * chunk, which invariant 7 and test/bundle.test.ts exist to defend, for an index
 * that can be derived in three lines.
 *
 * This lives outside the component so it can be tested. It is the whole reason
 * `test/flags.test.ts` exists: the derivation has one trap in it, and the trap
 * is real rather than theoretical.
 */

import flagCodes from './assets/flags/flags.json';

const STRIP = flagCodes as string;

/**
 * The row for `code`, or null when the supplied set has no such flag — in which
 * case the register shows the province's name alone, which is the graceful case
 * rather than a gap.
 *
 * IT SEARCHES FOR AN EVEN OFFSET RATHER THAN TESTING THE FIRST MATCH. Two codes
 * can spell a third across their boundary: BG followed by BH spells "GB" at
 * offset 43, so `indexOf` finds Britain inside Bulgaria before it finds Britain.
 * A lookup that rejected that first odd hit instead of looking past it left the
 * United Kingdom as the one row on the register with no flag.
 */
export function flagRow(code: string): number | null {
  // Anything that is not a two-letter code cannot be a row, and the empty string
  // in particular would otherwise claim row 0: `''.indexOf` is 0, so a blank
  // country would fly Andorra's flag.
  if (code.length !== 2) return null;

  for (let at = STRIP.indexOf(code); at >= 0; at = STRIP.indexOf(code, at + 1)) {
    if (at % 2 === 0) return at / 2;
  }
  return null;
}

/** Every code the sprite carries. Exported for the test, which walks all of them. */
export function flagCodeList(): string[] {
  return STRIP.match(/.{2}/g) ?? [];
}

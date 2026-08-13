// Hall of Honor — the simplest volume. `B Name | C Citation`, free text, no
// dates. Honorifics are part of the name as written ("First Emissary Indumoril
// Lourinien") and are left intact.

import type { Grid, HonorEntry } from '../types';
import { at, isOrnament } from '../text';

const COL = { NAME: 1, CITATION: 2 } as const;

export function parseHonor(grid: Grid): HonorEntry[] {
  const entries: HonorEntry[] = [];

  for (let r = 0; r < grid.length; r++) {
    const name = at(grid, r, COL.NAME);
    // Skips the ❖ title row, the Dominion footer and the padding rows beneath.
    if (!name || isOrnament(name)) continue;

    entries.push({
      row: r + 1,
      name,
      citation: at(grid, r, COL.CITATION),
    });
  }

  return entries;
}

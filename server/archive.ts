// Loads one volume: resolve its tab by title, read the range, parse it.
//
// Tabs are resolved from the live tab list on every cache miss rather than from
// stored gids, because gids here are not stable — "Calendar" was replaced
// wholesale in July and the calendar's title carries the in-world year.

import type { Env } from './gsheets';
import { getAccessToken, listTabTitles, readFormattedGrid, readValues } from './gsheets';

import type { FormattedGrid, Grid, VolumeDefinition, VolumeEnvelope } from '../shared/types';
import { resolveTabTitle } from '../shared/volumes';
import { parseRoster, summarize } from '../shared/parsers/roster';
import { computeStatistics } from '../shared/statistics';
import { buildHierarchy } from '../shared/hierarchy';
import { parseLedger } from '../shared/parsers/ledger';
import { parseStipends } from '../shared/parsers/stipends';
import { parseHonor } from '../shared/parsers/honor';
import { parseCalendar } from '../shared/parsers/calendar';

/** Raised when the volume's tab is not in the spreadsheet any more. */
export class TabMissingError extends Error {
  constructor(public readonly slug: string) {
    super(`No tab in the spreadsheet matches the ${slug} volume`);
    this.name = 'TabMissingError';
  }
}

/**
 * Dispatch to the volume's parser. The cast in each branch is safe because the
 * caller picks the fetch by `needsGridData`, and the registry sets that flag on
 * exactly the calendar — the one volume parsed from a FormattedGrid.
 */
function parseFor(volume: VolumeDefinition, grid: Grid | FormattedGrid): unknown {
  switch (volume.slug) {
    case 'roster': {
      const members = parseRoster(grid as Grid);
      return { members, ...summarize(members) };
    }
    // Order of Precedence. Counted off the Roster, not the Stats tab — that tab
    // keeps its tallies by hand and had drifted from the register.
    //
    // Only the summary figures and the tree cross the wire. The full statistics
    // are still computed and the rest of them thrown away, which looks wasteful
    // and is not: the corps grid and race table were the only reason this
    // volume ever carried a member's handle or private note, and the cheapest
    // way to stop shipping those is to stop putting them in the payload.
    case 'statistics': {
      const members = parseRoster(grid as Grid);
      return {
        membership: computeStatistics(members).membership,
        hierarchy: buildHierarchy(members),
      };
    }
    case 'ledger': return parseLedger(grid as Grid);
    case 'stipends': return parseStipends(grid as Grid);
    case 'honor': return parseHonor(grid as Grid);
    case 'calendar': return parseCalendar(grid as FormattedGrid);
  }
}

export async function loadVolume(
  env: Env,
  volume: VolumeDefinition,
): Promise<VolumeEnvelope<unknown>> {
  const token = await getAccessToken(env);

  const titles = await listTabTitles(token, env.SHEET_ID);
  const tab = resolveTabTitle(volume, titles);
  if (!tab) throw new TabMissingError(volume.slug);

  const range = `'${tab}'!${volume.range}`;
  const grid = volume.needsGridData
    ? await readFormattedGrid(token, env.SHEET_ID, range)
    : await readValues(token, env.SHEET_ID, range);

  return {
    slug: volume.slug,
    title: volume.title,
    tab,
    fetchedAtUtc: new Date().toISOString(),
    data: parseFor(volume, grid),
  };
}

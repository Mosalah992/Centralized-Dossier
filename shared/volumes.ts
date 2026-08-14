// The six published volumes. This registry is the single source of truth for
// the shelf: the Worker resolves tabs from it, the web app renders books from
// it. `Index` and `Draft` are internal to the sheet and never published.
//
// Tabs are matched by TITLE, not gid. Between 2026-07-25 and 2026-08-13 the
// sheet dropped "To be paid" and replaced "Calendar" (gid 1078737758) with
// "Tamrielic Calendar 4E 226" (gid 1849230396) — gids here would already be
// stale, and the calendar's title carries the in-world year, so it will move
// again at the turn of 4E 227.

import type { KeptVolume, VolumeDefinition, VolumeSlug } from './types';

export const VOLUMES: readonly VolumeDefinition[] = [
  {
    slug: 'roster',
    title: 'Troops Roster',
    category: 'Personnel',
    tab: { exact: 'Roster' },
    range: 'A1:K250',
    needsGridData: false,
  },
  {
    slug: 'statistics',
    title: 'Roster Statistics',
    category: 'Personnel',
    tab: { exact: 'Stats' },
    range: 'A1:O30',
    needsGridData: false,
  },
  {
    slug: 'ledger',
    title: 'Financial Ledger',
    category: 'Finance',
    tab: { exact: 'Ledger' },
    range: 'A1:N40',
    needsGridData: false,
  },
  {
    slug: 'stipends',
    title: 'Stipends Registry',
    category: 'Finance',
    tab: { exact: 'Stipends' },
    range: 'A1:G40',
    needsGridData: false,
  },
  {
    slug: 'honor',
    title: 'Hall of Honor',
    category: 'Honors & Calendar',
    tab: { exact: 'Hall of Honor' },
    range: 'A1:C40',
    needsGridData: false,
  },
  {
    slug: 'calendar',
    title: 'Tamrielic Calendar',
    category: 'Honors & Calendar',
    tab: { prefix: 'Tamrielic Calendar' },
    range: 'A1:AF40',
    // Day meaning is cell background + note; values alone are bare numbers.
    needsGridData: true,
  },
] as const;

/**
 * Volumes the Embassy keeps itself. Not in `VOLUMES`, and deliberately so —
 * see KeptVolume. The Worker never sees these, asks the sheet nothing about
 * them, and they cannot be withdrawn by a tab being renamed.
 */
export const KEPT: readonly KeptVolume[] = [
  {
    slug: 'history',
    title: 'History of the Realm',
    category: 'Chronicles',
  },
] as const;

export const VOLUME_SLUGS: readonly VolumeSlug[] = VOLUMES.map((v) => v.slug);
export const KEPT_SLUGS: readonly VolumeSlug[] = KEPT.map((v) => v.slug);

/** Every slug the archive will open, whether the sheet backs it or not. */
export const ALL_SLUGS: readonly VolumeSlug[] = [...VOLUME_SLUGS, ...KEPT_SLUGS];

export const isKept = (slug: string): boolean =>
  (KEPT_SLUGS as readonly string[]).includes(slug);

export function getVolume(slug: string): VolumeDefinition | undefined {
  return VOLUMES.find((v) => v.slug === slug);
}

/** Title for any volume on the shelf, sheet-backed or kept. */
export function getTitle(slug: string): string | undefined {
  return (VOLUMES.find((v) => v.slug === slug) ?? KEPT.find((v) => v.slug === slug))?.title;
}

/**
 * Pick the live tab title for a volume from the spreadsheet's tab list.
 * Exact matches win; prefix matches take the last one alphabetically so a new
 * year's calendar ("… 4E 227") supersedes the old without a code change.
 */
export function resolveTabTitle(
  volume: VolumeDefinition,
  tabTitles: readonly string[],
): string | null {
  if ('exact' in volume.tab) {
    const wanted = volume.tab.exact.toLowerCase();
    return tabTitles.find((t) => t.trim().toLowerCase() === wanted) ?? null;
  }
  const prefix = volume.tab.prefix.toLowerCase();
  const matches = tabTitles
    .filter((t) => t.trim().toLowerCase().startsWith(prefix))
    .sort();
  return matches.length ? matches[matches.length - 1]! : null;
}

/**
 * Volumes grouped for the shelf, in display order. Chronicles come last and
 * carry both kinds, so a kept volume stands on the same shelf as the registers
 * rather than in some separate annex.
 */
export const SHELF: readonly {
  category: string;
  volumes: (VolumeDefinition | KeptVolume)[];
}[] = [
  'Personnel',
  'Finance',
  'Honors & Calendar',
  'Chronicles',
].map((category) => ({
  category,
  volumes: [
    ...VOLUMES.filter((v) => v.category === category),
    ...KEPT.filter((v) => v.category === category),
  ],
}));

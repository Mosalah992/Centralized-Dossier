import { SHELF } from '../../shared/volumes';
import type { VolumeSlug } from '../../shared/types';
import { hrefFor, type Route } from './router';

export interface ArchiveNavigationItem {
  href: string;
  label: string;
  group: string;
  mark: string;
  slug?: VolumeSlug;
}

const MARKS: Record<VolumeSlug, string> = {
  roster: 'R',
  statistics: '§',
  ledger: 'L',
  stipends: 'S',
  honor: 'H',
  calendar: 'C',
  history: '✧',
  enforcement: '⚖',
  informants: 'I',
};

// The hall has no entry of its own: the insignia at the head of the rail
// already leads home.
export const ARCHIVE_NAVIGATION: readonly ArchiveNavigationItem[] = [
  ...SHELF.flatMap((section) => section.volumes.map((volume) => ({
    href: hrefFor(volume.slug),
    label: volume.title,
    group: section.category,
    mark: MARKS[volume.slug],
    slug: volume.slug,
  }))),
  { href: '/reports', label: 'High Command Reports', group: 'High Command', mark: '✦' },
];

export function navigationItemIsActive(route: Route, item: ArchiveNavigationItem): boolean {
  if (item.href === '/reports') return route.name === 'reports';
  return route.name === 'volume' && route.slug === item.slug;
}

export function filterArchiveNavigation(
  query: string,
  items: readonly ArchiveNavigationItem[] = ARCHIVE_NAVIGATION,
): readonly ArchiveNavigationItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    `${item.label} ${item.group}`.toLocaleLowerCase().includes(needle));
}

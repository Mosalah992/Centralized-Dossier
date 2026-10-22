// The Cabinet's four drawers, and which letters go in each: by how long ago the
// report came. Pure, so the boundaries are tested without a clock.
//
//   Fresh!   under a day old
//   New      a day to a week
//   Old      a week to thirty days
//   Archive  older than thirty days

export const DRAWERS = ['fresh', 'new', 'old', 'archive'] as const;
export type Drawer = (typeof DRAWERS)[number];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const DRAWER_INFO: Record<Drawer, { label: string; describer: string; newer: number; older: number }> = {
  // `newer` and `older` are ages in milliseconds: a letter belongs to the
  // drawer when newer <= age < older.
  fresh: { label: 'Fresh!', describer: 'Come within the day.', newer: 0, older: DAY },
  new: { label: 'New', describer: 'Come this past week.', newer: DAY, older: 7 * DAY },
  old: { label: 'Old', describer: 'Come within the month.', newer: 7 * DAY, older: 30 * DAY },
  archive: { label: 'Archive', describer: 'Older than a month.', newer: 30 * DAY, older: Number.POSITIVE_INFINITY },
};

export const isDrawer = (s: string): s is Drawer => (DRAWERS as readonly string[]).includes(s);

/** The drawer a report filed at `timestamp` sits in, as of `now`. */
export function drawerOf(timestamp: string, now: number): Drawer {
  const age = Math.max(0, now - Date.parse(timestamp));
  return DRAWERS.find((d) => age < DRAWER_INFO[d].older) ?? 'archive';
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The register's date range that covers a drawer. The register filters by
 * whole days (UTC, `to` inclusive), so the range is a day wider than the
 * drawer at each end it has; `drawerOf` then keeps exactly the drawer's own.
 */
export function drawerRange(drawer: Drawer, now: number): { from: string | null; to: string | null } {
  const { newer, older } = DRAWER_INFO[drawer];
  return {
    from: Number.isFinite(older) ? day(now - older - DAY) : null,
    to: newer > 0 ? day(now - newer + DAY) : null,
  };
}

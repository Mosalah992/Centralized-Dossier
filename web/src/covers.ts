// The painted covers, cut from the art sheet by scripts/prepare-volumes.mjs.
// Their titles are painted in and match the volume names in shared/volumes.ts.
//
// Imported one by one rather than through import.meta.glob so that a missing or
// renamed cover is a build error naming the volume, not a blank space on the
// shelf that nobody notices until it is live.

import type { VolumeSlug } from '../../shared/types';

import roster from './assets/volumes/roster.webp';
import statistics from './assets/volumes/statistics.webp';
import ledger from './assets/volumes/ledger.webp';
import stipends from './assets/volumes/stipends.webp';
import honor from './assets/volumes/honor.webp';
import calendar from './assets/volumes/calendar.webp';
import history from './assets/volumes/history.webp';
import informants from './assets/volumes/informants.webp';
import enforcement from './assets/volumes/enforcement.webp';

export const COVERS: Record<VolumeSlug, string> = {
  roster,
  statistics,
  ledger,
  stipends,
  honor,
  calendar,
  history,
  informants,
  enforcement,
};

/**
 * Intrinsic size of every cover, so the shelf reserves its space up front.
 *
 * Derived by scripts/prepare-volumes.mjs and printed by it — the canvas is
 * sized to the widest book and the tallest art, so it moves when a cover is
 * added or a scale changes. If these two numbers stop matching what that script
 * reports, the shelf reserves the wrong box and every cover is letterboxed
 * inside it.
 */
export const COVER_W = 271;
export const COVER_H = 404;

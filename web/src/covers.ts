// The painted covers, cut from the art sheet by scripts/prepare-volumes.mjs.
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

export const COVERS: Record<VolumeSlug, string> = {
  roster,
  statistics,
  ledger,
  stipends,
  honor,
  calendar,
  history,
};

/** Intrinsic size of every cover, so the shelf reserves its space up front. */
export const COVER_W = 400;
export const COVER_H = 512;

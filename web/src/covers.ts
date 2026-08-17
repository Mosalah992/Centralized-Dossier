// The painted covers, cut from the art sheet by scripts/prepare-volumes.mjs.
//
// Imported one by one rather than through import.meta.glob so that a missing or
// renamed cover is a build error naming the volume, not a blank space on the
// shelf that nobody notices until it is live.

import type { VolumeSlug } from '../../shared/types';

import labels from './assets/volumes/labels.json';
import roster from './assets/volumes/roster.webp';
import statistics from './assets/volumes/statistics.webp';
import ledger from './assets/volumes/ledger.webp';
import stipends from './assets/volumes/stipends.webp';
import honor from './assets/volumes/honor.webp';
import calendar from './assets/volumes/calendar.webp';
import history from './assets/volumes/history.webp';
import informants from './assets/volumes/informants.webp';

export const COVERS: Record<VolumeSlug, string> = {
  roster,
  statistics,
  ledger,
  stipends,
  honor,
  calendar,
  history,
  informants,
};

/** Intrinsic size of every cover, so the shelf reserves its space up front. */
export const COVER_W = 400;
export const COVER_H = 532;

/**
 * Where each cover's lettering panel is, as fractions of the cover.
 *
 * The titles used to be painted into the art and are now set live over it, so
 * the shelf has to know where the cleared panel sits — and it sits somewhere
 * different on almost every volume, because the painted block did. Rather than
 * measure the same eight rectangles twice, once against the art and once by
 * hand in the stylesheet, scripts/prepare-volumes.mjs writes them out beside
 * the covers it cut them from. Editing them here would only be overwritten:
 * the LABEL table in that script is where they are set.
 */
export interface LabelPanel {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const LABELS: Record<VolumeSlug, LabelPanel> = labels;

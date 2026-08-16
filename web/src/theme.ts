// Per-volume binding colours, read off the cover art in
// `Assets/Book volumes UI assets.png` by scripts/prepare-volumes.mjs.
//
// These no longer draw the book — the shelf shows the painted covers — so they
// exist for one job: to carry a volume's identity through to the page you land
// on when you open it. Hence `cover` is picked as the leather's lit mid-tone
// rather than its median, which the heavy vignette drags almost to black.
//
// `cover` must stay DARK. ledger.css lays light foil text over it, so a light
// value here is unreadable rather than merely off-palette. That is why Hall of
// Honor, whose cover is ivory, takes the bronze of its own clasps and spine
// bands instead — the darkest colour the art actually gives that volume.

import type { VolumeSlug } from '../../shared/types';

export interface Binding {
  cover: string;
  cover2: string;
  foil: string;
  subtitle: string;
}

// One gold leaf is used across all six covers, so this is shared rather than
// varied per volume — the art is what it is. Identity lives in `cover`.
const FOIL = '#c5a169';

export const BINDINGS: Record<VolumeSlug, Binding> = {
  roster:     { cover: '#121a2e', cover2: '#091626', foil: FOIL, subtitle: 'Military Personnel Register' },
  statistics: { cover: '#122010', cover2: '#091a07', foil: FOIL, subtitle: 'Strength Returns' },
  ledger:     { cover: '#430e10', cover2: '#38070a', foil: FOIL, subtitle: 'Treasury Account' },
  stipends:   { cover: '#2d1539', cover2: '#220d2f', foil: FOIL, subtitle: 'Receipts & Disbursement' },
  honor:      { cover: '#4c2d00', cover2: '#2b1800', foil: FOIL, subtitle: 'Ceremonial Citations' },
  calendar:   { cover: '#191617', cover2: '#0f0f0f', foil: FOIL, subtitle: 'Observances & Reckonings' },
  // Ivory and gold like Hall of Honor, so it takes its dark from the same place
  // the eye does: the black title plaque the cover's name is lettered on.
  history:    { cover: '#22201a', cover2: '#12110c', foil: FOIL, subtitle: 'Chronicles of the Realm' },
  // Black leather, and the only cover whose title is lettered in red rather
  // than leaf. The foil follows the art: this book's rule and filigree are a
  // colder, older gold than the other seven.
  informants: { cover: '#171310', cover2: '#0a0806', foil: '#b08d4f', subtitle: 'Reports of the Field Agents' },
};

export const bindingVars = (slug: VolumeSlug) => {
  const binding = BINDINGS[slug];
  return {
    '--cover': binding.cover,
    '--cover-2': binding.cover2,
    '--foil': binding.foil,
  } as React.CSSProperties;
};

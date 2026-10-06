// Per-volume binding colours, read off the cover art in
// `Assets/new volume assets.png`.
//
// These no longer draw the book — the shelf shows the painted covers — so they
// exist for one job: to carry a volume's identity through to the page you land
// on when you open it. Hence `cover` is picked as the leather's lit mid-tone
// rather than its median, which the heavy vignette drags almost to black.
//
// `cover` must stay DARK. ledger.css lays light foil text over it, so a light
// value here is unreadable rather than merely off-palette. That is why the
// Registry, whose cover is parchment, takes the bronze of its own clasps
// instead — the darkest colour the art actually gives that volume.

import type { VolumeSlug } from '../../shared/types';

export interface Binding {
  cover: string;
  cover2: string;
  foil: string;
  subtitle: string;
}

// One gold leaf is used across all nine covers, so this is shared rather than
// varied per volume — the art is what it is. Identity lives in `cover`.
const FOIL = '#c5a169';

export const BINDINGS: Record<VolumeSlug, Binding> = {
  roster:     { cover: '#4a0a33', cover2: '#2e0420', foil: FOIL, subtitle: 'Military Personnel Register' },
  statistics: { cover: '#5a1712', cover2: '#380b07', foil: FOIL, subtitle: 'The Order of Precedence' },
  ledger:     { cover: '#26331b', cover2: '#141c0e', foil: FOIL, subtitle: 'Treasury Account' },
  // Parchment, so it takes its dark from the bronze of its own clasps.
  stipends:   { cover: '#5c3d22', cover2: '#3a2412', foil: FOIL, subtitle: 'Receipts & Disbursement' },
  honor:      { cover: '#0d2433', cover2: '#061520', foil: FOIL, subtitle: 'Ceremonial Citations' },
  calendar:   { cover: '#4d2712', cover2: '#2e1404', foil: FOIL, subtitle: 'Observances & Reckonings' },
  history:    { cover: '#152a33', cover2: '#0a1a20', foil: FOIL, subtitle: 'Chronicles of the Realm' },
  informants: { cover: '#5e1a14', cover2: '#3a0806', foil: FOIL, subtitle: 'Reports of the Field Agents' },
  enforcement: { cover: '#232a12', cover2: '#141804', foil: FOIL, subtitle: 'Acts of the White-Gold Concordat' },
};

export const bindingVars = (slug: VolumeSlug) => {
  const binding = BINDINGS[slug];
  return {
    '--cover': binding.cover,
    '--cover-2': binding.cover2,
    '--foil': binding.foil,
  } as React.CSSProperties;
};

// Per-volume binding colours. Distinct enough that the shelf is scannable at a
// glance, muted enough that six of them together still read as an archive
// rather than a dashboard.

import type { VolumeSlug } from '../../shared/types';

export interface Binding {
  cover: string;
  cover2: string;
  foil: string;
  subtitle: string;
}

export const BINDINGS: Record<VolumeSlug, Binding> = {
  roster:     { cover: '#2d402f', cover2: '#172319', foil: '#c5ad68', subtitle: 'Military Personnel Register' },
  statistics: { cover: '#24384a', cover2: '#111d29', foil: '#b7c8d2', subtitle: 'Strength Returns' },
  ledger:     { cover: '#59401c', cover2: '#30210e', foil: '#d4b35d', subtitle: 'Treasury Account' },
  stipends:   { cover: '#582025', cover2: '#2d0f12', foil: '#d2a164', subtitle: 'Receipts & Disbursement' },
  honor:      { cover: '#303135', cover2: '#17181b', foil: '#c8c2b6', subtitle: 'Ceremonial Citations' },
  calendar:   { cover: '#3a2a48', cover2: '#1d1428', foil: '#bea5d0', subtitle: 'Observances & Reckonings' },
};

export const bindingVars = (slug: VolumeSlug) => {
  const binding = BINDINGS[slug];
  return {
    '--cover': binding.cover,
    '--cover-2': binding.cover2,
    '--foil': binding.foil,
  } as React.CSSProperties;
};

/** The spreadsheet behind the archive — the master ledger, in-world. */
export const MASTER_LEDGER_URL =
  'https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit';

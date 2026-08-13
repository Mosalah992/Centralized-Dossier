// Per-volume binding colours. Distinct enough that the shelf is scannable at a
// glance, muted enough that six of them together still read as an archive
// rather than a dashboard.

import type { VolumeSlug } from '../../shared/types';

export interface Binding {
  cover: string;
  cover2: string;
  foil: string;
}

export const BINDINGS: Record<VolumeSlug, Binding> = {
  roster:     { cover: '#31402f', cover2: '#1b241a', foil: '#cbb26a' },
  statistics: { cover: '#27384a', cover2: '#151f2a', foil: '#b9c9d8' },
  ledger:     { cover: '#5a4420', cover2: '#332512', foil: '#e0bd63' },
  stipends:   { cover: '#5b2126', cover2: '#331013', foil: '#d9a86a' },
  honor:      { cover: '#2f2f33', cover2: '#18181b', foil: '#cfc7b6' },
  calendar:   { cover: '#3b2b46', cover2: '#211829', foil: '#c3a8d6' },
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

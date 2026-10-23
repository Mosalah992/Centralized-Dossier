// The Solar's war table: the pieces High Command sets on the realm map.
//
// Shared by the page (web/src/views/solar/) and the routes that keep the pieces
// (functions/api/solar/pins/), so both sides validate one shape the same way.
// A piece's place is a fraction of the merged map (web/src/assets/solar/,
// scripts/prepare-solar-map.mjs) across and down, so the table's small map and
// the enlarged one agree on where it stands.

export const PIN_KINDS = ['pawn', 'interest'] as const;
export type PinKind = (typeof PIN_KINDS)[number];

export const PIN_INFO: Record<PinKind, { name: string; describer: string }> = {
  pawn: { name: 'Dominion pawn', describer: 'Where the Dominion stands: an agent, a patrol, a post.' },
  interest: { name: 'Point of interest', describer: 'A place High Command keeps an eye on.' },
};

export const PIN_LIMITS = {
  label: 60,
  note: 280,
  /** Pieces on the table at once. */
  count: 300,
} as const;

export interface SolarPin {
  id: string;
  kind: PinKind;
  /** 0 at the map's left edge, 1 at its right. */
  x: number;
  /** 0 at the map's top edge, 1 at its foot. */
  y: number;
  label: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/** What a reader sends to set a piece down or change one. */
export interface PinDraft {
  kind: PinKind;
  x: number;
  y: number;
  label: string;
  note: string;
}

export type PinCheck = { ok: true; value: PinDraft } | { ok: false; error: string };

const place = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;

const text = (value: unknown): string | null => (typeof value === 'string' ? value.trim() : null);

/**
 * A whole piece, checked. With `partial`, only the fields present are checked
 * and the rest are taken from `base` (moving a piece sends only x and y).
 */
export function checkPin(input: unknown, base?: PinDraft): PinCheck {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'A piece needs a place and a name.' };
  const raw = input as Record<string, unknown>;
  const has = (key: string) => base === undefined || key in raw;

  const kind = has('kind') ? raw.kind : base!.kind;
  if (!(PIN_KINDS as readonly unknown[]).includes(kind)) return { ok: false, error: 'No such piece.' };

  const x = has('x') ? place(raw.x) : base!.x;
  const y = has('y') ? place(raw.y) : base!.y;
  if (x === null || y === null) return { ok: false, error: 'That place is off the map.' };

  const label = has('label') ? text(raw.label) : base!.label;
  if (!label) return { ok: false, error: 'Name the piece.' };
  if (label.length > PIN_LIMITS.label) return { ok: false, error: `A name runs to ${PIN_LIMITS.label} letters at most.` };

  const note = has('note') ? (raw.note === undefined ? '' : text(raw.note)) : base!.note;
  if (note === null) return { ok: false, error: 'The note must be written.' };
  if (note.length > PIN_LIMITS.note) return { ok: false, error: `A note runs to ${PIN_LIMITS.note} letters at most.` };

  return { ok: true, value: { kind: kind as PinKind, x, y, label, note } };
}

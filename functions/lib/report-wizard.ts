// The bot's /report wizard, as pure functions: each step's message or modal,
// and the reading of what the member answered. The interactions route
// (functions/api/discord/interactions.ts) keeps the draft between steps and
// sends what these return.
//
//   1  what it is and how much it matters      selects     (scribe:cat|lvl|sec)
//   2  who files it, and its title              modal       (scribe:who)
//   3  when it happened                          Now, or a modal (scribe:now|hour)
//   4  the body                                  modal       (scribe:body)
//   5  the filing as it will be posted, with File it / Edit / Cancel
//
// Every custom_id is `scribe:<step>:<draft id>`. The message is ephemeral, so
// only its member can press it; the route also checks the draft is theirs.

import {
  BULLETIN_SECTIONS,
  CATEGORY_INFO,
  FILING_CATEGORIES,
  FILING_LIMITS,
  IMPORTANCE_INFO,
  checkFilingSoFar,
  importanceFor,
  incidentClock,
  incidentDate,
  incidentNow,
  type Filing,
  type FilingCategory,
  type FilingField,
  type IncidentTime,
} from '../../shared/filing';
import { BOARD_INFO } from '../../shared/room';
import { MONTH_LENGTHS } from '../../shared/reckoning';
import { MONTHS } from '../../shared/parsers/calendar';
import { filingEmbed, type Draft } from './scribe';

export const EPHEMERAL = 1 << 6;

/** Interaction response types. */
export const RESPOND = { message: 4, deferredMessage: 5, deferredUpdate: 6, update: 7, modal: 9 } as const;

export const customId = (step: string, draftId: string) => `scribe:${step}:${draftId}`;
export function readCustomId(id: string): { step: string; draftId: string } | null {
  const match = /^scribe:([a-z]+):([A-Za-z0-9_-]{8,40})$/.exec(id);
  return match ? { step: match[1]!, draftId: match[2]! } : null;
}

const row = (...components: unknown[]) => ({ type: 1, components });
const button = (label: string, id: string, style: 1 | 2 | 3 | 4 = 2, disabled = false) => ({ type: 2, style, label, custom_id: id, disabled });
const cancel = (draftId: string) => button('Cancel', customId('cancel', draftId), 4);

/** The categories a member may file: every one, or only the open ones for someone with no commission. */
export const categoriesFor = (member: boolean): FilingCategory[] =>
  FILING_CATEGORIES.filter((c) => member || CATEGORY_INFO[c].open);

// ── Step 1: what it is ──────────────────────────────────────────────────────

export function stepWhat(draft: Draft, member: boolean, note?: string): Record<string, unknown> {
  const categories = categoriesFor(member);
  const levels = draft.category ? importanceFor(draft.category) : [];
  const ready = Boolean(
    draft.category && draft.importance && levels.includes(draft.importance) && (draft.category !== 'bulletin' || draft.section),
  );
  const rows: unknown[] = [
    row({
      type: 3,
      custom_id: customId('cat', draft.id),
      placeholder: 'What are you filing?',
      options: categories.map((c) => ({ label: CATEGORY_INFO[c].name, value: c, default: draft.category === c })),
    }),
  ];
  if (draft.category) {
    rows.push(
      row({
        type: 3,
        custom_id: customId('lvl', draft.id),
        placeholder: 'How much does it matter?',
        options: levels.map((l) => ({
          label: IMPORTANCE_INFO[l].name,
          value: l,
          description: IMPORTANCE_INFO[l].meaning,
          default: draft.importance === l,
        })),
      }),
    );
  }
  if (draft.category === 'bulletin') {
    rows.push(
      row({
        type: 3,
        custom_id: customId('sec', draft.id),
        placeholder: 'Where on the board?',
        options: BULLETIN_SECTIONS.map((s) => ({ label: BOARD_INFO[s].title, value: s, default: draft.section === s })),
      }),
    );
  }
  rows.push(row(button('Next', customId('next', draft.id), 1, !ready), cancel(draft.id)));
  return {
    content: [note ? `> ${note}` : null, '**The Scribe** · 1 of 5 · What are you filing, and how much does it matter?'].filter(Boolean).join('\n'),
    flags: EPHEMERAL,
    components: rows,
    embeds: [],
  };
}

/** A choice from step 1's selects, applied. A level the new category cannot carry is cleared. */
export function choose(draft: Draft, step: string, value: string | undefined, member: boolean): Draft {
  const next: Draft = { ...draft };
  if (step === 'cat' && categoriesFor(member).includes(value as FilingCategory)) {
    next.category = value as FilingCategory;
    if (next.importance && !importanceFor(next.category).includes(next.importance)) delete next.importance;
    if (next.category !== 'bulletin') next.section = null;
  } else if (step === 'lvl' && next.category && importanceFor(next.category).includes(value as Filing['importance'])) {
    next.importance = value as Filing['importance'];
  } else if (step === 'sec' && (BULLETIN_SECTIONS as readonly string[]).includes(value ?? '')) {
    next.section = value as Filing['section'];
  }
  return next;
}

// ── Step 2: who files it ────────────────────────────────────────────────────

const input = (id: string, label: string, opts: { value?: string | null; max: number; required: boolean; paragraph?: boolean; placeholder?: string; min?: number }) =>
  row({
    type: 4,
    custom_id: id,
    label,
    style: opts.paragraph ? 2 : 1,
    max_length: opts.max,
    ...(opts.min ? { min_length: opts.min } : {}),
    required: opts.required,
    ...(opts.value ? { value: opts.value } : {}),
    ...(opts.placeholder ? { placeholder: opts.placeholder } : {}),
  });

export function modalWho(draft: Draft): Record<string, unknown> {
  const open = draft.category ? CATEGORY_INFO[draft.category].open : false;
  return {
    custom_id: customId('who', draft.id),
    title: 'The Scribe · 2 of 5 · Who files it',
    components: [
      input('rank', 'Rank', { value: draft.rank, max: FILING_LIMITS.rank, required: !open, placeholder: open ? 'If you hold one' : undefined }),
      input('name', 'Name', { value: draft.name, max: FILING_LIMITS.name, required: true }),
      input('superior', 'The superior you answered to', {
        value: draft.superior,
        max: FILING_LIMITS.superior,
        required: false,
        placeholder: 'Leave blank if you answered to none',
      }),
      input('title', 'Title', { value: draft.title, max: FILING_LIMITS.title, required: true }),
    ],
  };
}

/** A modal's answers by field id. */
export function modalValues(data: { components?: { components?: { custom_id: string; value?: string }[] }[] } | undefined): Record<string, string> {
  const values: Record<string, string> = {};
  for (const r of data?.components ?? []) for (const c of r.components ?? []) values[c.custom_id] = c.value ?? '';
  return values;
}

/** A step's fields, checked by the shared model (shared/filing.ts checkFilingSoFar). */
export function checkSoFar(draft: Draft, fields: readonly FilingField[]): { ok: true; filing: Filing } | { ok: false; error: string } {
  const { id: _id, ...given } = draft;
  const checked = checkFilingSoFar(given, fields);
  return checked.ok ? { ok: true, filing: checked.value } : { ok: false, error: checked.error };
}

/** When a modal's answers fail: what was wrong, and a way back into the same modal. */
export function retry(draft: Draft, error: string, step: 'who' | 'hour' | 'body'): Record<string, unknown> {
  const labels = { who: 'Write it again', hour: 'Choose the hour again', body: 'Write the body again' } as const;
  return {
    content: `> ${error}`,
    flags: EPHEMERAL,
    components: [row(button(labels[step], customId(`re${step}`, draft.id), 1), cancel(draft.id))],
    embeds: [],
  };
}

// ── Step 3: when ────────────────────────────────────────────────────────────

export function stepWhen(draft: Draft, now: IncidentTime): Record<string, unknown> {
  return {
    content: `**The Scribe** · 3 of 5 · When did it happen? It is now the ${incidentDate(now)}, ${incidentClock(now)}.`,
    flags: EPHEMERAL,
    components: [
      row(button('Now', customId('now', draft.id), 1), button('Another hour…', customId('hour', draft.id)), cancel(draft.id)),
    ],
    embeds: [],
  };
}

export function modalHour(draft: Draft, now: IncidentTime): Record<string, unknown> {
  const at = draft.time ?? now;
  return {
    custom_id: customId('hour', draft.id),
    title: 'The Scribe · 3 of 5 · The hour',
    components: [
      input('month', 'Month', { value: MONTHS[at.monthIndex - 1], max: 20, required: true, placeholder: 'Heartfire' }),
      input('day', 'Day', { value: String(at.day), max: 2, required: true }),
      input('clock', 'Hour', { value: incidentClock(at), max: 8, required: true, placeholder: '6:04 PM, or 18:04' }),
    ],
  };
}

/** "Heartfire" / "heart" / "9", "4", "6:04 PM" / "18:04" / "6pm", in the current in-world year. */
export function readHour(values: Record<string, string>, now: IncidentTime): IncidentTime | { error: string } {
  const month = (values.month ?? '').trim().toLowerCase();
  let monthIndex = Number.isInteger(Number(month)) && month ? Number(month) : 0;
  if (!monthIndex && month) {
    const found = MONTHS.findIndex((m) => m.toLowerCase() === month) + 1 || MONTHS.findIndex((m) => m.toLowerCase().replace(/['’]/g, '').startsWith(month.replace(/['’]/g, ''))) + 1;
    monthIndex = found;
  }
  if (monthIndex < 1 || monthIndex > 12) return { error: `No month is called “${values.month}”. Write one of the twelve, such as Heartfire.` };

  const day = Number((values.day ?? '').trim());
  const length = MONTH_LENGTHS[monthIndex - 1]!;
  if (!Number.isInteger(day) || day < 1 || day > length) return { error: `${MONTHS[monthIndex - 1]} has days 1 to ${length}.` };

  const clock = /^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*m?\.?$|^(\d{1,2})[:.](\d{2})$/i.exec((values.clock ?? '').trim());
  if (!clock) return { error: 'Write the hour as 6:04 PM, or 18:04.' };
  let hour: number;
  let minute: number;
  if (clock[3]) {
    hour = Number(clock[1]);
    minute = Number(clock[2] ?? 0);
    if (hour < 1 || hour > 12) return { error: 'On a twelve-hour clock the hour runs from 1 to 12.' };
    hour = (hour % 12) + (clock[3].toLowerCase() === 'p' ? 12 : 0);
  } else {
    hour = Number(clock[4]);
    minute = Number(clock[5]);
  }
  if (hour > 23 || minute > 59) return { error: 'Write the hour as 6:04 PM, or 18:04.' };
  return { year: now.year, monthIndex, day, hour, minute };
}

// ── Step 4: the body ────────────────────────────────────────────────────────

export function stepBody(draft: Draft): Record<string, unknown> {
  const name = draft.category ? CATEGORY_INFO[draft.category].name : 'filing';
  return {
    content: `**The Scribe** · 4 of 5 · Now write the ${name} itself.`,
    flags: EPHEMERAL,
    components: [row(button('Write it', customId('write', draft.id), 1), cancel(draft.id))],
    embeds: [],
  };
}

export function modalBody(draft: Draft): Record<string, unknown> {
  const name = draft.category ? CATEGORY_INFO[draft.category].name : 'Filing';
  return {
    custom_id: customId('body', draft.id),
    title: 'The Scribe · 4 of 5 · The body',
    components: [
      input('body', name.slice(0, 45), {
        value: draft.body,
        max: FILING_LIMITS.body,
        min: FILING_LIMITS.bodyMinimum,
        required: true,
        paragraph: true,
      }),
    ],
  };
}

// ── Step 5: as it will be posted ────────────────────────────────────────────

/** The checked filing as the bot will post it. Its parchment is drawn on the site once it is filed. */
export function stepPreview(draft: Draft, filing: Filing): Record<string, unknown> {
  return {
    content: `**The Scribe** · 5 of 5 · Your ${CATEGORY_INFO[filing.category].name}, as it will be filed. Its parchment is drawn on the archive’s site once it is.`,
    embeds: [filingEmbed({ filing, serial: null, stamp: null }, null)],
    flags: EPHEMERAL,
    components: [
      row(button('File it', customId('file', draft.id), 3), button('Edit', customId('edit', draft.id)), cancel(draft.id)),
    ],
  };
}

export const working = (text: string): Record<string, unknown> => ({ content: text, flags: EPHEMERAL, components: [], embeds: [] });

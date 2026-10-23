// Arrests — every act of the White-Gold Concordat the Embassy's agents recorded
// doing, bound as a book like every volume on the shelf (2026-10-23;
// BoundBook). It was a searchable roll with a sieve; the First Emissary asked
// for it to read as the Chronicles do. The search survives as the book's
// scrying, over every field of every act.
//
// The book opens on the register's figures, then sets the acts out by outcome,
// heaviest first (the order the Embassy escalates), each in date order.
//
// Its text arrives from /api/enforcement rather than from this bundle, for the
// reason set out in functions/lib/enforcement.ts.

import { useCallback } from 'react';

import sealUrl from '../assets/gate-seal.webp';
import { useEnforcement } from '../api';
import type { EnforcementEntry } from '../api';
import { bindBlocks, type BookBlock } from '../books/bind';
import { BoundBook } from '../books/BoundBook';
import { TitlePage, type Leaf } from '../books/leaves';
import { Consulting, Notice } from '../components/Notice';
import { mark } from '../reading';

/**
 * What each rung is called in the book, and how grave it is. The label is not
 * the field's own word because the field is a code and the book is a register:
 * an agent writing this up would put "Put to death", not "execution". The
 * order is the ladder itself, heaviest first.
 */
const RUNGS: Record<string, { label: string; grave: 'death' | 'penalty' | 'none' }> = {
  execution: { label: 'Put to death', grave: 'death' },
  // Next to execution because both end in a death, and a separate rung because
  // only one of them was a sentence.
  affray: { label: 'Killed in a fight', grave: 'death' },
  arrest: { label: 'Taken', grave: 'penalty' },
  interrogation: { label: 'Questioned', grave: 'penalty' },
  labour: { label: 'Set to labour', grave: 'penalty' },
  fine: { label: 'Fined', grave: 'penalty' },
  seizure: { label: 'Goods seized', grave: 'penalty' },
  lesser: { label: 'Lesser penalty', grave: 'penalty' },
  release: { label: 'Released', grave: 'none' },
  failed: { label: 'Not taken', grave: 'none' },
};
const RUNG_ORDER = Object.keys(RUNGS);

/** A rung the data carries that this table has never heard of still shows. */
const rungLabel = (kind: string) => RUNGS[kind]?.label ?? kind;
const rungGrave = (kind: string) => RUNGS[kind]?.grave ?? 'penalty';

function record(entry: EnforcementEntry): BookBlock {
  const fields: [string, string][] = [
    ['Agent', entry.agent],
    ['Accused', entry.title ? `${entry.subject}, ${entry.title}` : entry.subject],
    ['Manner', entry.method],
    ['Outcome', entry.outcome],
  ];
  return {
    kind: 'custom',
    weight: 320 + entry.act.length + fields.reduce((sum, [, v]) => sum + v.length + 40, 0),
    items: [{ label: entry.date, text: [entry.act, ...fields.map(([, v]) => v)].join(' · ') }],
    render: (term) => (
      <div className="chron-record" data-grave={rungGrave(entry.kind)}>
        <p className="chron-entry__date">{mark(entry.date, term)}</p>
        <p className="chron-record__act">{mark(entry.act, term)}</p>
        <dl className="chron-record__fields">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{mark(value, term)}</dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  };
}

function buildLeaves(entries: EnforcementEntry[], term: string, guided: boolean): Leaf[] {
  const deaths = entries.filter((e) => e.kind === 'execution').length;
  // Counted apart from the executions: both are deaths, and collapsing them
  // would let a killing in an ambush read as a sentence passed.
  const felled = entries.filter((e) => e.kind === 'affray').length;
  const taken = entries.filter((e) => rungGrave(e.kind) === 'penalty').length;
  const hands = new Set(entries.map((e) => e.hand)).size;

  const present = new Set(entries.map((e) => e.kind));
  const rungs = [...RUNG_ORDER.filter((k) => present.has(k)), ...[...present].filter((k) => !RUNGS[k]).sort()];

  const blocks: BookBlock[] = [
    { kind: 'chapter', text: 'The Register' },
    {
      kind: 'para',
      text: 'Compiled from the field agents’ own reports. Where a report names the hand that struck, that hand is named.',
    },
    { kind: 'field', label: 'Acts recorded', text: String(entries.length) },
    { kind: 'field', label: 'Put to death', text: String(deaths) },
    ...(felled ? [{ kind: 'field', label: 'Killed in a fight', text: String(felled) } as BookBlock] : []),
    { kind: 'field', label: 'Penalty exacted', text: String(taken) },
    { kind: 'field', label: 'Hands named', text: String(hands) },
    ...rungs.flatMap((kind): BookBlock[] => [
      { kind: 'chapter', text: rungLabel(kind) },
      ...entries.filter((e) => e.kind === kind).map(record),
    ]),
  ];

  return [
    {
      head: '',
      body: <TitlePage kicker="Thalmor Embassy" name="Arrests" by="Acts of the White-Gold Concordat, as the Embassy’s agents recorded them." />,
    },
    ...bindBlocks(blocks, term, guided),
  ];
}

export function EnforcementView() {
  const ledger = useEnforcement();
  const entries = ledger.state === 'ready' ? ledger.value.entries : null;
  const build = useCallback((term: string, guided: boolean) => (entries ? buildLeaves(entries, term, guided) : []), [entries]);

  if (ledger.state === 'loading') return <Consulting />;
  if (ledger.state === 'error') {
    return <Notice kind="error" title="This register could not be set out" body={ledger.message} />;
  }
  return (
    <BoundBook
      build={build}
      seal={sealUrl}
      scryLabel="Search the arrests"
      placeholder="a name, a charge, a hold…"
      navLabel="Arrests navigation"
    />
  );
}

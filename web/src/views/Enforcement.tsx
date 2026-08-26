// Ledger of Enforcement — every act of the White-Gold Concordat the Embassy's
// agents recorded doing.
//
// Set as a register rather than as prose. The Chronicles are read, so they are
// bound into leaves that turn; this is CONSULTED — the question a reader brings
// is "what happened to so-and-so" or "what has this agent done" — and the
// answer to that is a searchable roll, not a book you page through. Hence the
// sieve at the top and one ruled record per act.
//
// Its text arrives from /api/enforcement rather than from this bundle, for the
// reason set out in functions/lib/enforcement.ts: a list of people the Embassy
// put to death has no business sitting in a static asset that needs no writ.

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { useEnforcement } from '../api';
import type { EnforcementEntry } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers } from '../components/Page';
import { Sieve } from '../fluent/Sieve';

/**
 * What each rung is called on the page, and how grave it is.
 *
 * The label is not the field's own word because the field is a code and the
 * page is a register: an agent writing this up would put "Put to death", not
 * "execution". The order is the ladder itself, heaviest first, and drives the
 * dropdown so the reader meets it in the order the Embassy escalates.
 *
 * `grave` is three tiers and deliberately not nine. A colour per rung would be
 * a chart legend — the same fault the cover art was re-graded to undo — so the
 * only distinctions drawn in colour are the one that ended in a death, the ones
 * that ended in a penalty, and the ones that ended in neither.
 */
const RUNGS: Record<string, { label: string; grave: 'death' | 'penalty' | 'none' }> = {
  execution: { label: 'Put to death', grave: 'death' },
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

/**
 * The agent's own name, for the dropdown.
 *
 * The `agent` field is a sentence as often as it is a name — "Ganaril,
 * witnessed by Helgrid, Ariniel and Veylianne" — because a report names
 * everyone who stood there. Filtering wants the hand that acted, which is the
 * part before the first comma or the first "with"; the full line is still
 * printed on the record and still searched.
 */
function principal(agent: string): string {
  return agent.split(/,| with | alongside | and /i)[0]!.trim();
}

function Record(
  { entry, index, still }: { entry: EnforcementEntry; index: number; still: boolean },
) {
  return (
    <motion.li
      className="enforcement__record"
      data-grave={rungGrave(entry.kind)}
      initial={still ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        // Only the first screenful is staggered. Past that the delay would be
        // measured in seconds and the reader would be watching a list load
        // rather than reading a register.
        delay: still ? 0 : Math.min(index, 8) * 0.05,
        ease: [0.22, 0.61, 0.36, 1],
      }}
    >
      <div className="enforcement__rail">
        <span className="enforcement__rung">{rungLabel(entry.kind)}</span>
        <span className="enforcement__date">{entry.date}</span>
      </div>

      <div className="enforcement__body">
        <h3 className="enforcement__act">{entry.act}</h3>

        <dl className="enforcement__fields">
          <dt>Agent</dt>
          <dd>{entry.agent}</dd>

          <dt>Accused</dt>
          <dd>
            {entry.subject}
            {entry.title && <span className="enforcement__title">{entry.title}</span>}
          </dd>

          <dt>Manner</dt>
          <dd>{entry.method}</dd>

          <dt>Outcome</dt>
          <dd className="enforcement__outcome">{entry.outcome}</dd>
        </dl>
      </div>
    </motion.li>
  );
}

export function EnforcementView() {
  const ledger = useEnforcement();
  const still = useReducedMotion() ?? false;

  const [query, setQuery] = useState('');
  const [rung, setRung] = useState('');
  const [agent, setAgent] = useState('');

  const entries: EnforcementEntry[] = useMemo(
    () => (ledger.state === 'ready' ? ledger.value.entries : []),
    [ledger],
  );

  // Only the agents that actually appear, in the order they first do — which is
  // date order, so the list reads as the Embassy's own succession of hands
  // rather than as an alphabet.
  const agents = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of entries) seen.add(principal(entry.agent));
    return [...seen].map((name) => ({ value: name, label: name }));
  }, [entries]);

  const rungs = useMemo(() => {
    const present = new Set(entries.map((e) => e.kind));
    const known = RUNG_ORDER.filter((k) => present.has(k));
    // Anything the RUNGS table does not know sorts to the end rather than
    // vanishing from the dropdown — the same guarantee the wing ordering makes.
    const rest = [...present].filter((k) => !RUNGS[k]).sort();
    return [...known, ...rest].map((k) => ({ value: k, label: rungLabel(k) }));
  }, [entries]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (rung && entry.kind !== rung) return false;
      if (agent && principal(entry.agent) !== agent) return false;
      if (!term) return true;
      // Every field, including the ones the record prints small. A reader
      // searching "Talos" wants the charge wherever it was written down.
      return [entry.date, entry.agent, entry.act, entry.subject, entry.title,
        entry.method, entry.outcome]
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [entries, query, rung, agent]);

  // EVERY HOOK IS ABOVE THIS LINE. The three returns below are the reason:
  // a hook placed after them runs on some renders and not others, which is
  // React error #310, and it is caught by nothing here — no linter and no
  // render test. It shipped that way once, on the volume next door.
  if (ledger.state === 'loading') return <Consulting />;
  if (ledger.state === 'error') {
    return (
      <Notice
        kind="error"
        title="This register could not be set out"
        body={ledger.message}
      />
    );
  }

  const deaths = entries.filter((e) => e.kind === 'execution').length;
  const taken = entries.filter((e) => rungGrave(e.kind) === 'penalty').length;

  return (
    <Page
      title="Ledger of Enforcement"
      subtitle="Acts of the White-Gold Concordat"
      source={
        <p className="page__source">
          Compiled from the field agents' own reports. Where a report names the
          hand that struck, that hand is named.
        </p>
      }
    >
      <Registers
        items={[
          { label: 'Acts recorded', value: entries.length },
          { label: 'Put to death', value: deaths },
          { label: 'Penalty exacted', value: taken },
          { label: 'Agents named', value: agents.length },
        ]}
      />

      <Sieve
        searchLabel="Search the ledger"
        placeholder="A name, a charge, a hold…"
        query={query}
        onQuery={setQuery}
        filters={[
          { id: 'rung', label: 'Outcome', all: 'All outcomes', options: rungs, value: rung, onChange: setRung },
          { id: 'agent', label: 'Agent', all: 'All agents', options: agents, value: agent, onChange: setAgent },
        ]}
        shown={shown.length}
        total={entries.length}
        noun="acts"
      />

      {shown.length === 0 ? (
        <p className="enforcement__empty">
          No act in this ledger answers to that.
        </p>
      ) : (
        <ol className="enforcement">
          {shown.map((entry, i) => (
            <Record
              // Date and subject repeat across the ledger — one raid took four
              // people on one day — so the key carries the position too.
              key={`${entry.date}-${entry.subject}-${i}`}
              entry={entry}
              index={i}
              still={still}
            />
          ))}
        </ol>
      )}
    </Page>
  );
}

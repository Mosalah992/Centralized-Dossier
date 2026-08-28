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

import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { useEnforcement } from '../api';
import type { EnforcementEntry } from '../api';
import { D, STAGGER, gsap, revealOnEnter, staged } from '../motion';
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
  // Sits next to execution because both end in a death, and stays a separate
  // rung because only one of them was a sentence.
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

function Record({ entry }: { entry: EnforcementEntry }) {
  return (
    <li className="enforcement__record" data-grave={rungGrave(entry.kind)}>
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
    </li>
  );
}

export function EnforcementView() {
  const ledger = useEnforcement();
  const roll = useRef<HTMLOListElement>(null);

  const [query, setQuery] = useState('');
  const [rung, setRung] = useState('');
  const [agent, setAgent] = useState('');

  const entries: EnforcementEntry[] = useMemo(
    () => (ledger.state === 'ready' ? ledger.value.entries : []),
    [ledger],
  );

  // Only the hands that actually appear, in the order they first do — which is
  // date order, so the list reads as the Embassy's own succession of hands
  // rather than as an alphabet.
  //
  // `hand` is resolved when the volume is generated, NOT here. Splitting the
  // agent sentence in the browser was tried and produced "Ganaril" beside
  // "Justiciar Ganaril" beside "Falcril's patrol" — three dozen options for a
  // dozen people. See the field's note in functions/lib/enforcement.ts.
  const agents = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of entries) seen.add(entry.hand);
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
      if (agent && entry.hand !== agent) return false;
      if (!term) return true;
      // Every field, including the ones the record prints small. A reader
      // searching "Talos" wants the charge wherever it was written down.
      return [entry.date, entry.agent, entry.act, entry.subject, entry.title,
        entry.method, entry.outcome]
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [entries, query, rung, agent]);

  /*
   * Records arrive as the reader reaches them.
   *
   * The old entrance staggered on mount and capped the delay at the eighth
   * record, because a fixed stagger over 128 of them would have taken six
   * seconds and the reader only ever sees the first screenful anyway. That cap
   * was an admission that a mount-time stagger is the wrong instrument: it
   * animated records nobody was looking at, and then stopped animating the ones
   * they actually scrolled to.
   *
   * The dependency is `shown`, so narrowing the sieve runs it again — a reader
   * who filters to one agent should watch that agent's acts arrive rather than
   * find them already on the page.
   */
  useGSAP(() => {
    const list = roll.current;
    if (!list) return;

    // `return staged(...)` hands the revert to useGSAP, so unmounting the view
    // or changing the filter tears down the observer AND every inline style it
    // set. A matchMedia whose contexts nobody owns is what left the register
    // blank the first time this was written.
    return staged(({ moving }) => {
      const records = gsap.utils.toArray<HTMLElement>('.enforcement__record', list);
      if (records.length === 0) return;

      if (!moving) {
        // Not "animate instantly" — never touched at all, so the records sit
        // where the stylesheet puts them with no inline transform to clear.
        gsap.set(records, { clearProps: 'opacity,transform' });
        return;
      }

      // ONLY WHAT THE READER HAS YET TO REACH IS EVER BLANKED.
      //
      // Whatever is on screen when the volume opens is left exactly where the
      // stylesheet puts it. That is not only tidier, it is the safe failure:
      // the worst case here is a record that appears without animating, never
      // one that never appears. An earlier draft blanked all 128 and revealed
      // them from scroll position, and a blank register is what it produced.
      const fold = window.innerHeight;
      const waiting = records.filter((el) => el.getBoundingClientRect().top >= fold);

      return revealOnEnter(waiting, (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: D.page,
          ease: 'draw',
          stagger: STAGGER.roll,
          // Hand the record back to its stylesheet once it has arrived.
          clearProps: 'opacity,transform',
          overwrite: true,
        }));
    });
  }, { dependencies: [shown], scope: roll, revertOnUpdate: true });

  // EVERY HOOK IS ABOVE THIS LINE. The two returns below are the reason:
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
  // Counted apart from the executions rather than folded in with them. Both
  // are deaths, and collapsing them would let a killing in an ambush read as a
  // sentence passed — the distinction this ledger exists to keep.
  const felled = entries.filter((e) => e.kind === 'affray').length;
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
          ...(felled ? [{ label: 'Killed in a fight', value: felled }] : []),
          { label: 'Penalty exacted', value: taken },
          { label: 'Hands named', value: agents.length },
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
        <ol className="enforcement" ref={roll}>
          {shown.map((entry, i) => (
            <Record
              // Date and subject repeat across the ledger — one raid took four
              // people on one day — so the key carries the position too.
              key={`${entry.date}-${entry.subject}-${i}`}
              entry={entry}
            />
          ))}
        </ol>
      )}
    </Page>
  );
}

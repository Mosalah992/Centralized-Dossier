// Order of Precedence — the Embassy drawn as a tree.
//
// This volume used to be Roster Statistics: a corps-by-grade grid, a race table
// and a wing table. Those were worth having while the sheet's own tallies were
// suspect, and stopped being worth having the moment the figures started being
// counted off the register itself. What the Embassy still had no way to see was
// its own shape.
//
// The tree is derived, never authored. Unit is the wing, Rank is the rung, Name
// is the leaf — see shared/hierarchy.ts. A promotion in the sheet moves someone
// here, and there is no second copy of the hierarchy to drift.
//
// WHY RANKS COLLAPSE. Ninety-five people is a scroll, not a shape, and a tree
// that has to be scrolled has stopped being a tree. Anything past a handful
// shows as a closed branch carrying its count, which is exactly the "..." the
// hierarchy was sketched with in the first place.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import type { RankGroup, WingBranch } from '../../../shared/types';
import '../styles/precedence.css';

/**
 * Ranks larger than this start closed.
 *
 * Six is the largest group that still reads as a list rather than a column —
 * above it the eye stops counting and starts scrolling, which is the thing this
 * volume exists to avoid.
 */
const OPEN_AT_MOST = 6;

function Rank({ group, wing }: { group: RankGroup; wing: string }) {
  const many = group.members.length > OPEN_AT_MOST;
  const [open, setOpen] = useState(!many);
  const reduced = useReducedMotion();

  const names = (
    <ul className="prec__names">
      {group.members.map((m, i) => (
        <motion.li
          className="prec__name"
          key={`${m.name}-${i}`}
          initial={reduced ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : Math.min(i * 0.03, 0.4) }}
        >
          <span className="prec__rune" aria-hidden />
          <span className="prec__person">{m.name}</span>
          {m.race && <span className="prec__race">{m.race}</span>}
        </motion.li>
      ))}
    </ul>
  );

  return (
    <li className="prec__rank">
      {many ? (
        <button
          type="button"
          className={`prec__rank-head prec__rank-head--toggle${open ? ' is-open' : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
        >
          <span className="prec__rank-name">{group.rank}</span>
          <span className="prec__count">{group.members.length}</span>
          <span className="prec__chevron" aria-hidden />
          {/* The wing is only for a screen reader, which hears these buttons
              out of the visual context that makes "Recruit" unambiguous. */}
          <span className="prec__sr">in {wing}</span>
        </button>
      ) : (
        <p className="prec__rank-head">
          <span className="prec__rank-name">{group.rank}</span>
          <span className="prec__count">{group.members.length}</span>
        </p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="names"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {names}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Wing({ branch, index }: { branch: WingBranch; index: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className="prec__wing"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.12 }}
    >
      <h2 className="prec__wing-name">
        <span className="prec__sigil" aria-hidden />
        {branch.wing}
        <span className="prec__wing-count">{branch.total}</span>
      </h2>
      <ul className="prec__ranks">
        {branch.ranks.map((group) => (
          <Rank key={group.rank} group={group} wing={branch.wing} />
        ))}
      </ul>
    </motion.section>
  );
}

export function PrecedenceView() {
  const volume = useVolume('statistics');

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The order could not be read" body={volume.message} />;
  }

  const { membership, hierarchy } = volume.value.data;

  return (
    <Page
      title="Order of Precedence"
      subtitle="The Chain of Command"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers items={membership.map((m) => ({ label: m.label, value: figure(m.count) }))} />

      <div className="prec">
        {hierarchy.map((branch, i) => (
          <Wing key={branch.wing} branch={branch} index={i} />
        ))}
      </div>
    </Page>
  );
}

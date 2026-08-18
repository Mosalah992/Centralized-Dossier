// Order of Precedence — the Embassy woven as a tapestry.
//
// The first attempt at this was an indented list with elbow rules, which is an
// outline and not a tree: it showed the same facts in the same order and drew
// none of the structure. This is the Black tapestry instead — a root at the top,
// houses hanging beneath it on curved gold thread, and a line descending where
// it runs long.
//
// WHY IT IS SVG AND NOT NESTED ELEMENTS. A tree is a drawing: curved branches
// between arbitrary points, threads that have to meet a node exactly, a ground
// that is one continuous cloth. Nested divs can fake that with borders and
// pseudo-elements right up until the branches need to curve, and then every
// trick runs out at once.
//
// The layout is arithmetic and lives in precedence-layout.ts. This file is only
// ink: it draws what it is handed and decides what happens when a branch is
// pressed.
//
// PROGRESSIVE BY NECESSITY. Ninety-four people is not a picture. Wings start
// shut — with every rank fanned out the cloth is twenty-four columns wide before
// a single name appears — so the reader opens a house, then a rank, and the
// thread grows to meet what they asked for.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';

import { useVolume } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import { RADIUS, layout } from './precedence-layout';
import type { TapestryNode } from './precedence-layout';
import '../styles/precedence.css';

function Medallion({
  node, onToggle, reduced, index,
}: {
  node: TapestryNode;
  onToggle: (id: string) => void;
  reduced: boolean;
  index: number;
}) {
  const r = RADIUS[node.kind];
  const label = node.kind === 'person' ? node.label : node.label.toUpperCase();

  const body = (
    <>
      <circle className="tap__ring" r={r} />
      {node.kind !== 'person' && <circle className="tap__pip" r={r * 0.34} />}
      {/* Names hang below the medallion, as they do on the cloth. */}
      <text className="tap__label" y={r + 15}>{label}</text>
      {node.detail && (
        <text className="tap__detail" y={r + 28}>{node.detail}</text>
      )}
    </>
  );

  const common = {
    className: `tap__node tap__node--${node.kind}${node.expanded ? ' is-open' : ''}`,
    initial: reduced ? false : { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 },
    transition: {
      duration: 0.34,
      delay: reduced ? 0 : Math.min(index * 0.018, 0.5),
      ease: [0.22, 0.61, 0.36, 1] as const,
    },
  };

  // A branch that opens is a control; a person is not. Rendering the difference
  // rather than styling it is what makes the keyboard work for free.
  return node.expandable ? (
    <motion.g
      {...common}
      style={{ x: node.x, y: node.y, cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-expanded={node.expanded}
      aria-label={`${node.label}, ${node.detail} beneath`}
      onClick={() => onToggle(node.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(node.id); }
      }}
    >
      {body}
    </motion.g>
  ) : (
    <motion.g {...common} style={{ x: node.x, y: node.y }}>
      {body}
    </motion.g>
  );
}

export function PrecedenceView() {
  const volume = useVolume('statistics');
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const data = volume.state === 'ready' ? volume.value.data : null;
  const cloth = useMemo(
    () => (data ? layout(data.hierarchy, open) : null),
    [data, open],
  );

  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The order could not be read" body={volume.message} />;
  }
  if (!data || !cloth) return <Consulting />;

  const toggle = (id: string) =>
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(id)) {
        next.delete(id);
        // Shutting a house shuts what hung beneath it, or its ranks would be
        // remembered open and spring back the next time it is pressed.
        for (const held of next) if (held.startsWith(`rank:${id.slice(5)}:`)) next.delete(held);
      } else next.add(id);
      return next;
    });

  return (
    <Page
      title="Order of Precedence"
      subtitle="The Chain of Command"
      tab={volume.value.tab}
      fetchedAtUtc={volume.value.fetchedAtUtc}
    >
      <Registers
        items={data.membership.map((m) => ({ label: m.label, value: figure(m.count) }))}
      />

      <p className="tap__hint">Press a house to unroll it, and a rank to bring down its names.</p>

      {/* The cloth scrolls inside its own frame; the page never scrolls
          sideways, which is the same rule the wide tables follow. */}
      <div className="tap">
        <svg
          className="tap__cloth"
          viewBox={`0 0 ${cloth.width} ${cloth.height}`}
          width={cloth.width}
          height={cloth.height}
          role="tree"
          aria-label="The Embassy by wing and rank"
        >
          <defs>
            {/* Gold thread: a soft glow beneath the stroke, so a branch reads as
                embroidered into the cloth rather than drawn on top of it. */}
            <filter id="tap-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#tap-glow)">
            <AnimatePresence initial={false}>
              {cloth.threads.map((t) => (
                <motion.path
                  key={t.id}
                  className={`tap__thread tap__thread--${t.depth}`}
                  d={t.d}
                  // The thread embroiders itself: the stroke is drawn from the
                  // parent outward rather than fading in whole.
                  initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              ))}
            </AnimatePresence>
          </g>

          <AnimatePresence initial={false}>
            {cloth.nodes.map((node, i) => (
              <Medallion
                key={node.id}
                node={node}
                index={i}
                reduced={reduced}
                onToggle={toggle}
              />
            ))}
          </AnimatePresence>
        </svg>
      </div>
    </Page>
  );
}

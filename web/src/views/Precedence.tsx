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

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { useVolume } from '../api';
import { D, STAGGER, failsafe, gsap, staged } from '../motion';
import { Consulting, Notice } from '../components/Notice';
import { Page, Registers, figure } from '../components/Page';
import { RADIUS, layout } from './precedence-layout';
import type { NodeKind, TapestryNode } from './precedence-layout';

/**
 * How far from the trunk a node hangs, which is the order it is embroidered in.
 *
 * Threads carry their own `depth`; nodes carry `kind`, and the two say the same
 * thing — a rank is always one further out than the wing it hangs from. Reading
 * it off the kind keeps precedence-layout.ts untouched.
 */
const DEPTH: Record<NodeKind, number> = { root: 0, wing: 1, rank: 2, person: 3 };
import '../styles/precedence.css';

function Medallion({ node, onToggle }: {
  node: TapestryNode;
  onToggle: (id: string) => void;
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

  /*
   * `data-depth` is what the entrance staggers on.
   *
   * The old order was the node's index in a flat array, capped with a Math.min
   * — which staggered the cloth in whatever order the layout happened to emit.
   * Depth is the order the thing being drawn actually has: the trunk, then the
   * houses hanging off it, then the ranks, then the names. A tapestry is
   * embroidered outward from where it is anchored, and now it looks it.
   */
  const common = {
    className: `tap__node tap__node--${node.kind}${node.expanded ? ' is-open' : ''}`,
    'data-tap-id': node.id,
    'data-depth': DEPTH[node.kind],
    transform: `translate(${node.x}, ${node.y})`,
  };

  // A branch that opens is a control; a person is not. Rendering the difference
  // rather than styling it is what makes the keyboard work for free.
  return node.expandable ? (
    <g
      {...common}
      style={{ cursor: 'pointer' }}
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
    </g>
  ) : (
    <g {...common}>{body}</g>
  );
}

export function PrecedenceView() {
  const volume = useVolume('statistics');
  /** Read once for the scroll behaviour; the cloth's own motion is staged. */
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  /** The branch last pressed, so the cloth can be drawn round to show it. */
  const [aim, setAim] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<SVGSVGElement>(null);
  /** Every id already on the cloth, so only additions are embroidered. */
  const woven = useRef<Set<string>>(new Set());

  const data = volume.state === 'ready' ? volume.value.data : null;
  const cloth = useMemo(
    () => (data ? layout(data.hierarchy, open) : null),
    [data, open],
  );

  const toggle = useCallback((id: string) => {
    setAim(id);
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
  }, []);

  /**
   * Bring a point of the cloth to the middle of its frame.
   *
   * The tapestry is wider than any window it will be read in, and a reader who
   * opens a house on the far right should not then have to go looking for it.
   * Instant on arrival — an animated scroll on first paint reads as the page
   * being unfinished — and eased once the reader is doing the opening.
   */
  const centreOn = useCallback((x: number, width: number, smooth: boolean) => {
    const el = frame.current;
    if (!el) return;
    // The drawing may be rendered at a different size than its own coordinates,
    // so a node's x has to be carried through the same ratio the browser used.
    el.scrollTo({
      left: x * (el.scrollWidth / width) - el.clientWidth / 2,
      behavior: smooth && !reduced ? 'smooth' : 'auto',
    });
  }, [reduced]);

  // On arrival the trunk is the middle of the cloth; after that, whatever was
  // last pressed. Guarded rather than placed after the early returns below —
  // a hook that only runs once there is data is a hook that did not run on the
  // render before it, which is React error #310 and how this view first shipped.
  useLayoutEffect(() => {
    if (!cloth) return;
    const node = aim ? cloth.nodes.find((n) => n.id === aim) : cloth.nodes[0];
    if (node) centreOn(node.x, cloth.width, aim !== null);
  }, [aim, cloth, centreOn]);

  /*
   * The cloth embroiders itself outward from the trunk.
   *
   * Only what is NEW since the last render is animated, which is what makes
   * opening one house draw that house rather than restaging the whole tapestry.
   * The set of ids already seen is the memory; anything not in it is arriving.
   *
   * Threads draw with stroke-dashoffset — the same technique framer's
   * `pathLength` used underneath, and the reason no DrawSVGPlugin is needed
   * here. `getTotalLength()` is read once per new thread and never again.
   *
   * NOTHING IS ANIMATED OUT. Closing a house removes its nodes on the spot,
   * because an exit animation would mean holding React's state until a tween
   * finished, and a tween that never finishes — a backgrounded tab, a throttled
   * rAF — would leave a branch that will not shut. That is the same class of
   * bug as the gate's lockout, traded for a collapse that is merely instant.
   */
  useGSAP(() => {
    const svg = sheet.current;
    if (!svg || !cloth) return;

    return staged(({ moving }) => {
      const arriving = <T extends SVGElement>(nodes: T[]) =>
        nodes.filter((el) => !woven.current.has(el.dataset.tapId ?? ''));

      const nodes = arriving(gsap.utils.toArray<SVGGElement>('.tap__node', svg));
      const threads = arriving(gsap.utils.toArray<SVGPathElement>('.tap__thread', svg));

      // Remember everything on the cloth, arriving or not, so the next open
      // only animates its own additions.
      for (const el of svg.querySelectorAll<SVGElement>('[data-tap-id]')) {
        woven.current.add(el.dataset.tapId ?? '');
      }

      if (!moving) {
        gsap.set([...nodes, ...threads], { clearProps: 'all' });
        return;
      }

      // Nearest the trunk first, so the cloth grows outward rather than in
      // whatever order the layout happened to emit its arrays.
      const outward = (a: SVGElement, b: SVGElement) =>
        Number(a.dataset.depth ?? 0) - Number(b.dataset.depth ?? 0);
      nodes.sort(outward);
      threads.sort(outward);

      const tl = gsap.timeline();

      if (threads.length) {
        for (const path of threads) {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        }
        tl.to(threads, {
          strokeDashoffset: 0,
          opacity: 1,
          duration: D.page,
          ease: 'draw',
          stagger: { ...STAGGER.weave, from: 'start' },
          // Hand the stroke back to the stylesheet, or a later reflow would
          // find a dash pattern measured against the old geometry.
          clearProps: 'strokeDasharray,strokeDashoffset',
        } as gsap.TweenVars, 0);
      }

      if (nodes.length) {
        // A medallion lands just after the thread that reaches it, so the cloth
        // reads as thread-then-knot rather than as two separate events.
        tl.fromTo(nodes,
          { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' },
          {
            opacity: 1,
            scale: 1,
            duration: D.hand,
            ease: 'draw',
            stagger: STAGGER.weave,
            clearProps: 'opacity,scale,transformOrigin',
          }, 0.12);
      }

      // Threads and medallions both start invisible; without this a cloth that
      // never got a frame stays an empty sheet.
      const rescue = failsafe(tl);

      return () => {
        rescue();
        tl.kill();
        gsap.set([...nodes, ...threads], { clearProps: 'all' });
      };
    });
  }, { dependencies: [cloth], scope: sheet });

  // EVERY HOOK IS ABOVE THIS LINE. Nothing below it may call one.
  if (volume.state === 'loading') return <Consulting />;
  if (volume.state === 'error') {
    return <Notice kind="error" title="The order could not be read" body={volume.message} />;
  }
  if (!data || !cloth) return <Consulting />;

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
      <div className="tap" ref={frame}>
        <svg
          ref={sheet}
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
            {cloth.threads.map((t) => (
              <path
                key={t.id}
                className={`tap__thread tap__thread--${t.depth}`}
                data-tap-id={t.id}
                data-depth={t.depth}
                d={t.d}
              />
            ))}
          </g>

          {cloth.nodes.map((node) => (
            <Medallion key={node.id} node={node} onToggle={toggle} />
          ))}
        </svg>
      </div>
    </Page>
  );
}

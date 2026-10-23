// An elven archway in the Embassy's wall, after the arches of the high elves'
// halls: a slender lancet springing from leaf-crowned columns, its band carved
// with leaves, vines curling up its flanks to a star at the apex, and an inner
// ogee of tracery. Through it, Aetherius: deep starlight behind a slow golden
// aurora that brightens and draws inward as a reader comes near. Each arch
// leads two ways; hovering, focusing or choosing it lights the doorway and two
// engraved plaques appear inside it.
//
// The plaques are real links the whole time, hidden only with `visibility`, so
// a hidden plaque is never focusable. The arch's name is a button that comes
// FIRST in the document (the grid draws it beneath the doorway): focusing it
// lights the arch, so the next Tab lands on the first plaque, and a tap opens
// it for touch readers.

import { useEffect, useId, useRef, useState } from 'react';

import starfield from '../assets/mundus/starfield.webp';
import { nameForTransition } from '../transitions';
import { Link } from './nav';

interface Way {
  href: string;
  label: string;
}

interface Props {
  side: 'left' | 'right';
  name: string;
  describer: string;
  ways: readonly [Way, Way];
}

type Point = readonly [number, number];

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/*
 * The carved leaves along the arch's band, laid once at module load: up each
 * column and round each half of the lancet, every leaf turned along the curve
 * and alternating sides of it, as leaves sit on a stem.
 */
// A sharp lancet (2026-10-22): the arch springs at y 94 and closes high, its
// curves drawn steeply up to the apex.
const BAND_LEFT: [Point, Point, Point, Point] = [[19, 93], [19, 58], [36, 30], [60, 8]];
const BAND_RIGHT: [Point, Point, Point, Point] = [[101, 93], [101, 58], [84, 30], [60, 8]];

/**
 * The opening, as the portal of starlight is cut to it: one half of the
 * lancet's inner edge, mirrored. The frame draws the same curve, so the
 * starlight and its gold edge cannot drift apart.
 */
const OPENING_LEFT: [Point, Point, Point, Point] = [[24, 94], [24, 60], [40, 34], [60, 13]];
const OPENING_PATH = 'M24 200V94C24 60 40 34 60 13C80 34 96 60 96 94V200';
const PORTAL_CLIP = (() => {
  const pct = (x: number, y: number) => `${((x / 120) * 100).toFixed(2)}% ${((y / 200) * 100).toFixed(2)}%`;
  const left = Array.from({ length: 17 }, (_, i) => bezier(...OPENING_LEFT, i / 16));
  const points = [pct(24, 200), ...left.map((p) => pct(p.x, p.y)), ...left.slice(0, -1).reverse().map((p) => pct(120 - p.x, p.y)), pct(96, 200)];
  return `polygon(${points.join(', ')})`;
})();

const LEAVES = (() => {
  const out: { x: number; y: number; angle: number }[] = [];
  for (let y = 188; y > 102; y -= 13) {
    out.push({ x: 19, y, angle: -90 + (out.length % 2 ? 28 : -28) });
    out.push({ x: 101, y, angle: -90 + (out.length % 2 ? 28 : -28) });
  }
  for (let i = 1; i <= 7; i++) {
    const t = i / 8;
    const l = bezier(...BAND_LEFT, t);
    const r = bezier(...BAND_RIGHT, t);
    const lean = i % 2 ? 26 : -26;
    out.push({ x: l.x, y: l.y, angle: l.angle + lean });
    out.push({ x: r.x, y: r.y, angle: r.angle - lean });
  }
  return out;
})();

/** An almond leaf with its midrib, drawn at the origin pointing along +x. */
const LEAF = 'M0 0C1.8-2.6 4.6-2.8 7.4 0C4.6 2.8 1.8 2.6 0 0Z';

function ElvenFrame({ id }: { id: string }) {
  return (
    <svg className="arch__frame" viewBox="0 0 120 200" aria-hidden="true">
      <defs>
        <path id={`${id}-leaf`} d={LEAF} />
      </defs>
      {/* The outer edge of the band, springing from the columns to the apex. */}
      <path className="arch__line" d="M14 200V92C14 54 33 25 60 2C87 25 106 54 106 92V200" />
      {/* The opening's own edge. */}
      <path className="arch__line arch__line--fine" d={OPENING_PATH} />
      {/* Leaves carved along the band. */}
      <g className="arch__leaves">
        {LEAVES.map((leaf, i) => (
          <use key={i} href={`#${id}-leaf`} transform={`translate(${leaf.x.toFixed(2)} ${leaf.y.toFixed(2)}) rotate(${leaf.angle.toFixed(1)})`} />
        ))}
      </g>
      {/* Leaf capitals where the arch springs, and flared bases. */}
      {[19, 101].map((x) => (
        <g key={x} className="arch__capital">
          <path d={`M${x - 7} 102h14l-2 4h-10z`} />
          <use href={`#${id}-leaf`} transform={`translate(${x} 100) rotate(-90)`} />
          <use href={`#${id}-leaf`} transform={`translate(${x} 100) rotate(-140)`} />
          <use href={`#${id}-leaf`} transform={`translate(${x} 100) rotate(-40)`} />
          <path d={`M${x - 8} 194h16l2 6h-20z`} />
        </g>
      ))}
      {/* Vines curling up the flanks from the capitals. */}
      <g className="arch__vines" transform="translate(0 10)">
        <path d="M12 96C3 84 1 64 9 48C15 36 25 28 34 23C38 21 41 23 39 26C37 29 33 27 34 24" />
        <path d="M108 96C117 84 119 64 111 48C105 36 95 28 86 23C82 21 79 23 81 26C83 29 87 27 86 24" />
        <path d="M7 70C2 66 1 60 4 56" />
        <path d="M113 70C118 66 119 60 116 56" />
        <use href={`#${id}-leaf`} transform="translate(5 60) rotate(-120)" />
        <use href={`#${id}-leaf`} transform="translate(115 60) rotate(-60)" />
        <use href={`#${id}-leaf`} transform="translate(16 38) rotate(-150)" />
        <use href={`#${id}-leaf`} transform="translate(104 38) rotate(-30)" />
      </g>
      {/* An inner ogee of tracery, and the small trefoil where it closes. */}
      <path className="arch__line arch__line--tracery" d="M31 122V92C31 66 44 46 60 33C76 46 89 66 89 92V122" />
      <g className="arch__line arch__line--tracery">
        <circle cx="60" cy="44" r="3.2" />
        <circle cx="56.6" cy="49.2" r="3.2" />
        <circle cx="63.4" cy="49.2" r="3.2" />
      </g>
      {/* The star at the apex. */}
      <path className="arch__star" d="M60 -4L61.6 1.4L67 3L61.6 4.6L60 10L58.4 4.6L53 3L58.4 1.4Z" />
    </svg>
  );
}

export function Archway({ side, name, describer, ways }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const navId = useId();
  const frameId = useId().replace(/:/g, '');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const shown = open || focused;

  // The aurora only moves while the arch can be seen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver(([entry]) => setOffscreen(!entry?.isIntersecting));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || !shown) return;
    event.stopPropagation();
    setOpen(false);
    setFocused(false);
  };

  const onBlur = (event: React.FocusEvent) => {
    if (root.current?.contains(event.relatedTarget as Node | null)) return;
    setFocused(false);
    setOpen(false);
  };

  return (
    <div
      ref={root}
      className={`arch arch--${side}`}
      data-open={shown ? 'true' : undefined}
      data-offscreen={offscreen ? 'true' : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="arch__name plaque"
        aria-expanded={shown}
        aria-controls={navId}
        aria-describedby={`${navId}-d`}
        onClick={() => setOpen((was) => !was)}
      >
        {name}
      </button>
      <span id={`${navId}-d`} className="sr-only">{describer}</span>
      <div className="arch__door">
        <div className="arch__portal" style={{ clipPath: PORTAL_CLIP }}>
          <img className="arch__stars" src={starfield} alt="" aria-hidden="true" decoding="async" />
          <span className="arch__aurora arch__aurora--1" aria-hidden="true" />
          <span className="arch__aurora arch__aurora--2" aria-hidden="true" />
          <span className="arch__glow" aria-hidden="true" />
        </div>
        <ElvenFrame id={frameId} />
        <nav id={navId} className="arch__ways" aria-label={name}>
          {ways.map((way) => (
            <Link
              key={way.href}
              href={way.href}
              className="arch__way"
              // The reader steps through the doorway into the place beyond it.
              onClick={(event) => nameForTransition(event.currentTarget.closest('.arch__door'), 'arch-way')}
            >
              {way.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

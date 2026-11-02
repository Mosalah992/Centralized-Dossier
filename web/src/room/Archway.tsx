// An elven archway in the Embassy's wall, after the arches of the high elves'
// halls: a lancet on leaf-crowned capitals, its gold band carved with leaves,
// a vine climbing its flanks to a star at the apex. Through it, Aetherius:
// starlight behind a veil of blue magic that ripples up the edges, and
// brightens as a reader comes near. Drawn in pixels with the room
// (2026-11-02): the portal runs four frames, and four brighter ones while the
// arch is lit (scripts/pixel/objects.mjs). Each arch leads two ways;
// hovering, focusing or choosing it lights the doorway and two plaques appear
// inside it.
//
// The plaques are real links the whole time, hidden only with `visibility`, so
// a hidden plaque is never focusable. The arch's name is a button that comes
// FIRST in the document (it is drawn beneath the doorway): focusing it lights
// the arch, so the next Tab lands on the first plaque, and a tap opens it for
// touch readers.

import { useEffect, useId, useRef, useState } from 'react';

import archArt from '../assets/pixel/arch.png';
import type { Place } from '../pixel/layout';
import { at } from '../pixel/place';
import { Sprite } from '../pixel/Sprite';
import { nameForTransition } from '../transitions';
import { Link } from './nav';

interface Way {
  href: string;
  label: string;
}

interface Props {
  side: 'left' | 'right';
  place: Place;
  name: string;
  describer: string;
  ways: readonly [Way, Way];
}

export function Archway({ side, place, name, describer, ways }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const navId = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const shown = open || focused;

  // The portal only moves while the arch can be seen.
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
      className={`arch arch--${side} px-at`}
      style={at(place)}
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
        <Sprite src={archArt} frames={8} className="arch__art" />
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

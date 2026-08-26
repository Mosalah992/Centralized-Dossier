// ScrollTrigger, and the boundary that keeps it off the gate.
//
// THIS FILE MUST NEVER BE IMPORTED FROM App.tsx, Gate.tsx, Shelf.tsx, main.tsx
// OR ./motion. It is invariant 7's shape applied to animation weight: Gate.tsx
// imports ./motion statically, so everything reachable from that module lands in
// the entry chunk — the JavaScript a reader who has not signed in downloads
// before they can see a passphrase box. ScrollTrigger is ~11 KB gzip and there
// is nothing to scroll at the gate. Registering it in ./motion would cost every
// sealed reader that download to watch wax break.
//
// Nothing fails if this is imported from the wrong place. `index.js` just grows,
// silently, exactly the way it would if someone imported Fluent at the gate —
// which is why test/bundle.test.ts asserts the entry chunk carries neither.
//
// Import it only from lazy views. Rollup's default splitting will hoist it into
// a shared chunk once two of them ask for it, which is what it already does for
// Fluent's Portal and for reading.tsx.

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

import { gsap } from './motion';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/**
 * Keep an ambient loop from running while nobody can see it.
 *
 * CSS animates a decorative loop for as long as the tab is visible, whether the
 * element is on screen or three thousand pixels above it, and there is no CSS
 * way to say otherwise — `animation-play-state` cannot be driven from
 * intersection. This is the one thing moving the ambient animation to GSAP
 * genuinely buys, and it is worth being precise about how much: for a handful of
 * tweens the CPU difference is small, and `content-visibility: auto` would get
 * most of it for free. The reason the ambient loops moved is that reduced motion
 * is now decided in one place for every moving thing in the archive.
 *
 * Returns the ScrollTrigger so a matchMedia context can revert it.
 */
export function suspendOffScreen(
  trigger: Element,
  animation: gsap.core.Animation,
): ScrollTrigger {
  return ScrollTrigger.create({
    trigger,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? animation.resume() : animation.pause()),
  });
}

export { ScrollTrigger, gsap };

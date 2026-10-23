// Moving between the archive's places — the room, a volume, the Gallery, the
// Solar — as one continuous scene rather than a cut (2026-10-23).
//
// The browser's view transitions do the work: the page as it was is captured,
// React renders the next place inside the transition (flushSync, so the DOM is
// the new place when the callback returns), and the two are animated into one
// another by the ::view-transition rules in base.css. Going deeper (into a
// volume, through Ancarion into the Solar) and coming back out read as two
// directions, set on <html data-nav>. Through Ancarion's portrait into the
// Solar is a third ("through"), and back out of it a fourth ("return"): the
// room rushes in through the opening behind the painting, or out of it, about
// the point setDoorway marks.
//
// Anything named with `view-transition-name` on both sides morphs from one to
// the other instead: a spine on the shelf into the opened book. A name set
// only on the way out (an archway stepped through) plays its own exit.
//
// A browser without view transitions, or a reader who asks for less motion,
// gets the change at once, exactly as before.

import { flushSync } from 'react-dom';

export type Direction = 'forward' | 'back' | 'through' | 'return';

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> };
};

export function canTransition(): boolean {
  return (
    typeof (document as TransitionDocument).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    document.visibilityState === 'visible'
  );
}

/** Run `update` (which changes what React renders) as a transition, or at once. */
export function transition(update: () => void, direction: Direction): void {
  const doc = document as TransitionDocument;
  if (!canTransition() || !doc.startViewTransition) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.nav = direction;
  const running = doc.startViewTransition(() => flushSync(update));
  void running.finished.finally(() => {
    if (root.dataset.nav === direction) delete root.dataset.nav;
  });
}

/**
 * Mark where the Solar's door is on screen (the opening behind Ancarion's
 * portrait), as the point the room is passed through or comes out of.
 */
export function setDoorway(element: Element | null | undefined): void {
  if (!element) return;
  const r = element.getBoundingClientRect();
  const root = document.documentElement;
  root.style.setProperty('--door-x', `${(((r.left + r.width / 2) / window.innerWidth) * 100).toFixed(2)}%`);
  root.style.setProperty('--door-y', `${(((r.top + r.height * 0.55) / window.innerHeight) * 100).toFixed(2)}%`);
}

/**
 * Name an element for the next transition, so it morphs into (or exits as)
 * `name`. The name lives on the element only until the transition is over:
 * two elements may never share a name at once.
 */
export function nameForTransition(element: Element | null | undefined, name: string): void {
  if (!(element instanceof HTMLElement) || !canTransition()) return;
  element.style.setProperty('view-transition-name', name);
  window.setTimeout(() => element.style.removeProperty('view-transition-name'), 2500);
}

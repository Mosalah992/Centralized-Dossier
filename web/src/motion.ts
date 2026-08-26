// The archive's motion language, and the only place GSAP is configured.
//
// EVERYTHING HERE IS HEAVY AND HINGED. Wax, leather boards, vellum, gold leaf, a
// cabinet of books. Objects like that share a signature: slow to start, because
// they have mass; quick through the middle; long to settle, because of friction.
// And they never overshoot — overshoot reads as spring steel or moulded plastic,
// and the Embassy owns neither.
//
// SO: NO `back`, NO `elastic`, NO `bounce`, ANYWHERE IN THIS CODEBASE. That is
// the whole rule, and it is written here rather than left to taste because one
// bounced entrance is the cheapest possible way to make the archive look like a
// template. If a motion needs emphasis, it gets duration and delay, not recoil.
//
// WHAT IS NOT HERE. ScrollTrigger is registered in ./motion-scroll instead, and
// the split is structural rather than tidy — see the note at the head of that
// file. Gate.tsx imports THIS module statically, so anything reachable from here
// lands in the entry chunk that a reader who has not signed in must download.

import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// ── Easings ────────────────────────────────────────────────────────────────
//
// All four of these were already in the repository before this file existed;
// none is invented. Three were anonymous literals — two in Gate.tsx's motion
// props and one in chronicle.css — and the fourth is the `--ease` token.
//
// That matters for how chronicle.css:416 should be read. It sets its own curve
// instead of using `var(--ease)`, and its comment explains that a page turn
// accelerates and then decelerates where the token is an ease-out. That was
// never a deviation from a one-curve system: it was the second curve of a
// four-curve system nobody had named. This names them.
//
// GSAP does not accept cubic-bezier control points directly, which is the only
// reason CustomEase is a dependency (~3 KB gzip, at the gate). Approximating
// `draw` as `power2.out` was considered and rejected: the book hover is CSS
// using `--ease` and the shelf entrance is GSAP, they sit on the same screen,
// and two nearly-identical curves side by side is worse than one honest one.
export const CURVES = {
  /** Drawn out and set down. The archive's default, and `--ease` in CSS. */
  draw: [0.22, 0.61, 0.36, 1],
  /** A hinge: accelerating off the stop, decelerating into rest. */
  swing: [0.35, 0.1, 0.28, 1],
  /** Snap, then fall. Sharp entry, long tail — wax giving way. */
  break: [0.32, 0, 0.24, 1],
  /** A lid closing. Reluctant at both ends. */
  shut: [0.7, 0, 0.3, 1],
} as const;

export type CurveName = keyof typeof CURVES;

/**
 * Register each curve under its own name so tweens read `ease: 'swing'`.
 *
 * CustomEase.create's SVG-path form is the documented way in; `M0,0 C…` with
 * the two control points is exactly the cubic-bezier() argument list, so the
 * numbers above stay the numbers in base.css and can be compared by eye.
 */
for (const [name, [x1, y1, x2, y2]] of Object.entries(CURVES)) {
  CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
}

// ── Durations ──────────────────────────────────────────────────────────────
//
// Four of these five are numbers already on disk. This is a naming of existing
// practice rather than a new scale, which is deliberate: a scale invented in one
// sitting would immediately disagree with the nine CSS rules that stay CSS, and
// the two systems have to sit on the same screen.
export const D = {
  /** Ink appearing. Opacity only — a mark, a folio number, a rule. */
  leaf: 0.22,
  /** Hover, focus, small state. Gate.css:184's 0.35s. */
  hand: 0.35,
  /** One object arriving or leaving. ledger.css:50's open-cover. */
  page: 0.6,
  /** A hinged board swinging. chronicle.css:416's leaf turn. */
  board: 0.9,
  /** A multi-beat sequence. The gate ceremony's 0.85 + 0.55 + 0.7. */
  ceremony: 1.6,
} as const;

// ── Staggers ───────────────────────────────────────────────────────────────
//
// `amount` is the total time the stagger is distributed across, so a list of
// 128 takes exactly as long as a list of 12. Both places in this codebase that
// staggered a list hand-rolled that cap as `Math.min(index * each, total)` —
// this is the same intent expressed as the feature it is.
export const STAGGER = {
  /** A register unrolling, entry after entry. */
  roll: { each: 0.05, from: 'start', amount: 0.4 },
  /** A cloth embroidering outward. Finer, because there are more threads. */
  weave: { each: 0.018, from: 'start', amount: 0.5 },
  /** Ranks falling in — outward from the centre of the shelf. */
  muster: { each: 0.07, from: 'center' },
} as const;

// ── Defaults ───────────────────────────────────────────────────────────────

gsap.defaults({ ease: 'draw', duration: D.page });

/**
 * Don't fast-forward through a stall.
 *
 * When the main thread blocks for longer than the first number, GSAP pretends
 * only the second number of milliseconds elapsed rather than the true gap. It
 * is GSAP's default, set explicitly because the archive has a 54-second
 * background pan: without it, a tab returning from the background jumps the pan
 * to wherever the wall clock says it should be, which reads as a glitch rather
 * than as drift.
 */
gsap.ticker.lagSmoothing(500, 33);

// NO visibilitychange HANDLER, AND THAT IS A DECISION.
//
// The obvious optimisation here is `gsap.ticker.sleep()` while the tab is
// hidden and `wake()` on return. It was written, and it was removed, because a
// slept ticker does not merely pause pictures — it stops timelines from ever
// reaching `onComplete`, and this app sequences real consequences off that. The
// gate navigates to Discord when the seal ceremony completes. A reader who
// presses the seal and switches tabs would come back to a broken gate, which is
// precisely the lockout this refactor exists partly to fix.
//
// The saving was never worth it either: browsers already throttle rAF in
// background tabs to approximately nothing, so the ticker is close to idle
// there whether or not it is detached. Paying a lockout risk for a rounding
// error is a bad trade.
//
// Ambient loops are suspended by intersection instead, where the element being
// off screen is the actual condition and nothing is waiting on a completion.

// ── Reduced motion ─────────────────────────────────────────────────────────

/**
 * The media queries the archive stages its motion against.
 *
 * Shared as STRINGS rather than as a shared matchMedia instance, and that
 * distinction is the whole of what this comment is for. A module-level
 * `gsap.matchMedia()` singleton was tried first and is wrong in React: the
 * contexts it creates belong to the singleton, not to the component that
 * called `add()`, so `useGSAP`'s cleanup cannot revert them. What that produced
 * on the Ledger was 128 records left at `opacity: 0` by a context nobody owned,
 * with the ScrollTriggers that would have cleared them already killed — an
 * invisible register. Each component makes its own; see `staged()` below.
 *
 * `wide` is the 900px breakpoint the gate background and the torches already
 * use, so a layout that drops an element can drop its animation in one branch.
 */
export const STAGE = {
  moving: '(prefers-reduced-motion: no-preference)',
  still: '(prefers-reduced-motion: reduce)',
  wide: '(min-width: 901px)',
} as const;

/** What a staged callback is told about the conditions it is running under. */
export interface StageConditions {
  moving: boolean;
  still: boolean;
  wide: boolean;
}

/**
 * Build motion under a matchMedia the CALLER owns.
 *
 * Returns the revert function, so a `useGSAP` callback can simply
 * `return staged(...)` and have its cleanup tear the whole thing down —
 * timelines, ScrollTriggers, and any inline state they set — when the component
 * unmounts or its dependencies change.
 *
 * matchMedia contexts also revert LIVE. A reader who changes the OS preference
 * mid-visit has the moving branch torn down and the still branch built, on the
 * spot. That is the actual gain over the six mechanisms this replaced: before,
 * CSS updated instantly, React re-rendered, and the Chronicles' page turn went
 * on consulting the value it had read at the reader's last gesture.
 *
 * Two mechanisms deliberately survive alongside this one, and neither is
 * redundant:
 *
 *  - THE GLOBAL CSS KILL SWITCH (base.css). It covers CSS this app will never
 *    own — Fluent injects its own transitions through Griffel at runtime — and
 *    it applies at first paint, before any script has parsed. It does not fight
 *    GSAP: GSAP writes inline transform/opacity, which is neither a CSS
 *    animation nor a CSS transition, so those !important durations never see it.
 *
 *  - THE TORCH SWAP (shelf.css). No CSS property stops an animated image; only
 *    the source can change. And it must not move here either — that would put an
 *    image decode behind a script parse for the two heaviest assets on the page.
 */
export function staged(
  build: (conditions: StageConditions) => void | (() => void),
): () => void {
  const mm = gsap.matchMedia();
  // A cleanup returned by `build` is handed straight to the matchMedia context,
  // so anything the branch allocated that GSAP does not itself own — an
  // observer, a listener — is torn down when the branch reverts, not merely
  // when the component unmounts.
  mm.add(STAGE, (context) => build(context.conditions as unknown as StageConditions));
  return () => {
    mm.revert();
  };
}

// ── Motifs ─────────────────────────────────────────────────────────────────
//
// Registered effects are global mutable state and one more thing to keep in
// step, so the bar is: REGISTER A MOTIF ONLY WHEN IT IS USED IN TWO OR MORE
// PLACES. The Precedence thread-draw is used once and is written inline there
// rather than added here.

/**
 * The shape every effect below is handed.
 *
 * GSAP types `config` as `any`, which means a typo in a caller's vars object is
 * silently accepted and silently does nothing — the same failure mode as
 * `rotateY` for `rotationY`. Naming the fields is the only thing that makes the
 * compiler able to catch it.
 */
interface EffectConfig {
  duration: number;
  ease: string;
  y: number;
  from: number;
  to: number;
  stagger: gsap.StaggerVars;
}

/** A register arriving: entries settling onto the page, one after another. */
gsap.registerEffect({
  name: 'unroll',
  extendTimeline: true,
  defaults: { duration: D.page, ease: 'draw', y: 10, stagger: STAGGER.roll },
  effect: (targets: gsap.TweenTarget, config: EffectConfig) =>
    gsap.fromTo(
      targets,
      { opacity: 0, y: config.y },
      {
        opacity: 1,
        y: 0,
        duration: config.duration,
        ease: config.ease,
        stagger: config.stagger,
        // The register has to sit at its stylesheet's own position afterwards,
        // not at an inline transform this tween happened to land on.
        clearProps: 'transform',
      },
    ),
});

/**
 * A board swinging on its hinge.
 *
 * NOTE FOR ANYONE EXTENDING THIS: the property is `rotationY`, not `rotateY`.
 * GSAP silently ignores unknown vars, so the misspelling produces no error, no
 * warning and no movement — it just quietly does nothing.
 */
gsap.registerEffect({
  name: 'hinge',
  extendTimeline: true,
  defaults: { duration: D.board, ease: 'swing', from: -14, to: 0 },
  effect: (targets: gsap.TweenTarget, config: EffectConfig) =>
    gsap.fromTo(
      targets,
      { rotationY: config.from },
      { rotationY: config.to, duration: config.duration, ease: config.ease },
    ),
});

/**
 * Gold leaf catching the light: a highlight travelling the length of a rule.
 *
 * The one motif here that is new rather than named. It is also the most
 * thematic thing in the language — every rule, clasp and foil edge in the
 * archive is gilt, and gilt is defined by what it does when light moves across
 * it. Driven as a background-position sweep so the element keeps whatever
 * gradient its stylesheet gave it.
 */
gsap.registerEffect({
  name: 'gild',
  extendTimeline: true,
  defaults: { duration: D.page, ease: 'draw' },
  effect: (targets: gsap.TweenTarget, config: EffectConfig) =>
    gsap.fromTo(
      targets,
      { backgroundPosition: '-120% 0' },
      {
        backgroundPosition: '220% 0',
        duration: config.duration,
        ease: config.ease,
        clearProps: 'backgroundPosition',
      },
    ),
});


// ── Arriving on scroll ─────────────────────────────────────────────────────

/**
 * Reveal each element as the reader reaches it, once.
 *
 * INTERSECTIONOBSERVER RATHER THAN SCROLLTRIGGER, and the reason is worth
 * writing down because the obvious choice is the wrong one. ScrollTrigger
 * answers "how far through this scroll am I", which it does by measuring every
 * trigger's position up front and caching it. The question here is only "is
 * this on screen yet" — and the caching is a pure liability for it.
 *
 * Measured on the Ledger, which is where this was learned: a lazy view mounts
 * long after `load`, so ScrollTrigger never re-measures on its own; the first
 * record's trigger held `start: 333` against a true 16809; 115 triggers sat
 * live and unreachable, and the register revealed nothing at all. Two web font
 * families reflowing 128 records will do that, and no amount of refreshing at
 * the right moment makes a cached position immune to the next reflow.
 *
 * IntersectionObserver has nothing to invalidate. The browser answers from
 * layout it already has, after every reflow, for free.
 *
 * ScrollTrigger keeps its place in ./motion-scroll for work that genuinely
 * needs scroll PROGRESS — scrubbing, pinning, parallax. This is not that.
 *
 * @param elements  what to reveal. Left untouched if empty.
 * @param animate   run the arrival for one batch of elements.
 * @returns a disconnect function, for the caller's cleanup.
 */
export function revealOnEnter(
  elements: readonly HTMLElement[],
  animate: (batch: HTMLElement[]) => void,
): () => void {
  if (elements.length === 0) return () => {};

  // Everything is blanked FIRST and in one synchronous step, so there is never
  // a frame where a record is visible and about to be hidden. The caller is
  // expected to have excluded anything already on screen — see the Ledger.
  gsap.set(elements as HTMLElement[], { opacity: 0, y: 10 });

  // Elements that cross in the same frame arrive together, which is what makes
  // a fast scroll read as a run of entries settling rather than as N events.
  let pending: HTMLElement[] = [];
  let queued = 0;
  let heardFrom = false;

  const observer = new IntersectionObserver(
    (entries) => {
      heardFrom = true;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        // Once. A register does not re-introduce itself every time the reader
        // scrolls back past it, and 128 records that re-fade is nausea.
        observer.unobserve(el);
        pending.push(el);
      }
      if (pending.length === 0 || queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        const batch = pending;
        pending = [];
        animate(batch);
      });
    },
    // A little short of the fold, so a record has finished arriving by the time
    // the reader's eye gets to it rather than starting when it is already read.
    { rootMargin: '0px 0px -12% 0px' },
  );

  for (const el of elements) observer.observe(el);

  /*
   * LIVENESS FAILSAFE. If the observer never speaks, un-blank everything.
   *
   * An IntersectionObserver delivers an initial callback for every target
   * shortly after `observe()`, reporting the ones that are not intersecting as
   * such — so "heard nothing at all" is a reliable sign that intersections are
   * not being computed. That is not hypothetical: a document the browser is not
   * rendering does not compute them, and this was found the hard way in a
   * headless pane where the register stayed blank because no callback ever came.
   *
   * The consequence of being wrong in the other direction is nothing worse than
   * some records appearing without their arrival. The consequence of trusting a
   * silent observer is a register the reader cannot read, which is the one
   * outcome on this page that is not acceptable.
   */
  const failsafe = setTimeout(() => {
    if (heardFrom) return;
    observer.disconnect();
    gsap.set(elements as HTMLElement[], { clearProps: 'opacity,transform' });
  }, 1200);

  return () => {
    clearTimeout(failsafe);
    if (queued) cancelAnimationFrame(queued);
    observer.disconnect();
    // Anything that never got its turn must not be left blank.
    gsap.set(elements as HTMLElement[], { clearProps: 'opacity,transform' });
  };
}

export { gsap };


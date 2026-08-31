/**
 * The Wheel of Mundus: what the archive can actually say about Nirn's sky.
 *
 * EVERYTHING HERE IS SOURCED, and the things that are not sourced are absent
 * rather than guessed. That is the whole design of this file. The orrery it
 * feeds turns three bodies and holds eight still, and the reason is here: the
 * three have periods somebody wrote down and the eight do not.
 *
 * The sources disagree with each other, and — following the archive's habit
 * with `docs/skyrim-press-history.md`, which records contradictions instead of
 * smoothing them — the disagreement is written down rather than resolved:
 *
 *   - Daggerfall gives a 24-day phase cycle, with Masser and Secunda offset by
 *     four days, and orbits of 24 hours for Masser and 20 for Secunda.
 *   - Morrowind gives Secunda a 28-29 day cycle over an irregular 3/4/3/4/4
 *     pattern that only closes after five cycles.
 *
 * The Daggerfall figures are the ones used below, because they are the only set
 * that is numeric for BOTH moons and internally consistent. How consistent is
 * worth noting, because it is the reason to trust them: a 24-hour orbit against
 * a 20-hour orbit gives a relative rate of 1/20 - 1/24 = 1/120 of a turn per
 * hour, so the two moons return to conjunction every 120 hours — five days,
 * which is exactly what the source says happens, and which is NOT stated as a
 * separate fact anywhere. The periods predict it. Nothing here asserts it.
 *
 * THE EIGHT DIVINE PLANETS HAVE NO PERIODS. Nobody wrote them down. They were
 * held still on the wheel for that reason at first; they turn now, on a stated
 * convention rather than on a reckoning, and the difference is kept visible —
 * see the tempo section at the foot of this file and the note on the plate.
 */

import { DAYS_PER_YEAR, dayProgress, reckon } from './reckoning';

/**
 * The in-world day as a continuous number, counting from year 0.
 *
 * The integer part comes from `reckon`, which floors to the minute; the
 * fraction comes from `dayProgress`, which does not. Mixing them is deliberate
 * — a phase wants a day count and an orbit wants a smooth angle, and both come
 * off the same anchor so they cannot drift apart.
 */
export function absoluteDay(nowMs: number = Date.now()): number {
  const moment = reckon(nowMs);
  return moment.year * DAYS_PER_YEAR + moment.dayOfYear + dayProgress(nowMs);
}

/** Masser's orbit, in hours. Daggerfall. */
const MASSER_ORBIT_HOURS = 24;
/** Secunda's, which is why it overtakes. Daggerfall. */
const SECUNDA_ORBIT_HOURS = 20;
/** The phase cycle both moons run, in days. Daggerfall: eight phases of three. */
export const PHASE_DAYS = 24;
/** How far Secunda's phase trails Masser's. Daggerfall. */
const SECUNDA_PHASE_OFFSET_DAYS = 4;

const wrap = (n: number) => n - Math.floor(n);

/**
 * Where each body stands on its ring, as a fraction of a turn.
 *
 * Masser makes one turn a day by definition of its orbit. Secunda makes
 * 24/20 = 1.2, which is what makes the pair separate and close again.
 *
 * MAGNUS IS PLACED, NOT TIMED. The sun's angle is not an independent reading:
 * the source says Masser rises and sets "basically exactly opposite the sun",
 * so the sun is drawn half a turn from Masser. That is a stated relationship
 * rather than a period of its own, and it is the only reason the sun may move
 * on this wheel at all.
 */
export function revolutions(nowMs: number = Date.now()) {
  const day = absoluteDay(nowMs);
  const masser = wrap(day * (24 / MASSER_ORBIT_HOURS));
  return {
    masser,
    secunda: wrap(day * (24 / SECUNDA_ORBIT_HOURS)),
    magnus: wrap(masser + 0.5),
  };
}

/** The eight phases of a 24-day cycle, three days each. */
export const PHASE_NAMES = [
  'New',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full',
  'Waning Gibbous',
  'Third Quarter',
  'Waning Crescent',
] as const;

export interface Phase {
  /** 0 at new, 0.5 at full — what the terminator is drawn from. */
  fraction: number;
  name: (typeof PHASE_NAMES)[number];
}

function phaseAt(day: number): Phase {
  const fraction = wrap(day / PHASE_DAYS);
  /*
   * THE NAMES ARE CENTRED ON THEIR MOMENTS, not started at them.
   *
   * A plain floor puts "Full" at [0.500, 0.625) — beginning at the instant of
   * fullness and running three days PAST it, so the wheel draws a visibly
   * gibbous moon under a legend that says Full, and the two look like they
   * disagree. Rounding instead of flooring centres each three-day name on the
   * moment it names: Full becomes [0.4375, 0.5625), a day and a half either
   * side. New wraps across zero, which is why the modulo is still needed.
   */
  const slot = Math.round(fraction * PHASE_NAMES.length) % PHASE_NAMES.length;
  return { fraction, name: PHASE_NAMES[slot]! };
}

export function phases(nowMs: number = Date.now()): { masser: Phase; secunda: Phase } {
  const day = absoluteDay(nowMs);
  return {
    masser: phaseAt(day),
    secunda: phaseAt(day - SECUNDA_PHASE_OFFSET_DAYS),
  };
}

/**
 * How close the moons are to standing together, 1 at conjunction and 0 when
 * they are opposite.
 *
 * Derived from the two orbits rather than from a rule about fifth days — see
 * the note at the top. If the periods above are ever corrected, this follows
 * them instead of contradicting them.
 */
export function conjunction(nowMs: number = Date.now()): number {
  const { masser, secunda } = revolutions(nowMs);
  const apart = Math.abs(wrap(masser - secunda + 0.5) - 0.5) * 2;
  return 1 - apart;
}

/*
 * ── THE WHEEL'S OWN TEMPO ────────────────────────────────────────────────
 *
 * Everything above this line is the reckoning. Everything below it is the
 * speed at which a picture of the reckoning is turned, and the two must not be
 * confused — so they are separated here rather than tangled together in the
 * component.
 *
 * WHY A DISPLAY TEMPO EXISTS AT ALL. At their true courses these bodies crawl.
 * Masser turns once an in-world day, which at the archive's two-to-one rate is
 * one turn every twelve real hours — about half a degree a minute. A wheel that
 * moves half a degree a minute is a still picture to anybody who looks at it,
 * and this archive has already learned that the expensive way: the sandglass
 * measured a whole day, moved one pixel every twenty-one minutes, and was
 * reported as broken.
 *
 * WHAT IS STILL TRUE. The tempo scales the whole wheel and nothing else, so
 * every RELATION between the bodies survives it: Secunda still overtakes Masser
 * at 24/20, the two still close every fifth of Masser's turns, and Magnus still
 * stands exactly opposite Masser. The phase names, the conjunction reading and
 * everything else in the legend are computed from the real clock above and are
 * untouched by any of this.
 *
 * WHAT IS NOT. How fast the wheel turns says nothing about how fast the sky
 * does, and the plate says so in its own prose.
 */

/** One turn of Masser on the wheel, in seconds. */
const WHEEL_TURN_SECONDS = 44;

/**
 * Where each body stands ON THE WHEEL — the drawn positions, not the reckoned
 * ones. `revolutions` above remains the truth and is what the readings use.
 */
export function wheelTurns(nowMs: number = Date.now()) {
  const t = nowMs / (WHEEL_TURN_SECONDS * 1000);
  const masser = wrap(t);
  return {
    masser,
    secunda: wrap(t * (24 / 20)),
    magnus: wrap(masser + 0.5),
  };
}

/**
 * The eight, turning.
 *
 * THIS IS A CONVENTION, NOT A RECKONING, and it is the same kind of convention
 * as the alphabetical ring order and the choice of which sphere stands for
 * which Divine: nothing records how these bodies move, so the wheel declares a
 * rule and applies it evenly rather than picking eight numbers that look right.
 *
 * The rule is the plainest one that produces a sky rather than a fairground: an
 * outer ring takes longer than the ring inside it, by a constant factor. The
 * periods are therefore in a geometric run, no two planets ever share an
 * arrangement for long, and the whole thing is one number a reader could check.
 *
 * They run against Masser's direction — the eight are not moons and there is no
 * reason for them to keep company with one — which also means the wheel never
 * settles into a pattern where everything drifts as a single frozen shape.
 */
const DIVINE_INNER_SECONDS = 68;
const DIVINE_RING_FACTOR = 1.27;

export function divineTurns(nowMs: number = Date.now()): number[] {
  return DIVINE_PLANETS.map((_, i) => {
    const period = DIVINE_INNER_SECONDS * DIVINE_RING_FACTOR ** i;
    // The eighth of a turn each starts at keeps them from lining up into a
    // spoke at the moment the page opens.
    return wrap(-nowMs / (period * 1000) + i / DIVINE_PLANETS.length);
  });
}

/**
 * The eight planets, which are the Divines.
 *
 * IN ALPHABETICAL ORDER, and that is a statement about this list rather than
 * about the sky. No source ranks them by distance from Nirn, so any order the
 * orrery draws them in is a drawing convention; alphabetical is the one that
 * most obviously is not a claim. A reader who sees Akatosh nearest and Zenithar
 * furthest should read "eight, listed" and not "eight, measured".
 *
 * The cosmos is Nirn-centred, so a wheel with Nirn at the middle and everything
 * else around it is not a simplification for drawing's sake — it is the
 * arrangement.
 */
export const DIVINE_PLANETS: readonly { name: string; of: string }[] = [
  { name: 'Akatosh', of: 'Time' },
  { name: 'Arkay', of: 'The Cycle of Life and Death' },
  { name: 'Dibella', of: 'Beauty' },
  { name: 'Julianos', of: 'Wisdom and Logic' },
  { name: 'Kynareth', of: 'Air and the Heavens' },
  { name: 'Mara', of: 'Love' },
  { name: 'Stendarr', of: 'Mercy' },
  { name: 'Zenithar', of: 'Work and Commerce' },
];

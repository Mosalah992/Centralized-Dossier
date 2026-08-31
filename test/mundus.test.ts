// The sky's arithmetic, checked where it can actually be checked.
//
// WHY THIS EXISTS. The wheel's motion was twice "verified" in a browser by
// sampling where bodies sat on screen and watching the numbers change. Both
// times the measurement was wrong, and wrong in the same way: the wheel is
// TILTED, so a body's screen position is a projection of its orbital angle and
// not proportional to it. A body crossing the near side of its ellipse covers
// far more screen than one crossing the far side at the same orbital rate.
// Sampling that over a few seconds measures where a body happens to be, not how
// fast it goes, and it produced a set of rates that looked disordered while the
// arithmetic underneath was exactly right.
//
// The rates are a property of the functions, so they are tested as one.

import { describe, expect, it } from 'vitest';

import {
  DIVINE_PLANETS,
  PHASE_DAYS,
  conjunction,
  divineTurns,
  phases,
  revolutions,
  wheelTurns,
} from '../shared/mundus';

/** Smallest signed distance between two fractions of a turn. */
function apart(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
}

/** Turns covered between two instants, unwrapped. */
function rate(at: (ms: number) => number, t0: number, dt: number): number {
  const steps = 64;
  let total = 0;
  let prev = at(t0);
  for (let i = 1; i <= steps; i++) {
    const next = at(t0 + (dt * i) / steps);
    let step = next - prev;
    // Unwrap: a body that passes zero has not jumped backwards a whole turn.
    if (step < -0.5) step += 1;
    if (step > 0.5) step -= 1;
    total += step;
    prev = next;
  }
  return total / dt;
}

const T0 = 1_800_000_000_000;

describe('the wheel’s tempo', () => {
  it('turns every body at a constant rate', () => {
    // Constant means the rate over the first window equals the rate over a
    // window an hour later. Anything eased or wound would fail this.
    for (let i = 0; i < DIVINE_PLANETS.length; i++) {
      const at = (ms: number) => divineTurns(ms)[i]!;
      const early = rate(at, T0, 20_000);
      const later = rate(at, T0 + 3_600_000, 20_000);
      expect(Math.abs(early - later)).toBeLessThan(1e-9);
    }
  });

  it('turns each ring slower than the ring within it', () => {
    const rates = DIVINE_PLANETS.map((_, i) =>
      Math.abs(rate((ms) => divineTurns(ms)[i]!, T0, 20_000)),
    );
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]!, `ring ${i} is not slower than ring ${i - 1}`).toBeLessThan(rates[i - 1]!);
    }
  });

  it('keeps the eight in a geometric run, so one figure describes them all', () => {
    const rates = DIVINE_PLANETS.map((_, i) =>
      Math.abs(rate((ms) => divineTurns(ms)[i]!, T0, 20_000)),
    );
    const ratios = rates.slice(1).map((r, i) => rates[i]! / r);
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0]!, 6);
  });

  it('never starts them all on one spoke', () => {
    const turns = divineTurns(T0);
    for (let i = 0; i < turns.length; i++) {
      for (let j = i + 1; j < turns.length; j++) {
        expect(apart(turns[i]!, turns[j]!)).toBeGreaterThan(0.01);
      }
    }
  });
});

/*
 * THE TEMPO MAY BE CHANGED; THESE RELATIONS MAY NOT. This is the line the
 * design rests on — the wheel is turned faster than the sky, and what it buys
 * that with is the claim that everything ON it stays true to everything else.
 */
describe('what the tempo must not break', () => {
  it('has Secunda overtake Masser at the reckoned 24/20', () => {
    const m = Math.abs(rate((ms) => wheelTurns(ms).masser, T0, 20_000));
    const s = Math.abs(rate((ms) => wheelTurns(ms).secunda, T0, 20_000));
    // Seven places, not nine: `rate` sums sixty-four differences, so the
    // answer carries a few parts in a billion of accumulated float error. The
    // ratio is exact in the code; the measurement of it is not.
    expect(s / m).toBeCloseTo(24 / 20, 7);
  });

  it('stands Magnus exactly opposite Masser, as it is written', () => {
    for (const ms of [T0, T0 + 7_000, T0 + 913_000]) {
      const t = wheelTurns(ms);
      expect(apart(t.magnus, t.masser)).toBeCloseTo(0.5, 9);
    }
  });

  it('brings the moons together every fifth turn of Masser, unstated', () => {
    // The sources say the moons meet every fifth day. Nothing in the code says
    // so — it falls out of 24 and 20 hours — which is the reason to trust the
    // pair of figures. If someone edits either period, this fails.
    const m = Math.abs(rate((ms) => wheelTurns(ms).masser, T0, 20_000));
    const s = Math.abs(rate((ms) => wheelTurns(ms).secunda, T0, 20_000));
    expect(1 / (s - m) / (1 / m)).toBeCloseTo(5, 6);
  });
});

/*
 * The readings are reckoned from the real clock and the wheel's tempo must
 * never reach them. That is the whole reason shared/mundus.ts is split in two.
 */
describe('the readings, which are not the tempo', () => {
  it('runs the phase cycle over the reckoned days, not over wheel turns', () => {
    const day = 86_400_000 / 2; // one in-world day at the archive's 2:1 rate
    const now = phases(T0).masser.fraction;
    const halfway = phases(T0 + (PHASE_DAYS / 2) * day).masser.fraction;
    expect(apart(now, halfway)).toBeCloseTo(0.5, 2);
  });

  it('names Full at the moment the moon is full, not three days after it', () => {
    // Centred, not floored — a floor put "Full" at [0.5, 0.625) and drew a
    // visibly gibbous moon under a legend insisting otherwise.
    const day = 86_400_000 / 2;
    let sawFull = false;
    for (let k = 0; k < PHASE_DAYS * 4; k++) {
      const p = phases(T0 + k * day * 0.5).masser;
      if (Math.abs(p.fraction - 0.5) < 0.02) {
        expect(p.name).toBe('Full');
        sawFull = true;
      }
    }
    expect(sawFull, 'never sampled a full moon').toBe(true);
  });

  it('keeps conjunction on the reckoning rather than on the drawn wheel', () => {
    // `conjunction` reads `revolutions`, which is the true course. If it ever
    // gets pointed at `wheelTurns` the number would still look plausible and
    // would silently be a statement about a drawing.
    const hour = 3_600_000;
    const truth = revolutions(T0 + hour);
    const close = conjunction(T0 + hour);
    expect(close).toBeCloseTo(1 - apart(truth.masser, truth.secunda) * 2, 9);
  });
});

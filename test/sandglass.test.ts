// The two sand surfaces of the Tamrielic Calendar's sandglass.
//
// WHY GEOMETRY GETS A TEST. These are four lines of arithmetic that nobody
// reads and everybody trusts, drawn at three and a half rem where being wrong
// looks like being slightly odd. Both bugs below were found by this file and
// by drawing the day out side by side — neither was visible in the code.
//
//   The heap grew THROUGH the neck as the lower bulb filled, into the bulb
//   above. The clip was hiding it, so it looked right while being wrong.
//
//   The funnel was inverted: deepest at the turn, flattest by evening, which
//   is exactly backwards. The depth keyed off the sand remaining instead of
//   the day elapsed.
//
// So the assertions are about the SHAPE the eye should read — dips down here,
// heaps up there, never leaves its own bulb — rather than about the numbers,
// which are the part that will be tuned.

import { describe, expect, it } from 'vitest';
import { lowerPath, moundPeak, turned, upperPath } from '../web/src/views/Honors';
import { RATE, minuteProgress, reckon } from '../shared/reckoning';

/** Evaluate a quadratic Bezier at t. */
const qy = (a: number, c: number, b: number, t: number) =>
  (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t ** 2 * b;

const control = (d: string) => {
  const m = /Q 30 (-?[\d.]+) 48 (-?[\d.]+)/.exec(d)!;
  return { c: Number(m[1]), end: Number(m[2]) };
};

describe('the sand surfaces', () => {
  it('funnels downward at the centre of the draining bulb', () => {
    const d = upperPath(20, 12, 50);
    const { c, end } = control(d);
    // Control BELOW the rim means the surface dips: this is the funnel.
    expect(c).toBeGreaterThan(end);
    expect(qy(end, c, end, 0.5)).toBeGreaterThan(end);
  });

  it('heaps upward at the centre of the receiving bulb', () => {
    const d = lowerPath(70, 88, 50);
    const { c, end } = control(d);
    expect(c).toBeLessThan(end);
    expect(qy(end, c, end, 0.5)).toBeLessThan(end);
  });

  it('peaks at exactly the depth the comment claims', () => {
    // "the control point is twice the depth, so the apex sits at y ∓ d".
    const surface = 70;
    const d = lowerPath(surface, 88, 50);
    const { c, end } = control(d);
    const depth = (end - c) / 2;
    expect(qy(end, c, end, 0.5)).toBeCloseTo(end - depth, 10);
    expect(moundPeak(surface, 88, 50)).toBeCloseTo(end - depth, 10);
  });

  it('never cuts a dip deeper than the sand it is cut into', () => {
    // A funnel through the floor of its own heap would show as a notch in the
    // neck. Walk the whole day rather than spot-checking.
    for (let i = 0; i <= 100; i++) {
      const at = i / 100;
      const top = 12 + (50 - 12) * at;
      const { c, end } = control(upperPath(top, 12, 50));
      const apex = qy(end, c, end, 0.5);
      expect(apex).toBeLessThanOrEqual(50 + 1e-9);
    }
  });

  it('keeps the heap inside its bulb all day', () => {
    for (let i = 0; i <= 100; i++) {
      const at = i / 100;
      const bottom = 88 - (88 - 50) * at;
      expect(moundPeak(bottom, 88, 50)).toBeGreaterThanOrEqual(50 - 1e-9);
    }
  });
});

/*
 * Midnight, which is the one moment this clock has to mark and the one nobody
 * can sit and wait for.
 */
describe('the turn of the day', () => {
  it('fires when the fraction rolls over', () => {
    expect(turned(0.999, 0.001)).toBe(true);
    expect(turned(0.9, 0.02)).toBe(true);
  });

  it('does not fire on ordinary forward time', () => {
    expect(turned(0.1, 0.2)).toBe(false);
    expect(turned(0.5, 0.5001)).toBe(false);
    expect(turned(0.99, 0.995)).toBe(false);
  });

  it('does not fire on a small backward step', () => {
    // Clocks are re-read, not accumulated, so a reading can land marginally
    // behind the last one. That is not a new day.
    expect(turned(0.6, 0.5999)).toBe(false);
    expect(turned(0.3, 0.1)).toBe(false);
  });

  it('never fires twice for one midnight', () => {
    // The tick stores what it read, so the second reading after a rollover is
    // compared against the small number, not the large one.
    let previous = 0.998;
    const fired: number[] = [];
    for (const now of [0.999, 0.0004, 0.0009, 0.002]) {
      if (turned(previous, now)) fired.push(now);
      previous = now;
    }
    expect(fired).toEqual([0.0004]);
  });
});

/*
 * The continuous reading the sand runs on.
 */
describe('minuteProgress', () => {
  it('runs a full 0 to 1 within one in-world minute', () => {
    const t = Date.UTC(2026, 7, 28, 12);
    const half = 30_000 / RATE;   // half an in-world minute in real ms
    const a = minuteProgress(t);
    const b = minuteProgress(t + half);
    // Half a minute later it is half a turn further on, wrapping if it passed
    // the end. Either way it MOVED, and by a lot.
    expect(Math.abs(b - a)).toBeGreaterThan(0.3);
  });

  it('moves visibly between two readings a second apart', () => {
    // The whole point of the change. A day's reading moves 0.00002 in a
    // second; this moves a thirtieth of the glass.
    const t = Date.UTC(2026, 7, 28, 12);
    const step = Math.abs(minuteProgress(t + 1000) - minuteProgress(t));
    expect(step).toBeGreaterThan(0.02);
  });

  it('stays inside its bounds', () => {
    for (let i = 0; i < 2000; i++) {
      const p = minuteProgress(Date.UTC(2026, 0, 1) + i * 997);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('agrees with the clock about when a minute begins', () => {
    // At the instant reckon() shows a new minute, the glass has just turned.
    for (let i = 0; i < 400; i++) {
      const t = Date.UTC(2026, 7, 28) + i * 3_137;
      const before = reckon(t - 1).minute;
      if (reckon(t).minute !== before) expect(minuteProgress(t)).toBeLessThan(0.06);
    }
  });
});

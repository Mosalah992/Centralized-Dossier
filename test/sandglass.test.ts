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
import { upperPath, lowerPath, moundPeak } from '../web/src/views/Honors';

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

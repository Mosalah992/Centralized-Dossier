import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CURVES, D, STAGGER } from '../web/src/motion';

/**
 * The archive moves on four curves, and the numbers live in two places because
 * they have to: GSAP cannot read a CSS custom property, and CLAUDE.md is
 * explicit that the `.css` files stay authoritative for presentation, so
 * TypeScript may not write tokens onto `:root` either.
 *
 * Two copies of a number is a bug waiting for someone to change one of them.
 * The answer is to put the shared fact somewhere a test can see both halves and
 * fail loudly when they stop agreeing. (test/middleware.test.ts did the same
 * for the gate's PUBLIC_PATHS, until there was no longer a boundary to guard.)
 *
 * If you are here because one of these failed, you have changed a curve in one
 * file and not the other. Change both, in the same commit, or the book hover
 * (CSS) and the shelf entrance (GSAP) will move differently on the same screen.
 */

const BASE = readFileSync(new URL('../web/src/styles/base.css', import.meta.url), 'utf8');

/** `cubic-bezier(0.22, 0.61, 0.36, 1)` as base.css actually writes it. */
const cssForm = (points: readonly number[]) => `cubic-bezier(${points.join(', ')})`;

describe('the motion language', () => {
  it('declares every GSAP curve as a CSS token, verbatim', () => {
    for (const [name, points] of Object.entries(CURVES)) {
      expect(BASE, `curve "${name}" is in motion.ts but not in base.css`)
        .toContain(cssForm(points));
    }
  });

  /* `--ease` is the odd one out on purpose — it predates the set and is named
     in nine rules across five stylesheets. The other three take the -swing,
     -break and -shut suffixes. */
  it('names the three new tokens where CSS can reach them', () => {
    expect(BASE).toContain('--ease-swing:');
    expect(BASE).toContain('--ease-break:');
    expect(BASE).toContain('--ease-shut:');
    expect(BASE).toContain('--ease:');
  });

  /* Heavy hinged objects do not recoil. A control point outside 0..1 on the Y
     axis is what produces overshoot, and there is no object in this archive
     that should have any. */
  it('holds no curve that overshoots', () => {
    for (const [name, [, y1, , y2]] of Object.entries(CURVES)) {
      expect(y1, `${name} overshoots on its first control point`).toBeGreaterThanOrEqual(0);
      expect(y1, `${name} overshoots on its first control point`).toBeLessThanOrEqual(1);
      expect(y2, `${name} overshoots on its second control point`).toBeGreaterThanOrEqual(0);
      expect(y2, `${name} overshoots on its second control point`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the durations ordered, so the names stay meaningful', () => {
    const order = [D.leaf, D.hand, D.page, D.board, D.ceremony];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  /* `amount` caps the total spread, which is the whole reason these exist as
     named rhythms rather than per-view Math.min clamps. A stagger without one
     takes time proportional to the list, and the Ledger's list is 128 long. */
  it('caps the staggers that run over long registers', () => {
    expect(STAGGER.roll.amount).toBeLessThanOrEqual(0.6);
    expect(STAGGER.weave.amount).toBeLessThanOrEqual(0.6);
  });
});

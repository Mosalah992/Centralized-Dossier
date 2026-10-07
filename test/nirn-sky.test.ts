import { describe, expect, it } from 'vitest';

import { LIVE_MIN_WIDTH, chooseSkyMode } from '../web/src/sky/skyMode';

const desktop = { reducedMotion: false, coarsePointer: false, width: 1280, webgl: true };

describe('Nirn sky mode', () => {
  it('runs the live scene on a wide, fine-pointer screen with WebGL', () => {
    expect(chooseSkyMode(desktop)).toBe('live');
  });

  it('gives reduced-motion readers the still plate', () => {
    expect(chooseSkyMode({ ...desktop, reducedMotion: true })).toBe('still');
  });

  it('gives touch devices the still plate', () => {
    expect(chooseSkyMode({ ...desktop, coarsePointer: true })).toBe('still');
  });

  it('falls back to the still plate without WebGL', () => {
    expect(chooseSkyMode({ ...desktop, webgl: false })).toBe('still');
  });

  it('gives the single-column layout the still plate rather than a blank sky', () => {
    expect(chooseSkyMode({ ...desktop, width: LIVE_MIN_WIDTH - 1 })).toBe('still');
    expect(chooseSkyMode({ ...desktop, width: 360, coarsePointer: true })).toBe('still');
    expect(chooseSkyMode({ ...desktop, width: LIVE_MIN_WIDTH })).toBe('live');
  });
});

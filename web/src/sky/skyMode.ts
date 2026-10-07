// Which version of the Nirn sky a reader gets behind the portrait gate.
//
// The live scene renders a procedural planet per pixel with bloom and
// multisampling. That is fine on a desktop GPU and a poor trade on a phone
// battery, and it is motion, so reduced-motion readers get the still plate.
// Kept pure so the decision is testable without a browser.

export type SkyMode = 'live' | 'still';

export interface SkyConditions {
  reducedMotion: boolean;
  /** Width of the gate in CSS pixels. Below the single-column breakpoint the still plate is laid out for a phone. */
  width: number;
  coarsePointer: boolean;
  webgl: boolean;
}

export const LIVE_MIN_WIDTH = 721;

export function chooseSkyMode(c: SkyConditions): SkyMode {
  if (c.width < LIVE_MIN_WIDTH || c.reducedMotion || c.coarsePointer || !c.webgl) return 'still';
  return 'live';
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    // three.js now requires WebGL2.
    const gl = canvas.getContext('webgl2');
    // Release the probe context at once; browsers cap live contexts per page.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

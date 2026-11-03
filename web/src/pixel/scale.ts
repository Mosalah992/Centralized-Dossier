// How large the pixel room is drawn: the largest whole number of DEVICE pixels
// per art pixel at which the core (layout.ts) still fits the window. A whole
// number of device pixels is what keeps every art pixel square and sharp; any
// other scale would smear some of them across two.
//
// The result is written to the room as CSS variables (--px, the size of one
// art pixel in CSS pixels; --stage-x and --stage-y, where the master picture's
// corner falls) and a data-layout attribute: "stage" for the one-screen room,
// "stack" where the window is too narrow or too small for it, which lays the
// same sprites out one under another (room.css).

import { useLayoutEffect, type RefObject } from 'react';

import { CORE, MASTER } from './layout';

export interface PixelStage {
  /** Device pixels per art pixel. */
  k: number;
  /** CSS pixels per art pixel. */
  px: number;
  /** Where the master picture's top left corner falls, in CSS pixels. */
  left: number;
  top: number;
  /** Whether the one-screen room fits; otherwise the room stacks. */
  stage: boolean;
}

/** Below this many CSS pixels to the art pixel, the room's lettering is too small to read. */
const MIN_STAGE_PX = 2.5;

export function pixelScale(width: number, height: number, dpr: number): PixelStage {
  const k = Math.max(1, Math.floor(Math.min((height * dpr) / CORE.height, (width * dpr) / CORE.width)));
  const px = k / dpr;
  // The core's centre on the window's centre, snapped to a whole device pixel.
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  return {
    k,
    px,
    left: snap(width / 2 - MASTER.originX * px),
    top: snap(height / 2 - (MASTER.originY + CORE.height / 2) * px),
    stage: width > height && px >= MIN_STAGE_PX,
  };
}

/**
 * The stacked room's scale: whole device pixels again, sized so the widest
 * sprite in the stack (the board, 116 art pixels) fills the column.
 */
export function stackScale(width: number, dpr: number): number {
  return Math.max(1, Math.floor((width * dpr) / 120)) / dpr;
}

/**
 * The stack's Ancarion, larger than the rest: his frame (64 art pixels) at
 * most four fifths of the column, and he and his plate (90) at most a little
 * over half the window's height, so a tablet does not see him alone.
 */
export function heroScale(width: number, height: number, dpr: number): number {
  return Math.max(1, Math.floor(Math.min((width * dpr) / 80, (height * dpr * 0.55) / 90))) / dpr;
}

/**
 * The art pixel for every page outside the room (the volumes, the takeovers,
 * the Gallery, the Solar's controls): whole device pixels again, 2 CSS pixels
 * on a laptop, 3 on a 1080p screen, 4 at most, so frames and plaques stay
 * chunky without crowding the words they hold.
 */
export function pagePixel(width: number, dpr: number): number {
  const k = Math.floor((width * dpr) / 560);
  return Math.min(Math.floor(4 * dpr), Math.max(Math.ceil(2 * dpr), k)) / dpr;
}

/**
 * Keeps `--px` on the document current for the pages outside the room. The
 * room sets its own on its element (usePixelStage), which wins inside it;
 * takeovers are portalled to <body> and so take this one.
 */
export function usePagePixel() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let density: MediaQueryList | null = null;
    const measure = () => root.style.setProperty('--px', `${pagePixel(root.clientWidth, window.devicePixelRatio || 1)}px`);
    const watchDensity = () => {
      density?.removeEventListener('change', onDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      density.addEventListener('change', onDensity);
    };
    function onDensity() {
      measure();
      watchDensity();
    }
    measure();
    watchDensity();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      density?.removeEventListener('change', onDensity);
    };
  }, []);
}

/** Keeps the room's scale current as the window or its pixel density changes. */
export function usePixelStage(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let density: MediaQueryList | null = null;

    const measure = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = document.documentElement.clientWidth;
      const next = pixelScale(width, window.innerHeight, dpr);
      const column = el.parentElement?.clientWidth ?? width;
      const px = next.stage ? next.px : stackScale(column, dpr);
      el.style.setProperty('--px', `${px}px`);
      el.style.setProperty('--px-hero', `${next.stage ? px : Math.max(px, heroScale(column, window.innerHeight, dpr))}px`);
      el.style.setProperty('--room-w', `${width}px`);
      el.style.setProperty('--stage-x', `${next.left}px`);
      el.style.setProperty('--stage-y', `${next.top}px`);
      el.dataset.layout = next.stage ? 'stage' : 'stack';
    };
    // A change of zoom or screen changes the pixel density without always
    // resizing the window.
    const watchDensity = () => {
      density?.removeEventListener('change', onDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      density.addEventListener('change', onDensity);
    };
    function onDensity() {
      measure();
      watchDensity();
    }

    // The master picture's size and where the core's origin falls in it,
    // from the one place they are set (layout.ts).
    el.style.setProperty('--master-w', String(MASTER.width));
    el.style.setProperty('--master-h', String(MASTER.height));
    el.style.setProperty('--origin-x', String(MASTER.originX));
    el.style.setProperty('--origin-y', String(MASTER.originY));
    measure();
    watchDensity();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      density?.removeEventListener('change', onDensity);
    };
  }, [ref]);
}

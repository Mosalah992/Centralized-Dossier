// A candle beside the Scribe Table: the painted candle and holder, with its
// flame drawn live in three.js (candle-flame.ts) once the room is up. Until
// then, and for a reader who asks for less motion, a browser without WebGL or
// a chunk that fails to arrive, the painted flame burns still in its place.
//
// Decoration only: hidden from assistive technology and from the pointer.

import { useEffect, useRef, useState } from 'react';

import body1x from '../assets/candle/candle.webp';
import body2x from '../assets/candle/candle@2x.webp';
import still1x from '../assets/candle/candle-flame.webp';
import still2x from '../assets/candle/candle-flame@2x.webp';

function canDrawLive(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

/** After the room has painted and the browser has a moment. */
function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(fn, 600);
  return () => globalThis.clearTimeout(id);
}

export function Candle({ side }: { side: 'l' | 'r' }) {
  const root = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!canDrawLive()) return;
    let flame: import('./candle-flame').Flame | null = null;
    let gone = false;
    let onScreen = true;
    const run = () => flame?.setRunning(onScreen && !document.hidden);

    const cancelIdle = whenIdle(() => {
      void import('./candle-flame')
        .then(({ lightFlame }) => {
          if (gone || !canvas.current) return;
          flame = lightFlame(canvas.current, {
            seed: side === 'l' ? 0.31 : 0.77,
            onGlow: (value) => root.current?.style.setProperty('--glow', value.toFixed(3)),
          });
          setLive(true);
          run();
        })
        .catch(() => undefined);
    });

    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      run();
    });
    if (root.current) seen.observe(root.current);
    document.addEventListener('visibilitychange', run);

    return () => {
      gone = true;
      cancelIdle();
      seen.disconnect();
      document.removeEventListener('visibilitychange', run);
      flame?.dispose();
    };
  }, [side]);

  return (
    <span ref={root} className={`candle candle--${side}`} data-live={live || undefined} aria-hidden="true">
      <span className="candle__glow" />
      <img className="candle__still" src={still1x} srcSet={`${still1x} 1x, ${still2x} 2x`} alt="" decoding="async" />
      <canvas ref={canvas} className="candle__flame" />
      <img className="candle__body" src={body1x} srcSet={`${body1x} 1x, ${body2x} 2x`} alt="" decoding="async" />
    </span>
  );
}

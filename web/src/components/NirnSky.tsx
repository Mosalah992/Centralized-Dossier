// Nirn, Masser and Secunda behind the portrait gate ("beside the portrait").
//
// three.js is imported dynamically from here, so it lands in its own chunk and
// only readers who reach a gate that asks for the sky download it. Phones,
// reduced-motion readers, narrow screens and browsers without WebGL get the
// still plate built from the calendar's mundus art; in the single-column
// layout it shrinks the bodies to the edges so none sits behind the form.

import { useEffect, useRef, useState } from 'react';

import amberUrl from '../assets/mundus/amber.webp';
import ashUrl from '../assets/mundus/ash.webp';
import azureUrl from '../assets/mundus/azure.webp';
import cinderUrl from '../assets/mundus/cinder.webp';
import magnusUrl from '../assets/mundus/magnus.webp';
import masserUrl from '../assets/mundus/masser.webp';
import nirnUrl from '../assets/mundus/nirn.webp';
import paleUrl from '../assets/mundus/pale.webp';
import roseUrl from '../assets/mundus/rose.webp';
import rustUrl from '../assets/mundus/rust.webp';
import secundaUrl from '../assets/mundus/secunda.webp';
import verdantUrl from '../assets/mundus/verdant.webp';
import { chooseSkyMode, hasWebGL, type SkyMode } from '../sky/skyMode';
import '../styles/nirn-sky.css';

/**
 * Magnus, then the eight Divine planets in the orrery's order — Akatosh,
 * Arkay, Dibella, Julianos, Kynareth, Mara, Stendarr, Zenithar — with the same
 * sprites the calendar's orrery draws them with (see Orrery.tsx).
 */
const DISTANT = [magnusUrl, rustUrl, verdantUrl, roseUrl, ashUrl, azureUrl, paleUrl, cinderUrl, amberUrl] as const;

export function NirnSky() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<SkyMode | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const webgl = hasWebGL();
    const decide = () =>
      setMode(chooseSkyMode({
        reducedMotion: reduced.matches,
        coarsePointer: coarse.matches,
        width: el.clientWidth,
        webgl,
      }));
    decide();
    const ro = new ResizeObserver(decide);
    ro.observe(el);
    reduced.addEventListener('change', decide);
    return () => {
      ro.disconnect();
      reduced.removeEventListener('change', decide);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'live' || !host.current || !canvas.current) return;
    let disposed = false;
    let scene: { dispose(): void } | null = null;
    const h = host.current;
    const c = canvas.current;
    import('../sky/nirnScene')
      .then(({ createNirnScene }) => {
        if (disposed) return;
        scene = createNirnScene({ host: h, canvas: c, masserUrl, secundaUrl, distantUrls: DISTANT });
        h.dataset.ready = 'true';
      })
      .catch(() => {
        if (!disposed) setMode('still');
      });
    return () => {
      disposed = true;
      scene?.dispose();
      delete h.dataset.ready;
    };
  }, [mode]);

  return (
    <div ref={host} className="nirn-sky" data-mode={mode ?? 'pending'} aria-hidden="true">
      {mode === 'live' && <canvas ref={canvas} className="nirn-sky__canvas" />}
      {mode === 'still' && (
        <div className="nirn-sky__still">
          <img className="nirn-sky__nirn" src={nirnUrl} alt="" />
          <img className="nirn-sky__masser" src={masserUrl} alt="" />
          <img className="nirn-sky__secunda" src={secundaUrl} alt="" />
          {DISTANT.map((url, i) => (
            <img key={url} className={`nirn-sky__far nirn-sky__far--${i}`} src={url} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}

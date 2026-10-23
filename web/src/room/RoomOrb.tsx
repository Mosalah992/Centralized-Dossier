// The orrery, turned into a glass globe held in a brass cradle beside the
// room's clock: the Wheel of Mundus turning inside a globe that itself turns
// slowly on its stand, with the two moons' phases lettered beneath. An
// instrument, not a door: the Calendar it once opened was retired on
// 2026-10-20, so the globe reads the sky and leads nowhere. (Its brass rings
// came off on 2026-10-23; only the cradle holds it now.)
//
// THE WHEEL IS THE CALENDAR'S OWN, not a copy: the Orrery component, imported
// lazily, so anime.js stays in a chunk of its own and out of both the entry
// chunk and the room's (CODEX invariant 7).

import { Suspense, lazy, useEffect, useState } from 'react';

import { phases } from '../../../shared/mundus';
import '../styles/orb.css';

const Orrery = lazy(() => import('../components/Orrery').then((m) => ({ default: m.Orrery })));

export function RoomOrb() {
  // Phases change once every three in-world days; a minute's tick is plenty.
  const [moons, setMoons] = useState(() => phases());
  useEffect(() => {
    const id = window.setInterval(() => setMoons(phases()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <figure className="orb" aria-label={`The Orrery. Masser is ${moons.masser.name}; Secunda is ${moons.secunda.name}.`}>
      <span className="orb__sphere" aria-hidden="true">
        <span className="orb__glass">
          <span className="orb__sky" />
          <Suspense fallback={null}>
            <Orrery bare />
          </Suspense>
          <span className="orb__meridian" />
          <span className="orb__meridian orb__meridian--late" />
        </span>
        <span className="orb__shade" />
        <span className="orb__shine" />
      </span>
      {/* The cradle: a cup that holds the globe from beneath, on a stem and a foot. */}
      <svg className="orb__stand" viewBox="0 0 120 52" aria-hidden="true">
        <path d="M18 2c6 14 22 22 42 22s36-8 42-22c-2 15-18 27-42 27S20 17 18 2z" fill="#8a6d1c" />
        <path d="M24 6c8 10 21 15 36 15s28-5 36-15" fill="none" stroke="#e8cd7a" strokeWidth="1.1" opacity=".8" />
        <path d="M54 28h12l2 12H52z" fill="#6e5410" />
        <path d="M51 34h18" stroke="#c9a227" strokeWidth="1.4" />
        <path d="M30 40h60l8 10H22z" fill="#8a6d1c" />
        <path d="M22 50h76" stroke="#c9a227" strokeWidth="1.4" />
      </svg>
      <figcaption className="orb__moons" aria-hidden="true">
        <span><b>Masser</b> {moons.masser.name}</span>
        <span><b>Secunda</b> {moons.secunda.name}</span>
      </figcaption>
    </figure>
  );
}

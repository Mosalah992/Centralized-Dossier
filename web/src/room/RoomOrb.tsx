// The orrery, turned into a brass orb on a stand beside the room's clock: the
// Wheel of Mundus seen through a glass sphere, with the two moons' phases
// lettered on its stand. An instrument, not a door: the Calendar it once opened
// was retired on 2026-10-20, so the orb reads the sky and leads nowhere.
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
          <Suspense fallback={null}>
            <Orrery bare />
          </Suspense>
        </span>
        <span className="orb__band" />
        <span className="orb__shine" />
      </span>
      <svg className="orb__stand" viewBox="0 0 120 46" aria-hidden="true">
        <path d="M54 0h12l4 22H50z" fill="#8a6d1c" />
        <path d="M40 22h40l6 10H34z" fill="#c9a227" />
        <path d="M22 32h76l8 12H14z" fill="#8a6d1c" />
        <path d="M14 44h92" stroke="#e8cd7a" strokeWidth="1.4" />
      </svg>
      <figcaption className="orb__moons" aria-hidden="true">
        <span><b>Masser</b> {moons.masser.name}</span>
        <span><b>Secunda</b> {moons.secunda.name}</span>
      </figcaption>
    </figure>
  );
}

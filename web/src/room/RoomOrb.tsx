// The orrery, a glass globe on the Cabinet beside the room's clock: the Wheel
// of Mundus turning inside a globe that itself turns slowly. An instrument,
// not a door: the Calendar it once opened was retired on 2026-10-20, so the
// globe reads the sky and leads nowhere. Its brass rings came off on
// 2026-10-23. When the room was redrawn in pixels (2026-11-02) the globe
// stayed as it was, set in a cradle drawn with the room; the two moons' phases
// are lettered on the clock's plate (RoomClock.tsx).
//
// THE WHEEL IS THE CALENDAR'S OWN, not a copy: the Orrery component, imported
// lazily, so anime.js stays in a chunk of its own and out of both the entry
// chunk and the room's (CODEX invariant 7).

import { Suspense, lazy } from 'react';

import stand from '../assets/pixel/globe-stand.png';
import { PLACES } from '../pixel/layout';
import { at } from '../pixel/place';
import { Sprite } from '../pixel/Sprite';
import '../styles/orb.css';

const Orrery = lazy(() => import('../components/Orrery').then((m) => ({ default: m.Orrery })));

export function RoomOrb() {
  return (
    <figure className="orb px-at" style={at(PLACES.globe)} aria-label="The Orrery: the Wheel of Mundus turning in glass.">
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
      {/* The cradle, drawn with the room: a cup that holds the globe from beneath, on a stem and a foot. */}
      <Sprite src={stand} className="orb__stand" />
    </figure>
  );
}

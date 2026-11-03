// The hour in the realm, and the two moons, lettered on a gold plate above
// the globe.

import { useEffect, useState } from 'react';

import plateArt from '../assets/pixel/clock.png';
import { PANELS } from '../pixel/layout';
import { at } from '../pixel/place';
import { Sprite } from '../pixel/Sprite';
import { phases } from '../../../shared/mundus';
import { RATE, reckon } from '../../../shared/reckoning';
import { plateReading } from './clock-format';

/** One in-world minute, in real milliseconds. */
const IN_WORLD_MINUTE_MS = 60_000 / RATE;

export function RoomClock() {
  const [now, setNow] = useState(() => reckon());
  // Phases change once every three in-world days; a minute's tick is plenty.
  const [moons, setMoons] = useState(() => phases());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(reckon()), IN_WORLD_MINUTE_MS);
    const sky = window.setInterval(() => setMoons(phases()), 60_000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(sky);
    };
  }, []);

  const reading = plateReading(now);
  return (
    <section className="room-clock px-at" style={at(PANELS.clock)} aria-label="The hour in the realm">
      <Sprite src={plateArt} className="room-clock__plate" />
      <div className="room-clock__text">
        <p className="room-clock__date">
          {reading.date}, {reading.era}
        </p>
        <p className="room-clock__time" aria-live="off">
          {reading.clock}
          <span className="room-clock__meridiem">{reading.meridiem}</span>
        </p>
        <p className="room-clock__moons">
          <span>Masser {moons.masser.name}</span>
          <span>Secunda {moons.secunda.name}</span>
        </p>
      </div>
    </section>
  );
}

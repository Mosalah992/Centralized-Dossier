// The hour in the realm, lettered on a gold plate above the orb.

import { useEffect, useState } from 'react';

import { RATE, reckon } from '../../../shared/reckoning';
import { plateReading } from './clock-format';

/** One in-world minute, in real milliseconds. */
const IN_WORLD_MINUTE_MS = 60_000 / RATE;

export function RoomClock() {
  const [now, setNow] = useState(() => reckon());

  useEffect(() => {
    const id = window.setInterval(() => setNow(reckon()), IN_WORLD_MINUTE_MS);
    return () => window.clearInterval(id);
  }, []);

  const reading = plateReading(now);
  return (
    <section className="room-clock" aria-label="The hour in the realm">
      <p className="room-clock__eyebrow">The hour in the realm</p>
      <p className="room-clock__date">{reading.date}</p>
      <p className="room-clock__era">{reading.era}</p>
      <p className="room-clock__time" aria-live="off">
        {reading.clock}
        <span className="room-clock__meridiem">{reading.meridiem}</span>
      </p>
    </section>
  );
}

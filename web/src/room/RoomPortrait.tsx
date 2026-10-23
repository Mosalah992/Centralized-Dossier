// Ancarion on the room's wall: the same performer as the gates (useAncarion),
// in the same frame. He keeps the Solar: pressing his portrait goes through
// for a reader who holds its writ, and the plate beneath him, where his name
// once hung, takes the word from one who does not (SolarPlate.tsx). The plate
// directs him through the handle below; nothing he does here authorizes
// anything.
//
// THE PORTRAIT IS THE SOLAR'S DOOR (2026-10-23). Once he lets the reader
// through, the painting swings open on its hinge onto a dim glimpse of the
// Solar beyond, and the scene goes through the opening (transitions.ts,
// "through"). Coming back out of the Solar the reader arrives through the same
// opening and the painting swings shut behind them.

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import frame from '../assets/portrait-frame.png';
import glimpse from '../assets/solar/realm-map-glimpse.webp';
import { useAncarion, type Refusal } from '../components/useAncarion';
import { setDoorway } from '../transitions';

/** How long the painting takes to swing; the scene goes through before it is fully open. */
export const DOOR_SWING_OPEN_MS = 1000;

export interface AncarionHandle {
  notice(): void;
  settle(): void;
  consult(): void;
  react(reaction: Refusal): void;
  /** Plays the acceptance; true when there is a performance to hold for. */
  accept(): boolean;
  rest(): void;
  warm(): void;
  reducedMotion(): boolean;
  /** Swings the painting open on its hinge, onto the Solar beyond. */
  openDoor(): void;
}

interface Props {
  /** Whether the reader is at the plate's field, which he turns towards. */
  isAttending: () => boolean;
  /** The portrait was pressed. */
  onSummon: () => void;
  /** A reader drawing near the portrait. */
  onApproach: () => void;
  /** The plate beneath him. */
  children: ReactNode;
}

export const RoomPortrait = forwardRef<AncarionHandle, Props>(function RoomPortrait(
  { isAttending, onSummon, onApproach, children },
  ref,
) {
  const root = useRef<HTMLElement>(null);
  const doorway = useRef<HTMLDivElement>(null);
  const ancarion = useAncarion({ scope: root, isAttending, preload: 'deferred' });

  // Back from the Solar, the painting hangs open as the reader comes through
  // it, and swings shut behind them. The scene change is already under way
  // when the room is drawn, and says which way it goes (transitions.ts).
  const [door, setDoor] = useState<'shut' | 'open'>(() =>
    document.documentElement.dataset.nav === 'return' ? 'open' : 'shut',
  );
  const returning = useRef(door === 'open');
  // A layout effect, so the doorway is marked before the scene change starts
  // to animate the room in through it.
  useLayoutEffect(() => {
    if (!returning.current) return;
    setDoorway(doorway.current);
    const shut = window.setTimeout(() => setDoor('shut'), 750);
    return () => window.clearTimeout(shut);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      notice: ancarion.notice,
      settle: ancarion.settle,
      consult: ancarion.consult,
      react: ancarion.react,
      accept: ancarion.accept,
      rest: ancarion.rest,
      warm: ancarion.warm,
      reducedMotion: () => ancarion.reducedMotion,
      openDoor: () => {
        setDoorway(doorway.current);
        setDoor('open');
      },
    }),
    [ancarion],
  );

  return (
    <figure ref={root} className="room-portrait" data-state={ancarion.portraitState} data-door={door}>
      <div ref={doorway} className="room-portrait__doorway">
        {/* What the painting hides: a dim glimpse of the Solar beyond, its war
            table with the realm map laid on it, and its furniture in the dark
            at either side, by low candlelight. */}
        <span className="room-portrait__passage" aria-hidden="true" style={{ ['--glimpse' as string]: `url(${glimpse})` }}>
          <span className="room-portrait__table" />
          <span className="room-portrait__furniture room-portrait__furniture--l" />
          <span className="room-portrait__furniture room-portrait__furniture--r" />
        </span>
        <button
          type="button"
          className="room-portrait__stage"
          data-object="ancarion"
          aria-label="Ancarion, keeper of the Solar. Speak the word at his plate to enter."
          onClick={onSummon}
          onPointerEnter={onApproach}
          onFocus={onApproach}
        >
          <span className="portrait-gate__aperture" aria-hidden="true">
            {ancarion.media}
          </span>
          <img className="portrait-gate__frame" src={frame} alt="" />
        </button>
      </div>
      {ancarion.voice}
      <figcaption className="room-portrait__caption">{children}</figcaption>
    </figure>
  );
});

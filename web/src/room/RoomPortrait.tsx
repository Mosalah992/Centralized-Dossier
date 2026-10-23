// Ancarion on the room's wall: the same performer as the gates (useAncarion),
// in the same frame. He keeps the Solar: pressing his portrait goes through
// for a reader who holds its writ, and the plate beneath him, where his name
// once hung, takes the word from one who does not (SolarPlate.tsx). The plate
// directs him through the handle below; nothing he does here authorizes
// anything.

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';

import frame from '../assets/portrait-frame.png';
import { useAncarion, type Refusal } from '../components/useAncarion';

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
  const ancarion = useAncarion({ scope: root, isAttending, preload: 'deferred' });

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
    }),
    [ancarion],
  );

  return (
    <figure ref={root} className="room-portrait" data-state={ancarion.portraitState}>
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
      {ancarion.voice}
      <figcaption className="room-portrait__caption">{children}</figcaption>
    </figure>
  );
});

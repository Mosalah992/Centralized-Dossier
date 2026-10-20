// Ancarion on the room's wall: the same performer as the gates (useAncarion),
// in the same frame, with no door of his own. The Scroll Rack directs him
// through the handle below; nothing he does here authorizes anything.

import { forwardRef, useImperativeHandle, useRef } from 'react';

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
  /** Whether the reader is at the rack's field, which he turns towards. */
  isAttending: () => boolean;
}

export const RoomPortrait = forwardRef<AncarionHandle, Props>(function RoomPortrait({ isAttending }, ref) {
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
      <div className="room-portrait__stage" aria-hidden="true">
        <div className="portrait-gate__aperture">{ancarion.media}</div>
        <img className="portrait-gate__frame" src={frame} alt="" />
      </div>
      {ancarion.voice}
      <figcaption className="room-portrait__caption">
        <span className="plaque">Ancarion</span>
        <span className="sr-only">Keeper of the Scroll Rack. He answers for the word that opens it.</span>
      </figcaption>
    </figure>
  );
});

// One of the room's drawn sprites (scripts/build-pixels.mjs), shown at the
// room's whole-pixel scale. An animated sprite is a strip of frames, run
// through a window one frame wide (room.css, .sprite--strip); a reader who
// asks for less motion sees its first frame, still.

import type { CSSProperties } from 'react';

interface Props {
  src: string;
  /** Frames in the strip; 1 for a still sprite. */
  frames?: number;
  className?: string;
}

export function Sprite({ src, frames = 1, className = '' }: Props) {
  if (frames === 1) return <img className={`sprite ${className}`} src={src} alt="" draggable={false} />;
  return (
    <span className={`sprite sprite--strip ${className}`} style={{ '--frames': frames } as CSSProperties} aria-hidden="true">
      <img src={src} alt="" draggable={false} />
    </span>
  );
}

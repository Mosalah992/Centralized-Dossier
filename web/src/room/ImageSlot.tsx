// A place for painted art. The room is drawn in SVG for now; when a painting
// of an object is ready, drop it at web/src/assets/room/{name}.webp and rebuild
// — it replaces the drawing with no code change.
//
// Found at BUILD time through import.meta.glob, not fetched at runtime as the
// Bruma room does. A runtime probe for art that does not exist yet costs every
// visitor a request per object, and Pages answers a missing file with
// index.html, so each probe downloads the app shell to learn nothing. A glob
// over a folder with nothing in it costs nothing at all.

import { useState, type ReactNode } from 'react';

const PAINTED = import.meta.glob<string>('../assets/room/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** The painted art for `name`, if any has been supplied. */
export function paintedArt(name: string): string | undefined {
  return PAINTED[`../assets/room/${name}.webp`];
}

export function ImageSlot({ name, alt = '', className = '', children }: { name: string; alt?: string; className?: string; children: ReactNode }) {
  const src = paintedArt(name);
  const [failed, setFailed] = useState(false);
  return (
    <span className={`slot ${className}`} data-slot={name}>
      {src && !failed ? (
        <img src={src} alt={alt} className="slot__img" draggable={false} decoding="async" onError={() => setFailed(true)} />
      ) : (
        children
      )}
    </span>
  );
}

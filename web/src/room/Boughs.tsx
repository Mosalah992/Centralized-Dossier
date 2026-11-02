// Summerset boughs: a golden-leaved branch reaching in over each top corner of
// the room, framing the Embassy's name, as the First Emissary drew them
// (2026-10-22), redrawn in pixels with the room (2026-11-02). Decoration
// only: hidden from assistive technology, never in the way of a click, behind
// every object on the wall. The right-hand bough is the left one's mirror.

import left from '../assets/pixel/bough-l.png';
import right from '../assets/pixel/bough-r.png';
import { PLACES } from '../pixel/layout';
import { at } from '../pixel/place';
import { Sprite } from '../pixel/Sprite';

export function Boughs() {
  return (
    <div className="boughs" aria-hidden="true">
      <span className="bough px-at" style={at(PLACES.boughL)}>
        <Sprite src={left} />
      </span>
      <span className="bough px-at" style={at(PLACES.boughR)}>
        <Sprite src={right} />
      </span>
    </div>
  );
}

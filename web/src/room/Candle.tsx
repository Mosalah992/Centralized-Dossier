// A candle beside the Scribe Table: a gold floor candlestick, its flame drawn
// in four frames with the rest of the room (scripts/pixel/objects.mjs). It
// replaced the painted candle and its three.js flame on 2026-11-02. For a
// reader who asks for less motion the flame burns still (room.css).
//
// Decoration only: hidden from assistive technology and from the pointer.

import candle from '../assets/pixel/candle.png';
import { PLACES } from '../pixel/layout';
import { at } from '../pixel/place';
import { Sprite } from '../pixel/Sprite';

export function Candle({ side }: { side: 'l' | 'r' }) {
  return (
    <span className={`candle candle--${side} px-at`} style={at(side === 'l' ? PLACES.candleL : PLACES.candleR)} aria-hidden="true">
      <Sprite src={candle} frames={4} />
    </span>
  );
}

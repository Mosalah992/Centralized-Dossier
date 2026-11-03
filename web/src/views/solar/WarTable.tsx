// The war table: the realm map laid on it, the pieces standing where High
// Command set them. Pressed, the map is taken up and spread out (MapViewer).
// The table is drawn in pixels (scripts/pixel/solar.mjs); the map on it stays
// painted, laid in the dark bed of its top (WAR_TABLE.map), whole, so every
// piece stands where it stands on the spread map.

import tableArt from '../../assets/pixel/war-table.png';
import tableMap from '../../assets/solar/realm-map-table.webp';
import { PIN_INFO } from '../../../../shared/solar';
import { WAR_TABLE, type Place } from '../../pixel/layout';
import { at } from '../../pixel/place';
import { Sprite } from '../../pixel/Sprite';
import { PinMark } from './art';
import type { Pins } from './usePins';

const bed = WAR_TABLE.map;

export function WarTable({ pins, onOpen, place }: { pins: Pins; onOpen: () => void; place: Place }) {
  const count = pins.pins.length;
  return (
    <section className="war-table px-at" style={at(place)} aria-labelledby="war-table-title">
      <h2 id="war-table-title" className="sr-only">
        The Realm: Skyrim and County Bruma
      </h2>
      <button type="button" className="war-table__map" onClick={onOpen} data-solar="map">
        <Sprite src={tableArt} className="war-table__art" />
        <span
          className="war-table__sheet"
          style={{
            left: `calc(${bed.x} * var(--px))`,
            top: `calc(${bed.y} * var(--px))`,
            width: `calc(${bed.w} * var(--px))`,
            height: `calc(${bed.h} * var(--px))`,
          }}
        >
          <img src={tableMap} alt="" decoding="async" />
          {pins.pins.map((pin) => (
            <span
              key={pin.id}
              className="war-table__pin"
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              aria-hidden="true"
              title={`${PIN_INFO[pin.kind].name}: ${pin.label}`}
            >
              <PinMark kind={pin.kind} size={18} />
            </span>
          ))}
        </span>
        <span className="sr-only">
          Take up the map{count ? `: ${count} piece${count === 1 ? '' : 's'} set down` : ''}
        </span>
        <span className="war-table__invite plaque" aria-hidden="true">
          Take up the map
        </span>
      </button>
      {pins.status === 'error' && <p className="solar-quiet">The pieces could not be read. The map is still yours to open.</p>}
    </section>
  );
}

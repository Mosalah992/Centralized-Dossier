// The war table: the realm map laid on it, the pieces standing where High
// Command set them. Pressed, the map is taken up and spread out (MapViewer).

import tableMap from '../../assets/solar/realm-map-table.webp';
import { PIN_INFO } from '../../../../shared/solar';
import { PinMark } from './art';
import type { Pins } from './usePins';

export function WarTable({ pins, onOpen }: { pins: Pins; onOpen: () => void }) {
  const count = pins.pins.length;
  return (
    <section className="war-table" aria-labelledby="war-table-title">
      <h2 id="war-table-title" className="solar-heading">
        The Realm <span>Skyrim and County Bruma</span>
      </h2>
      <button type="button" className="war-table__map" onClick={onOpen} data-solar="map">
        <span className="war-table__sheet">
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
        <span className="war-table__invite" aria-hidden="true">
          Take up the map
        </span>
      </button>
      {pins.status === 'error' && <p className="solar-quiet">The pieces could not be read. The map is still yours to open.</p>}
    </section>
  );
}

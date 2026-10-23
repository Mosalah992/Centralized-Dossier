// The Solar's notes: every piece on the war table, by name, with what High
// Command wrote of it. A note opens the map on its piece.

import { PIN_INFO } from '../../../../shared/solar';
import { PinMark } from './art';
import type { Pins } from './usePins';

export function Notes({ pins, onOpen }: { pins: Pins; onOpen: (id: string) => void }) {
  const sorted = [...pins.pins].sort((a, b) => a.label.localeCompare(b.label));
  return (
    <section className="solar-notes parchment" aria-labelledby="solar-notes-title">
      <span className="pin" aria-hidden="true" />
      <h2 id="solar-notes-title" className="solar-notes__title">
        Notes
      </h2>
      {pins.status === 'loading' && <p className="solar-notes__empty">Reading the table…</p>}
      {pins.status !== 'loading' && sorted.length === 0 && (
        <p className="solar-notes__empty">
          Nothing is set down yet. Take up the map, choose a pawn or a point, and press where it stands.
        </p>
      )}
      {sorted.length > 0 && (
        <ul className="solar-notes__list">
          {sorted.map((pin) => (
            <li key={pin.id}>
              <button type="button" className="solar-notes__item" onClick={() => onOpen(pin.id)}>
                <PinMark kind={pin.kind} size={18} />
                <span className="solar-notes__text">
                  <span className="solar-notes__name">{pin.label}</span>
                  {pin.note && <span className="solar-notes__note">{pin.note}</span>}
                  <span className="sr-only">, {PIN_INFO[pin.kind].name}. Open on the map.</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

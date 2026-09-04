// The Register of Consultation, under the cabinet.
//
// A Thalmor archive keeping a note of who has come to read its records is not a
// widget bolted onto the fiction — it is the sort of thing this office would do
// anyway. So it is written as a register rather than as a hit counter, and the
// odometer underneath is the only place the 1999 joke shows.
//
// THE FLAGS ARE A SPRITE, NOT EMOJI. Regional-indicator pairs render as bare
// letters on Windows Chrome, which is the machine this archive is built on, so
// the keeper would see the broken version every day. `scripts/prepare-flags.mjs`
// cuts the supplied set down to one 16x11 strip instead — the size the counters
// of 1999 used — and this file moves a background-position down it. A country
// the strip does not carry simply shows no flag and keeps its name.

import type { CSSProperties } from 'react';

import { useRegister } from '../api';
import { flagRow } from '../flags';

/**
 * The province's name, from the runtime's own table.
 *
 * `Intl.DisplayNames` costs nothing to ship — no country list in the bundle,
 * which matters because this component is reached from Shelf.tsx and therefore
 * lands in the entry chunk that test/bundle.test.ts polices. The fallback is the
 * bare code, which is what an archive would write if it did not know the name.
 */
function provinceOf(code: string): string {
  if (code === 'XX') return 'Provinces unrecorded';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function Register() {
  const register = useRegister();

  // Nothing to say, so nothing is said: no binding, no table, nobody yet, or a
  // request that did not come back. See the note on useRegister.
  if (!register || register.total <= 0) return null;

  const { total, ordinal, countries } = register;

  // The reader is shown their own entry, so the odometer is not one behind the
  // person reading it. Five digits is optimism.
  const reading = String(ordinal ?? total).padStart(5, '0');

  return (
    <aside className="consult" aria-label="Register of Consultation">
      <p className="consult__head">Register of Consultation</p>

      <ol className="consult__list">
        {countries.map((c) => (
          <li className="consult__row" key={c.code}>
            {flagRow(c.code) !== null && (
              /* Decorative: the province is named in the text beside it, so a
                 screen reader gains nothing from the flag and would only hear
                 the same country twice. */
              <span
                className="consult__flag"
                style={{ '--row': flagRow(c.code) } as CSSProperties}
                aria-hidden
              />
            )}
            <span className="consult__province">{provinceOf(c.code)}</span>
            {/* The rule between name and figure is drawn, not typed: a row of
                dots would break differently at every width. */}
            <span className="consult__rule" aria-hidden />
            <span className="consult__count">{c.visits}</span>
          </li>
        ))}
      </ol>

      {/*
        * The odometer, digit by boxed digit — which is the one flourish the
        * period actually earns. A single number in a sunken box is a number; a
        * row of separately bevelled cells is a mechanical counter.
        */}
      <p className="consult__total">
        <span className="consult__label">
          {ordinal === null ? 'Readers recorded' : 'You are reader'}
        </span>
        <span className="consult__odometer">
          {reading.split('').map((digit, i) => (
            // Fixed-length string, so the index is a stable key.
            // eslint-disable-next-line react/no-array-index-key
            <span className="consult__digit" key={i}>{digit}</span>
          ))}
        </span>
      </p>

      <p className="consult__note">
        The Embassy records the province a reader arrives from and nothing else —
        no name, no address, no hour. Readers are counted once a day.
      </p>
    </aside>
  );
}

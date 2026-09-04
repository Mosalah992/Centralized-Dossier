// The Register of Consultation, under the cabinet.
//
// A Thalmor archive keeping a note of who has come to read its records is not a
// widget bolted onto the fiction — it is the sort of thing this office would do
// anyway. So it is written as a register rather than as a hit counter, and the
// odometer total underneath is the only place the 1999 joke shows.
//
// NO FLAGS, and that is two decisions rather than one. Emoji regional-indicator
// pairs render as bare letters on Windows Chrome — which is the machine this
// archive is built on, so the keeper would see the broken version every day. And
// a flag sprite would be new art with a new licensing question attached, for a
// block that reads better in the archive's own hand anyway: ruled rows, small
// capitals, province names rather than pictures.

import { useRegister } from '../api';

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

  return (
    <aside className="consult" aria-label="Register of Consultation">
      <p className="consult__head">Register of Consultation</p>

      <ol className="consult__list">
        {countries.map((c) => (
          <li className="consult__row" key={c.code}>
            <span className="consult__province">{provinceOf(c.code)}</span>
            {/* The rule between name and figure is drawn, not typed: a row of
                dots would break differently at every width. */}
            <span className="consult__rule" aria-hidden />
            <span className="consult__count">{c.visits}</span>
          </li>
        ))}
      </ol>

      {/*
        * The odometer. Padded to five, which is optimism, and the number a
        * reader is shown includes their own entry — the POST answers with the
        * tally as committed, so the count is not one behind the person reading
        * it.
        */}
      <p className="consult__total">
        {ordinal === null ? 'Readers recorded' : 'You are reader'}
        <span className="consult__odometer">
          {ordinal === null ? String(total).padStart(5, '0') : `#${String(ordinal).padStart(5, '0')}`}
        </span>
      </p>

      <p className="consult__note">
        The Embassy records the province a reader arrives from and nothing else —
        no name, no address, no hour. Readers are counted once a day.
      </p>
    </aside>
  );
}

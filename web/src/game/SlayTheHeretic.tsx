// Slay the Heretic — the shell.
//
// Owns the four screens the player moves between (menu, the Office, the
// chamber, and the pause card over it) and the only state that has to outlive
// any of them: the working being carried, the Office's last ruling, and the
// Register of Interest.
//
// THE REGISTER LIVES HERE rather than in the chamber, because it is the one
// number that has to survive walking out of the chamber and coming back. It is
// also the whole flavour payoff: a refused working can still be cast, every
// cast of one is entered, and at the third a Justiciar is dispatched. Nothing
// stops the player — the game simply remembers.
//
// NOTHING PERSISTS BEYOND THE TAB. There is no writeback anywhere in the
// archive: `server/` is readonly-scoped by invariant 2, and giving this game a
// save would mean standing up a database and write auth. Deliberately deferred,
// and the menu says so rather than letting a player discover it the hard way.

import { useCallback, useState } from 'react';

import {
  JUSTICIAR_AT,
  RANKS,
  type Ruling,
  type Working,
  registerNotice,
  ruleOn,
} from '../../../shared/spellcraft';

import { Bureau } from './Bureau';
import { Chamber } from './Chamber';

type Screen = 'menu' | 'bureau' | 'chamber';

/*
 * The working the player starts holding, and it is deliberately a MODEST one.
 *
 * The first version opened on twenty magnitude over four seconds, which priced
 * at Master and was refused on sight — so the first thing the game did was tell
 * a new player no, before they had learned what any of the sliders meant. An
 * opening spell should be comfortably licensed: the refusal is the interesting
 * outcome, and it lands harder once you have seen the seal it replaces.
 */
const OPENING: Working = {
  effectId: 'shock',
  magnitude: 10,
  duration: 2,
  area: 0,
  deliveryId: 'aimed',
};

interface Props {
  /** Back to the archive proper. */
  onLeave: () => void;
}

export function SlayTheHeretic({ onLeave }: Props) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [paused, setPaused] = useState(false);
  const [working, setWorking] = useState<Working>(OPENING);
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const [register, setRegister] = useState(0);

  const rank = RANKS[2]!;

  /*
   * Stable identities, because the chamber takes these in a dependency array
   * that tears down and rebuilds the whole canvas — its ticker, its buffers and
   * its loaded images — every time one of them changes. A fresh closure per
   * render would restart the chamber on every state update.
   */
  const onUnlicensedCast = useCallback(() => setRegister((n) => n + 1), []);
  const onPause = useCallback(() => setPaused(true), []);

  const notice = registerNotice(register);

  if (screen === 'menu') {
    return (
      <div className="slay slay--menu">
        <div className="slay__card">
          <p className="slay__eyebrow">Third Aldmeri Dominion · Proving Chambers</p>
          <h1 className="slay__title">Slay the Heretic</h1>
          <p className="slay__blurb">
            Compose a working. Submit it to the Office of Thaumaturgical Licensing for a
            ruling. Then take it into the chamber and find out whether the clerk was right.
          </p>
          <ul className="slay__keys">
            <li><b>Hold</b> to charge · <b>release</b> to cast</li>
            <li><b>Shift</b> while charging for a two-handed working</li>
            <li><b>Esc</b> to pause</li>
          </ul>
          <div className="slay__menuActions">
            <button type="button" className="slay__begin" onClick={() => setScreen('bureau')}>
              Begin
            </button>
            <button type="button" className="slay__leave" onClick={onLeave}>
              Return to the archive
            </button>
          </div>
          <p className="slay__smallprint">
            A prototype. Nothing is saved — close the tab and the Register forgets you.
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'bureau') {
    return (
      <div className="slay slay--bureau">
        <Bureau
          working={working}
          onChange={(w) => { setWorking(w); setRuling(null); }}
          rank={rank}
          ruling={ruling}
          onSubmit={setRuling}
          onEnterChamber={() => setScreen('chamber')}
          register={register}
        />
        <button type="button" className="slay__back" onClick={() => setScreen('menu')}>
          Leave the Office
        </button>
      </div>
    );
  }

  // The chamber needs a ruling to display; entering without one is not
  // reachable through the UI, but the type has to be satisfied either way.
  const carried = ruling ?? ruleOn(working, rank);

  return (
    <div className="slay slay--chamber">
      <Chamber
        working={working}
        ruling={carried}
        onUnlicensedCast={onUnlicensedCast}
        onPause={onPause}
        paused={paused}
      />

      {notice && (
        <p className={`slay__registerBar${register >= JUSTICIAR_AT ? ' is-dispatched' : ''}`}>
          {notice}
        </p>
      )}

      {paused && (
        <div className="slay__pause" role="dialog" aria-label="Paused">
          <div className="slay__card">
            <h2 className="slay__title">Held</h2>
            <p className="slay__blurb">The chamber waits.</p>
            <div className="slay__menuActions">
              <button type="button" className="slay__begin" onClick={() => setPaused(false)}>
                Resume
              </button>
              <button
                type="button"
                className="slay__leave"
                onClick={() => { setPaused(false); setScreen('bureau'); }}
              >
                Back to the Office
              </button>
              <button
                type="button"
                className="slay__leave"
                onClick={() => { setPaused(false); setScreen('menu'); }}
              >
                Main menu
              </button>
              <button type="button" className="slay__leave" onClick={onLeave}>
                Return to the archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

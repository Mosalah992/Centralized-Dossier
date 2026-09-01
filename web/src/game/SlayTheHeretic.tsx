// Slay the Heretic — the shell.
//
// Owns the screens (menu, the spellbook, the chamber, and the cards that sit
// over it) and the state that outlives any of them: a working in each hand, and
// the Register of Interest.
//
// LICENSING NO LONGER GATES ANYTHING. It used to: a working the Office refused
// could not be taken to the chamber without a second, grudging button, and the
// player met a refusal before they had learned what a slider did. Every effect
// is now castable and the chamber is one click from the menu.
//
// What survives is the part that was worth keeping. The Office still RULES on
// what you carry — the seal is shown beside each hand — and casting a working
// it would refuse still enters the Register of Interest, three of which fetch a
// Justiciar. The bureaucracy is now colour and consequence rather than a lock,
// which is the form it should have taken first: the archive's own design notes
// call the Register the flavour payoff, and a payoff should not be behind a
// gate that stops people reaching it.
//
// NOTHING PERSISTS BEYOND THE TAB. `server/` is readonly-scoped by invariant 2,
// so a save would mean standing up a database and write auth. Deferred, and the
// menu says so rather than letting a player find out by closing the tab.

import { useCallback, useMemo, useState } from 'react';

import {
  JUSTICIAR_AT,
  RANKS,
  type Working,
  registerNotice,
  ruleOn,
} from '../../../shared/spellcraft';

import { Spellbook } from './Bureau';
import { Chamber } from './Chamber';

type Screen = 'menu' | 'book' | 'chamber';

/*
 * What the mage starts holding, one working per hand.
 *
 * Both are modest and both are licensed. The first thing the game does should
 * be to hand you two spells that work, not to explain why one of them does not.
 */
const OPENING: { left: Working; right: Working } = {
  right: { effectId: 'shock', magnitude: 12, duration: 2, area: 0, deliveryId: 'aimed' },
  left: { effectId: 'flame', magnitude: 12, duration: 3, area: 2, deliveryId: 'aimed' },
};

interface Props {
  /** Back to the archive proper. */
  onLeave: () => void;
}

export function SlayTheHeretic({ onLeave }: Props) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [paused, setPaused] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [workings, setWorkings] = useState(OPENING);
  const [register, setRegister] = useState(0);

  const rank = RANKS[3]!;

  // Advisory now, not a gate: computed rather than asked for, and shown beside
  // each hand so the Office still has an opinion about what you are carrying.
  const rulings = useMemo(() => ({
    left: ruleOn(workings.left, rank),
    right: ruleOn(workings.right, rank),
  }), [workings, rank]);

  /*
   * Stable identities, because the chamber takes these in a dependency array
   * that would otherwise tear down and rebuild the whole canvas — its ticker,
   * its buffers and its five loaded images — on every state update.
   */
  const onUnlicensedCast = useCallback(() => setRegister((n) => n + 1), []);
  const onPause = useCallback(() => setPaused(true), []);
  const onCleared = useCallback(() => setCleared(true), []);

  const notice = registerNotice(register);

  const again = () => { setCleared(false); setResetToken((n) => n + 1); };
  const toBook = () => { setCleared(false); setPaused(false); setScreen('book'); };
  const toMenu = () => { setCleared(false); setPaused(false); setScreen('menu'); };

  if (screen === 'menu') {
    return (
      <div className="slay slay--menu">
        <div className="slay__card">
          <p className="slay__eyebrow">Third Aldmeri Dominion · Proving Chambers</p>
          <h1 className="slay__title">Slay the Heretic</h1>
          <p className="slay__blurb">
            Carry a working in each hand, and put them to the dummies. The Office of
            Thaumaturgical Licensing will have an opinion about what you are carrying;
            it cannot stop you.
          </p>
          <ul className="slay__keys">
            <li><b>Hold left</b> — cast the right hand · <b>hold right</b> — cast the left</li>
            <li><b>Shift</b> while charging for a two-handed working</li>
            <li><b>Move</b> to aim · <b>Esc</b> to pause</li>
          </ul>
          <div className="slay__menuActions">
            <button type="button" className="slay__begin" onClick={() => setScreen('chamber')}>
              Enter the chamber
            </button>
            <button type="button" className="slay__leave" onClick={() => setScreen('book')}>
              Choose your spells
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

  if (screen === 'book') {
    return (
      <div className="slay slay--bureau">
        <Spellbook
          workings={workings}
          onChange={setWorkings}
          rank={rank}
          rulings={rulings}
          onEnterChamber={() => setScreen('chamber')}
          register={register}
        />
        <button type="button" className="slay__back" onClick={() => setScreen('menu')}>
          Back to the menu
        </button>
      </div>
    );
  }

  return (
    <div className="slay slay--chamber">
      <Chamber
        workings={workings}
        rulings={rulings}
        onUnlicensedCast={onUnlicensedCast}
        onPause={onPause}
        paused={paused || cleared}
        onCleared={onCleared}
        resetToken={resetToken}
      />

      {/* Always reachable, because Escape is not discoverable and a game with no
          visible way out is a game people close the tab on. */}
      <div className="slay__chamberBar">
        <button type="button" className="slay__chip" onClick={() => setPaused(true)}>
          Pause
        </button>
        <button type="button" className="slay__chip" onClick={toBook}>
          Spells
        </button>
        <button type="button" className="slay__chip" onClick={onLeave}>
          Leave
        </button>
      </div>

      {notice && (
        <p className={`slay__registerBar${register >= JUSTICIAR_AT ? ' is-dispatched' : ''}`}>
          {notice}
        </p>
      )}

      {cleared && (
        <div className="slay__pause" role="dialog" aria-label="The chamber is clear">
          <div className="slay__card">
            <p className="slay__eyebrow">The proving is concluded</p>
            <h2 className="slay__title">The chamber is quiet</h2>
            <p className="slay__blurb">
              Every dummy is down.
              {register > 0
                ? ` The Register carries ${register} ${register === 1 ? 'entry' : 'entries'} against you.`
                : ' Nothing was entered against you.'}
            </p>
            <div className="slay__menuActions">
              <button type="button" className="slay__begin" onClick={again}>
                Stand them up again
              </button>
              <button type="button" className="slay__leave" onClick={toBook}>
                Change your spells
              </button>
              <button type="button" className="slay__leave" onClick={toMenu}>
                Main menu
              </button>
              <button type="button" className="slay__leave" onClick={onLeave}>
                Return to the archive
              </button>
            </div>
          </div>
        </div>
      )}

      {paused && !cleared && (
        <div className="slay__pause" role="dialog" aria-label="Paused">
          <div className="slay__card">
            <h2 className="slay__title">Held</h2>
            <p className="slay__blurb">The chamber waits.</p>
            <div className="slay__menuActions">
              <button type="button" className="slay__begin" onClick={() => setPaused(false)}>
                Resume
              </button>
              <button type="button" className="slay__leave" onClick={again}>
                Stand the dummies up
              </button>
              <button type="button" className="slay__leave" onClick={toBook}>
                Change your spells
              </button>
              <button type="button" className="slay__leave" onClick={toMenu}>
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

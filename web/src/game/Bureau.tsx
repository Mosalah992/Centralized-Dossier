// The spellbook — and, still, the Office of Thaumaturgical Licensing.
//
// You carry a working in each hand and tune either. Every effect is selectable,
// including the two nobody gets a seal for: LICENSING NO LONGER GATES ANYTHING,
// so this screen is where you equip spells rather than where you ask permission
// to have them.
//
// The Office's ruling is still here, updating live beside each hand, because it
// is worth knowing what you are carrying before you throw it — a working the
// Office would refuse is one whose casts go in the Register of Interest, and
// one likely to turn in your hand. Advice, not a lock.
//
// Ordinary React and ordinary DOM. Nothing here runs per frame; the panels
// re-render on a slider, and the canvas next door never sees any of it.

import { useState } from 'react';

import {
  DELIVERIES,
  EFFECTS,
  type Rank,
  type Ruling,
  type Working,
  LIMITS,
  costOf,
  effectOf,
  gradeOf,
  instabilityOf,
  misfireChance,
} from '../../../shared/spellcraft';

type Hand = 'left' | 'right';

interface Props {
  workings: { left: Working; right: Working };
  onChange: (w: { left: Working; right: Working }) => void;
  rank: Rank;
  rulings: { left: Ruling; right: Ruling };
  onEnterChamber: () => void;
  register: number;
}

function Slider({
  label, value, min, max, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="slay__slider">
      <span className="slay__sliderHead">
        {label}
        <b>{value}{unit}</b>
      </span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Spellbook({
  workings, onChange, rank, rulings, onEnterChamber, register,
}: Props) {
  /*
   * Which hand is being edited. A single editor with a hand switch rather than
   * two side by side: the panels carry twelve effects and three sliders each,
   * and two of those on one screen is a control surface nobody reads.
   */
  const [hand, setHand] = useState<Hand>('right');

  const working = workings[hand];
  const ruling = rulings[hand];
  const effect = effectOf(working);
  const cost = costOf(working);
  const instability = instabilityOf(working);
  const misfire = misfireChance(instability);

  const set = (patch: Partial<Working>) =>
    onChange({ ...workings, [hand]: { ...working, ...patch } });

  return (
    <div className="slay__bureau">
      <header className="slay__bureauHead">
        <p className="slay__eyebrow">Office of Thaumaturgical Licensing</p>
        <h1>Your spellbook</h1>
        <p className="slay__rank">
          Carried by a <b>{rank.name}</b> · licensed to <b>{rank.clearance}</b>
        </p>
      </header>

      {/* Which hand. Each tab carries its own spell's name and seal, so the one
          you are not editing is still legible. */}
      <div className="slay__hands">
        {(['left', 'right'] as Hand[]).map((h) => (
          <button
            key={h}
            type="button"
            className={`slay__hand${h === hand ? ' is-on' : ''} is-${rulings[h].seal}`}
            onClick={() => setHand(h)}
            aria-pressed={h === hand}
          >
            <span className="slay__handWhich">{h === 'left' ? 'Left hand' : 'Right hand'}</span>
            <span className="slay__handSpell">{effectOf(workings[h]).name}</span>
            <span className="slay__handSeal">
              {rulings[h].seal === 'refused' ? 'Unlicensed' : rulings[h].seal}
            </span>
          </button>
        ))}
      </div>

      <div className="slay__cols">
        <section className="slay__panel">
          <h2>The effect</h2>
          <div className="slay__effects">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`slay__effect${e.id === working.effectId ? ' is-on' : ''}${e.prohibited ? ' is-proscribed' : ''}`}
                onClick={() => set({ effectId: e.id })}
              >
                <span className="slay__effectName">{e.name}</span>
                <span className="slay__effectSchool">{e.school}</span>
              </button>
            ))}
          </div>
          <p className="slay__note">{effect.note}</p>

          <h2>Delivery</h2>
          <div className="slay__deliveries">
            {DELIVERIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`slay__delivery${d.id === working.deliveryId ? ' is-on' : ''}`}
                onClick={() => set({ deliveryId: d.id })}
              >
                {d.name}
              </button>
            ))}
          </div>
        </section>

        <section className="slay__panel">
          <h2>The terms</h2>
          <Slider
            label="Magnitude" unit="" value={working.magnitude}
            min={LIMITS.magnitude.min} max={LIMITS.magnitude.max}
            onChange={(magnitude) => set({ magnitude })}
          />
          <Slider
            label="Duration" unit="s" value={working.duration}
            min={LIMITS.duration.min} max={LIMITS.duration.max}
            onChange={(duration) => set({ duration })}
          />
          <Slider
            label="Area" unit="ft" value={working.area}
            min={LIMITS.area.min} max={LIMITS.area.max}
            onChange={(area) => set({ area })}
          />

          <dl className="slay__reading">
            <div>
              <dt>Cost</dt>
              <dd>{cost.toFixed(0)}</dd>
            </div>
            <div>
              <dt>Grade</dt>
              <dd>{gradeOf(cost)}</dd>
            </div>
            <div>
              <dt>Instability</dt>
              <dd className={instability > 60 ? 'is-bad' : instability > 35 ? 'is-warn' : ''}>
                {instability.toFixed(0)}
              </dd>
            </div>
            <div>
              <dt>Misfire</dt>
              <dd className={misfire > 0.25 ? 'is-bad' : misfire > 0.08 ? 'is-warn' : ''}>
                {(misfire * 100).toFixed(0)}%
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* The ruling, live. It advises; it does not admit or refuse entry. */}
      <aside className={`slay__ruling slay__ruling--${ruling.seal}`} role="status">
        <p className="slay__stamp">{ruling.title}</p>
        <p className="slay__rulingBody">{ruling.body}</p>
        {ruling.seal === 'refused' && (
          <p className="slay__warn">
            You may carry it regardless. Every cast of an unlicensed working is entered
            in the Register of Interest.
          </p>
        )}
      </aside>

      <div className="slay__actions">
        <button type="button" className="slay__submit" onClick={onEnterChamber}>
          To the proving chamber
        </button>
      </div>

      {register > 0 && (
        <p className="slay__register">
          Register of Interest — {register} {register === 1 ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  );
}

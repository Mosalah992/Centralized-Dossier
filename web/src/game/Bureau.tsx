// The Office of Thaumaturgical Licensing.
//
// The whole compose-and-submit half of the game. It is ordinary React and
// ordinary DOM: nothing here runs per frame, the panels re-render only when a
// slider moves, and the canvas next door never sees any of it.
//
// The assessment updates live as you drag, but the RULING does not. Cost and
// instability are arithmetic anyone may see; the seal is the Office's opinion
// and has to be asked for. That gap is where the game lives — the reading tells
// you what you have built, and submitting is a decision about whether to find
// out what the clerk thinks of it.

import { useMemo, useState } from 'react';

import {
  DELIVERIES,
  EFFECTS,
  type Rank,
  type Ruling,
  type Working,
  LIMITS,
  costOf,
  effectOf,
  instabilityOf,
  gradeOf,
  misfireChance,
  ruleOn,
} from '../../../shared/spellcraft';

interface Props {
  working: Working;
  onChange: (w: Working) => void;
  rank: Rank;
  ruling: Ruling | null;
  onSubmit: (r: Ruling) => void;
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
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Bureau({
  working, onChange, rank, ruling, onSubmit, onEnterChamber, register,
}: Props) {
  const [reading, setReading] = useState(true);

  const assessment = useMemo(() => ({
    cost: costOf(working),
    grade: gradeOf(costOf(working)),
    instability: instabilityOf(working),
  }), [working]);

  const effect = effectOf(working);
  const misfire = misfireChance(assessment.instability);
  const set = (patch: Partial<Working>) => onChange({ ...working, ...patch });

  return (
    <div className="slay__bureau">
      <header className="slay__bureauHead">
        <p className="slay__eyebrow">Office of Thaumaturgical Licensing</p>
        <h1>Submission of a Working</h1>
        <p className="slay__rank">
          Applicant: <b>{rank.name}</b> · licensed to <b>{rank.clearance}</b>
        </p>
      </header>

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

          <button
            type="button"
            className="slay__reveal"
            onClick={() => setReading((r) => !r)}
            aria-expanded={reading}
          >
            {reading ? 'Hide the assessment' : 'Show the assessment'}
          </button>

          {reading && (
            <dl className="slay__reading">
              <div>
                <dt>Cost</dt>
                <dd>{assessment.cost.toFixed(0)}</dd>
              </div>
              <div>
                <dt>Grade</dt>
                <dd>{assessment.grade}</dd>
              </div>
              <div>
                <dt>Instability</dt>
                <dd className={assessment.instability > 60 ? 'is-bad' : assessment.instability > 35 ? 'is-warn' : ''}>
                  {assessment.instability.toFixed(0)}
                </dd>
              </div>
              <div>
                <dt>Misfire</dt>
                <dd className={misfire > 0.25 ? 'is-bad' : misfire > 0.08 ? 'is-warn' : ''}>
                  {(misfire * 100).toFixed(0)}%
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      <div className="slay__actions">
        <button
          type="button"
          className="slay__submit"
          onClick={() => onSubmit(ruleOn(working, rank))}
        >
          Submit for a ruling
        </button>
        {ruling && (
          <button type="button" className="slay__enter" onClick={onEnterChamber}>
            {ruling.seal === 'refused'
              ? 'Carry it to the chamber anyway'
              : 'Take it to the proving chamber'}
          </button>
        )}
      </div>

      {ruling && (
        <aside className={`slay__ruling slay__ruling--${ruling.seal}`} role="status">
          <p className="slay__stamp">{ruling.title}</p>
          <p className="slay__rulingBody">{ruling.body}</p>
          {ruling.seal === 'refused' && (
            <p className="slay__warn">
              A refused working may still be carried. Every cast of one is entered in the
              Register of Interest.
            </p>
          )}
        </aside>
      )}

      {register > 0 && (
        <p className="slay__register">
          Register of Interest — {register} {register === 1 ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  );
}

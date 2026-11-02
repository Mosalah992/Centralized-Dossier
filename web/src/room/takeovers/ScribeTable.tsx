// The Scribe Table: the website's door to the Scribe, the same five steps as
// the bot's /report, one at a time, ending in the parchment the server draws.
//
//   the seal   a member gives the code the bot issued (/archives code), which
//              fills in their rank and name; anyone may instead file an
//              Application to the Thalmor or a Public Request without one
//   1 what     the kind of filing and how much it matters (and, for the
//              board, which section)
//   2 who      rank, name, the superior answered to, the title
//   3 when     now, or an in-world month, day and hour
//   4 body
//   5 the parchment, drawn by the server, with File it / Edit / Cancel
//
// Each step is checked by the shared model (shared/filing.ts) before the next,
// and the server checks the whole again. Until /api/scribe answers, the table
// says in-world that it is not yet consecrated.

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';

import {
  BULLETIN_SECTIONS,
  CATEGORY_INFO,
  FILING_CATEGORIES,
  FILING_LIMITS,
  IMPORTANCE_INFO,
  checkFiling,
  checkFilingSoFar,
  importanceFor,
  incidentClock,
  incidentDate,
  incidentNow,
  type FiledAnswer,
  type Filing,
  type FilingCategory,
  type FilingField,
  type ScribeHolder,
} from '../../../../shared/filing';
import { MONTHS } from '../../../../shared/parsers/calendar';
import { MONTH_LENGTHS } from '../../../../shared/reckoning';
import { BOARD_INFO } from '../../../../shared/room';
import { WING_INFO } from '../../../../shared/wings';
import { fileFiling, giveCode, previewParchment, returnSeal, sealHolder } from '../../scribe-api';
import { Fleuron } from '../art';
import '../../styles/board.css';
import '../../styles/scribe.css';

type Step = 'seal' | 'what' | 'who' | 'when' | 'body' | 'parchment' | 'filed';

const STEPS: { id: Step; label: string }[] = [
  { id: 'what', label: 'What' },
  { id: 'who', label: 'Who' },
  { id: 'when', label: 'When' },
  { id: 'body', label: 'The body' },
  { id: 'parchment', label: 'The parchment' },
];

const STEP_OF: Record<FilingField, Step> = {
  category: 'what',
  importance: 'what',
  section: 'what',
  rank: 'who',
  name: 'who',
  superior: 'who',
  title: 'who',
  time: 'when',
  body: 'body',
};

function whereTo(category: FilingCategory): string {
  const to = CATEGORY_INFO[category].destination;
  if (to.kind === 'board') return 'Nailed to the bulletin board';
  if (to.kind === 'cabinet') return `Entered in the Cabinet, ${WING_INFO[to.wing].name}`;
  return 'Laid on the Clerk Table for High Command';
}

export function ScribeTable() {
  const [seal, setSeal] = useState<'loading' | 'absent' | { holder: ScribeHolder | null; error?: string }>('loading');

  useEffect(() => {
    let live = true;
    void sealHolder().then((answer) => live && setSeal(answer));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="scribe-view">
      <h2 className="takeover__heading">The Scribe Table</h2>
      <p className="takeover__sub">Reports, logs and notices, filed under the Embassy’s seal</p>
      {seal === 'loading' ? (
        <div className="scribe-wait parchment">
          <Fleuron />
          <p>Trimming the candle…</p>
        </div>
      ) : seal === 'absent' ? (
        <div className="scribe-wait parchment">
          <Fleuron />
          <h3>The Scribe Table awaits its consecration</h3>
          <p>
            When it is consecrated, ask the Embassy’s bot for your code in Discord with <code>/archives code</code>. The
            code fills in your rank and name.
          </p>
          <p>
            You will choose what you are filing and how much it matters, and the Scribe will draw it on parchment for the
            board, the Cabinet or the Clerk Table.
          </p>
        </div>
      ) : (
        <Wizard initial={seal.holder} notice={seal.error} />
      )}
    </div>
  );
}

function Wizard({ initial, notice }: { initial: ScribeHolder | null; notice?: string }) {
  const [holder, setHolder] = useState(initial);
  const [step, setStep] = useState<Step>('seal');
  const [draft, setDraft] = useState<Partial<Filing>>({});
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [filed, setFiled] = useState<FiledAnswer | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Each step announces itself: focus moves to its heading.
  useEffect(() => {
    heading.current?.focus({ preventScroll: false });
  }, [step]);

  const go = (next: Step) => {
    setStep(next);
  };
  const change = (fields: Partial<Filing>) => setDraft((d) => ({ ...d, ...fields }));

  /** Check this step's fields; on success keep the cleaned values and move on. */
  const advance = (fields: FilingField[], next: Step, extra?: Partial<Filing>) => {
    const given = { ...draft, ...extra };
    const checked = checkFilingSoFar(given, fields);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    const kept: Partial<Filing> = { ...given };
    for (const field of fields) Object.assign(kept, { [field]: checked.value[field] });
    setDraft(kept);
    setError(null);
    go(next);
  };

  const begin = (who: ScribeHolder | null) => {
    setHolder(who);
    setDraft((d) => ({ ...d, rank: d.rank ?? who?.rank ?? '', name: d.name ?? who?.name ?? '' }));
    setError(null);
    go('what');
  };

  const reset = () => {
    setDraft({});
    setAnswered(null);
    setFiled(null);
    setError(null);
    go('seal');
  };

  const refused = (field?: FilingField, status?: number) => {
    if (status === 401) {
      setHolder(null);
      go('seal');
    } else if (field) go(STEP_OF[field]);
  };

  const member = holder !== null;
  const index = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="scribe-sheet">
      {index >= 0 && (
        <ol className="scribe-steps" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={s.id === step ? 'step' : undefined} data-done={i < index ? true : undefined}>
              <span>{i + 1}</span> {s.label}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="scribe-error" role="alert">
          {error}
        </p>
      )}

      {step === 'seal' && (
        <SealStep
          heading={heading}
          holder={holder}
          onBegin={begin}
          onRelease={async () => {
            await returnSeal();
            setHolder(null);
          }}
          onError={setError}
        />
      )}

      {step === 'what' && (
        <Form heading={heading} title="What are you filing?" onSubmit={() => advance(['category', 'importance', 'section'], 'who')} back={() => go('seal')}>
          <fieldset className="scribe-choices">
            <legend>The kind of filing</legend>
            {FILING_CATEGORIES.filter((c) => member || CATEGORY_INFO[c].open).map((c) => (
              <label key={c} className="scribe-choice">
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={draft.category === c}
                  onChange={() => {
                    const levels = importanceFor(c);
                    change({
                      category: c,
                      importance: draft.importance && levels.includes(draft.importance) ? draft.importance : undefined,
                      section: c === 'bulletin' ? draft.section ?? null : null,
                    });
                  }}
                />
                <span className="scribe-choice__name">{CATEGORY_INFO[c].name}</span>
                <span className="scribe-choice__note">{whereTo(c)}</span>
              </label>
            ))}
          </fieldset>
          {!member && <p className="scribe-note">Members of the Embassy may file every kind once they give their code.</p>}

          {draft.category && (
            <fieldset className="scribe-choices scribe-choices--levels">
              <legend>How much it matters</legend>
              {importanceFor(draft.category).map((level) => (
                <label key={level} className="scribe-choice" data-level={level}>
                  <input type="radio" name="importance" value={level} checked={draft.importance === level} onChange={() => change({ importance: level })} />
                  <span className="scribe-choice__name">{IMPORTANCE_INFO[level].name}</span>
                  <span className="scribe-choice__note">
                    {IMPORTANCE_INFO[level].meaning}
                    {IMPORTANCE_INFO[level].summons === 'command' && ' · calls the Justiciars and department heads'}
                    {IMPORTANCE_INFO[level].summons === 'all' && ' · calls every member and High Command'}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {draft.category === 'bulletin' && (
            <label className="scribe-field">
              <span>Where on the board</span>
              <select value={draft.section ?? ''} onChange={(e) => change({ section: (e.target.value || null) as Filing['section'] })}>
                <option value="">Choose a section</option>
                {BULLETIN_SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {BOARD_INFO[s].title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Form>
      )}

      {step === 'who' && (
        <Form
          heading={heading}
          title="Who files it?"
          onSubmit={() => {
            if (answered === null) return setError('Say whether you answered to a superior.');
            if (answered && !draft.superior?.trim()) return setError('Write the name of the superior you answered to.');
            advance(['rank', 'name', 'superior', 'title'], 'when', answered ? {} : { superior: null });
          }}
          back={() => go('what')}
        >
          <TextField
            label="Rank"
            value={draft.rank ?? ''}
            max={FILING_LIMITS.rank}
            onChange={(rank) => change({ rank })}
            note={draft.category && CATEGORY_INFO[draft.category].open ? 'If you hold one.' : holder ? 'From your roles; change it if you must.' : undefined}
          />
          <TextField label="Name" value={draft.name ?? ''} max={FILING_LIMITS.name} onChange={(name) => change({ name })} />
          <fieldset className="scribe-choices scribe-choices--inline">
            <legend>Did you answer to a superior?</legend>
            <label className="scribe-choice">
              <input type="radio" name="answered" checked={answered === true} onChange={() => setAnswered(true)} />
              <span className="scribe-choice__name">Yes</span>
            </label>
            <label className="scribe-choice">
              <input type="radio" name="answered" checked={answered === false} onChange={() => setAnswered(false)} />
              <span className="scribe-choice__name">No</span>
            </label>
          </fieldset>
          {answered && (
            <TextField label="The superior’s name" value={draft.superior ?? ''} max={FILING_LIMITS.superior} onChange={(superior) => change({ superior })} />
          )}
          <TextField label="Title" value={draft.title ?? ''} max={FILING_LIMITS.title} onChange={(title) => change({ title })} />
        </Form>
      )}

      {step === 'when' && <WhenStep heading={heading} draft={draft} onBack={() => go('who')} onTime={(time) => advance(['time'], 'body', { time })} />}

      {step === 'body' && (
        <Form heading={heading} title={`Write the ${draft.category ? CATEGORY_INFO[draft.category].name : 'filing'}`} onSubmit={() => advance(['body'], 'parchment')} back={() => go('when')}>
          <label className="scribe-field">
            <span className="scribe-hidden">The body</span>
            <textarea rows={14} value={draft.body ?? ''} maxLength={FILING_LIMITS.body} onChange={(e) => change({ body: e.target.value })} />
            <span className="scribe-field__count" aria-live="polite">
              {(draft.body ?? '').length} / {FILING_LIMITS.body}
            </span>
          </label>
        </Form>
      )}

      {step === 'parchment' && (
        <ParchmentStep
          heading={heading}
          draft={draft}
          onEdit={() => {
            setError(null);
            go('what');
          }}
          onCancel={reset}
          onRefused={(message, field, status) => {
            setError(message);
            refused(field, status);
          }}
          onFiled={(answer) => {
            setFiled(answer);
            setError(null);
            go('filed');
          }}
        />
      )}

      {step === 'filed' && filed && draft.category && (
        <section className="scribe-step scribe-filed">
          <h3 ref={heading} tabIndex={-1}>
            Filed as Entry No. {filed.id}
          </h3>
          <p>
            {filed.destination === 'board' && `It is nailed to the board, under ${draft.section ? BOARD_INFO[draft.section].title : 'its section'}.`}
            {filed.destination === 'cabinet' && `It is entered in the Cabinet. ${whereTo(draft.category)}.`}
            {filed.destination === 'clerk' && 'It lies on the Clerk Table until High Command stamps it.'}
          </p>
          <p>The Embassy’s bot posts it to Discord as well.</p>
          <div className="scribe-actions">
            <button type="button" className="scribe-button scribe-button--primary" onClick={reset}>
              File another
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Form({
  heading,
  title,
  onSubmit,
  back,
  next = 'Next',
  children,
}: {
  heading: RefObject<HTMLHeadingElement>;
  title: string;
  onSubmit: () => void;
  back?: () => void;
  next?: string;
  children: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form className="scribe-step" onSubmit={submit} noValidate>
      <h3 ref={heading} tabIndex={-1}>
        {title}
      </h3>
      {children}
      <div className="scribe-actions">
        {back && (
          <button type="button" className="scribe-button" onClick={back}>
            Back
          </button>
        )}
        <button type="submit" className="scribe-button scribe-button--primary">
          {next}
        </button>
      </div>
    </form>
  );
}

function TextField({ label, value, max, onChange, note }: { label: string; value: string; max: number; onChange: (v: string) => void; note?: string }) {
  return (
    <label className="scribe-field">
      <span>{label}</span>
      <input type="text" value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
      {note && <span className="scribe-field__note">{note}</span>}
    </label>
  );
}

function SealStep({
  heading,
  holder,
  onBegin,
  onRelease,
  onError,
}: {
  heading: RefObject<HTMLHeadingElement>;
  holder: ScribeHolder | null;
  onBegin: (holder: ScribeHolder | null) => void;
  onRelease: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (holder) {
    return (
      <section className="scribe-step">
        <h3 ref={heading} tabIndex={-1}>
          Sealed as {holder.rank}
          {holder.office ? `, ${holder.office}` : ''}
        </h3>
        <p>Your filings are signed {holder.name}, which you may change on each.</p>
        <div className="scribe-actions">
          <button type="button" className="scribe-button" onClick={() => void onRelease()}>
            Give back the seal
          </button>
          <button type="button" className="scribe-button scribe-button--primary" onClick={() => onBegin(holder)}>
            Begin a filing
          </button>
        </div>
      </section>
    );
  }

  const give = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return onError('Give the code the bot sent you.');
    setBusy(true);
    const answer = await giveCode(code);
    setBusy(false);
    if (!answer.ok) return onError(answer.error);
    setCode('');
    onBegin(answer.holder);
  };

  return (
    <section className="scribe-step">
      <h3 ref={heading} tabIndex={-1}>
        Your code
      </h3>
      <form className="scribe-seal" onSubmit={give} noValidate>
        <label className="scribe-field">
          <span>The code the bot sent you</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="THM-XXXX-XXXX"
          />
          <span className="scribe-field__note">
            Ask for one in the Embassy’s Discord with <code>/archives code</code>.
          </span>
        </label>
        <button type="submit" className="scribe-button scribe-button--primary" disabled={busy}>
          {busy ? 'Reading it…' : 'Give it'}
        </button>
      </form>
      <div className="scribe-open">
        <p>Not of the Embassy? An Application to the Thalmor or a Public Request needs no code.</p>
        <button type="button" className="scribe-button" onClick={() => onBegin(null)}>
          File without a code
        </button>
      </div>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function WhenStep({
  heading,
  draft,
  onBack,
  onTime,
}: {
  heading: RefObject<HTMLHeadingElement>;
  draft: Partial<Filing>;
  onBack: () => void;
  onTime: (time: Filing['time']) => void;
}) {
  const [now, setNow] = useState(() => incidentNow());
  const [mode, setMode] = useState<'now' | 'other'>(draft.time ? 'other' : 'now');
  const start = draft.time ?? now;
  const [month, setMonth] = useState(start.monthIndex);
  const [day, setDay] = useState(start.day);
  const [clock, setClock] = useState(`${pad(start.hour)}:${pad(start.minute)}`);

  // The realm's clock runs at twice the world's: keep "now" honest while the reader decides.
  useEffect(() => {
    const id = window.setInterval(() => setNow(incidentNow()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const days = MONTH_LENGTHS[month - 1] ?? 31;
  const submit = () => {
    if (mode === 'now') return onTime(incidentNow());
    const [hour, minute] = clock.split(':').map(Number);
    onTime({ year: now.year, monthIndex: month, day: Math.min(day, days), hour: hour ?? Number.NaN, minute: minute ?? Number.NaN });
  };

  return (
    <Form heading={heading} title="When did it happen?" onSubmit={submit} back={onBack}>
      <fieldset className="scribe-choices">
        <legend>The hour, in the realm</legend>
        <label className="scribe-choice">
          <input type="radio" name="when" checked={mode === 'now'} onChange={() => setMode('now')} />
          <span className="scribe-choice__name">Now</span>
          <span className="scribe-choice__note">
            The {incidentDate(now)}, {incidentClock(now)}
          </span>
        </label>
        <label className="scribe-choice">
          <input type="radio" name="when" checked={mode === 'other'} onChange={() => setMode('other')} />
          <span className="scribe-choice__name">Another hour</span>
          <span className="scribe-choice__note">A month, a day and a time of 4E {now.year}</span>
        </label>
      </fieldset>
      {mode === 'other' && (
        <div className="scribe-hour">
          <label className="scribe-field">
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="scribe-field">
            <span>Day</span>
            <select value={Math.min(day, days)} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: days }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="scribe-field">
            <span>Time</span>
            <input type="time" value={clock} onChange={(e) => setClock(e.target.value)} required />
          </label>
        </div>
      )}
    </Form>
  );
}

function ParchmentStep({
  heading,
  draft,
  onEdit,
  onCancel,
  onRefused,
  onFiled,
}: {
  heading: RefObject<HTMLHeadingElement>;
  draft: Partial<Filing>;
  onEdit: () => void;
  onCancel: () => void;
  onRefused: (message: string, field?: FilingField, status?: number) => void;
  onFiled: (answer: FiledAnswer) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<'drawing' | 'drawn' | 'undrawn' | 'filing'>('drawing');
  const checked = checkFiling(draft);

  useEffect(() => {
    if (!checked.ok) {
      onRefused(checked.error, checked.field);
      return;
    }
    let live = true;
    void previewParchment(checked.value).then((answer) => {
      if (!live) return;
      if (answer.ok) {
        setSrc(answer.src);
        setState('drawn');
      } else if (answer.field || answer.status === 401) {
        onRefused(answer.error, answer.field, answer.status);
      } else {
        setState('undrawn');
      }
    });
    return () => {
      live = false;
    };
    // Drawn once per visit to this step: the draft does not change while it is shown.
  }, []);

  const file = async () => {
    if (!checked.ok) return;
    setState('filing');
    const answer = await fileFiling(checked.value);
    if (answer.ok) onFiled(answer.filed);
    else {
      setState(src ? 'drawn' : 'undrawn');
      onRefused(answer.error, answer.field, answer.status);
    }
  };

  return (
    <section className="scribe-step">
      <h3 ref={heading} tabIndex={-1}>
        The parchment, as it will be filed
      </h3>
      <div className="scribe-parchment" aria-busy={state === 'drawing'}>
        {state === 'drawing' && <p>The Scribe is writing it out…</p>}
        {state === 'undrawn' && <p>The Scribe could not draw it just now. It can still be filed, and will be drawn when it is.</p>}
        {src && <img src={src} alt={`The parchment: ${draft.title ?? ''}`} />}
      </div>
      <div className="scribe-actions">
        <button type="button" className="scribe-button" onClick={onCancel} disabled={state === 'filing'}>
          Cancel
        </button>
        <button type="button" className="scribe-button" onClick={onEdit} disabled={state === 'filing'}>
          Edit
        </button>
        <button type="button" className="scribe-button scribe-button--primary" onClick={() => void file()} disabled={state === 'drawing' || state === 'filing'}>
          {state === 'filing' ? 'Filing…' : 'File it'}
        </button>
      </div>
    </section>
  );
}

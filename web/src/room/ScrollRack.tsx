// The Scroll Rack, which holds High Command's reports, and the word that opens
// it. Ancarion keeps it from the wall beside: a wrong word earns the gate's own
// refusals — narrowed eyes, then the head-shake, then the sigh — and the right
// one his nod, after which it is the RACK's doors that swing, not his, and the
// reader goes through to /reports.
//
// Authorization is exactly the Reports gate's: the same `openReports` against
// POST /api/reports/gate, the same Reports-only writ. Nothing new is opened on
// the server. A reader already holding the writ is let straight through after a
// nod; /reports and /reports/:id reached any other way still stand behind the
// full PortraitGate.

import { useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from 'react';

import { openReports, reportsIsOpen } from '../api';
import {
  ACCEPTED_PERFORMANCE_HOLD_MS,
  ACCEPTED_STILL_HOLD_MS,
  DOOR_SWING_MS,
  refusalFor,
} from '../components/useAncarion';
import { RackCornice, RackDoor, RackInside } from './art';
import { ImageSlot } from './ImageSlot';
import { plainClick, useNavigate } from './nav';
import type { AncarionHandle } from './RoomPortrait';

type Stage = 'shut' | 'asking' | 'checking' | 'accepted' | 'opening';

/** With the writ already held: a nod, not the whole performance. */
const ACKNOWLEDGE_HOLD_MS = 900;
/** Reduced motion: the doors are simply open, and the reader goes on. */
const STILL_OPEN_MS = 220;

const preloadReports = () => void import('../views/Reports');

interface Props {
  ancarion: RefObject<AncarionHandle>;
  /** The slip's field, shared with the portrait so he knows when he is addressed. */
  field: RefObject<HTMLInputElement>;
}

export function ScrollRack({ ancarion, field }: Props) {
  const navigate = useNavigate();
  const inputId = useId();
  const [stage, setStage] = useState<Stage>('shut');
  const [phrase, setPhrase] = useState('');
  const [status, setStatus] = useState('');
  const writ = useRef<Promise<boolean> | null>(null);
  const request = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);
  const denials = useRef(0);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      request.current?.abort();
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  useEffect(() => {
    if (stage === 'asking') window.requestAnimationFrame(() => field.current?.focus());
  }, [stage, field]);

  /** A reader drawing near: wake his reactions, fetch the dossier, ask after the writ once. */
  const approach = () => {
    ancarion.current?.warm();
    preloadReports();
    writ.current ??= reportsIsOpen();
  };

  const enter = () => navigate('/reports');

  /** The doors swing, then the reader goes through. */
  const swing = (hold: number) => {
    const still = ancarion.current?.reducedMotion() ?? false;
    if (still) {
      setStage('opening');
      later(enter, STILL_OPEN_MS);
      return;
    }
    later(() => {
      setStage('opening');
      later(enter, DOOR_SWING_MS);
    }, hold);
  };

  const knock = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    if (stage === 'checking' || stage === 'accepted' || stage === 'opening') return;
    approach();
    if (await (writ.current ?? Promise.resolve(false))) {
      setStage('accepted');
      ancarion.current?.accept();
      setStatus('Ancarion knows you. The rack is opened.');
      swing(ACKNOWLEDGE_HOLD_MS);
      return;
    }
    setStage('asking');
    setStatus('');
  };

  const dismiss = () => {
    if (stage !== 'asking') return;
    setStage('shut');
    setPhrase('');
    setStatus('');
    ancarion.current?.settle();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stage !== 'asking') return;
    const passphrase = phrase;
    if (!passphrase.trim()) {
      setStatus('Enter the passphrase.');
      field.current?.focus();
      return;
    }

    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12_000);
    setStage('checking');
    setStatus('Ancarion consults the register…');
    ancarion.current?.consult();

    try {
      const signal = controller.signal;
      const result = await openReports(passphrase, signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        denials.current += 1;
        setPhrase('');
        setStage('asking');
        ancarion.current?.react(refusalFor(denials.current));
        setStatus(
          result.retryAfterSeconds
            ? `The seal requires patience. Try again in ${result.retryAfterSeconds} seconds.`
            : result.message,
        );
        return;
      }
      writ.current = Promise.resolve(true);
      setStage('accepted');
      const performs = ancarion.current?.accept() ?? false;
      setStatus('“You are expected.” The rack is unlocked.');
      swing(performs ? ACCEPTED_PERFORMANCE_HOLD_MS : ACCEPTED_STILL_HOLD_MS);
    } catch {
      if (controller.signal.aborted && !timedOut) return;
      setStage('asking');
      ancarion.current?.rest();
      setStatus(
        timedOut
          ? 'The authorization service took too long. Please retry.'
          : 'The authorization service could not be reached. Please retry.',
      );
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  };

  const busy = stage === 'checking' || stage === 'accepted' || stage === 'opening';
  const asking = stage === 'asking' || stage === 'checking';

  return (
    <div className="rack-object" data-stage={stage}>
      <a
        href="/reports"
        className="object object--rack"
        data-object="rack"
        aria-label="Scroll Rack: High Command's reports, kept behind Ancarion's word."
        aria-expanded={asking}
        onClick={knock}
        onPointerEnter={approach}
        onFocus={approach}
      >
        <ImageSlot name="rack" className="object__art rack">
          <RackCornice />
          <span className="rack__body">
            <RackInside />
            <RackDoor side="l" />
            <RackDoor side="r" />
          </span>
        </ImageSlot>
        <span className="plaque">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M6 11h12v10H6Z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          Scroll Rack
        </span>
      </a>

      {(asking || stage === 'accepted' || stage === 'opening') && (
        <div className="rack-slip parchment" role="group" aria-label="The word for the Scroll Rack">
          {asking && (
            <form className="rack-slip__form" onSubmit={submit}>
              <label className="rack-slip__label" htmlFor={inputId}>
                State the phrase entrusted to you
              </label>
              <input
                ref={field}
                id={inputId}
                type="password"
                placeholder="Passphrase"
                value={phrase}
                autoComplete="off"
                spellCheck={false}
                disabled={stage === 'checking'}
                aria-invalid={denials.current > 0 && !phrase ? true : undefined}
                onFocus={() => ancarion.current?.notice()}
                onBlur={() => stage === 'asking' && ancarion.current?.settle()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    dismiss();
                  }
                }}
                onChange={(event) => {
                  setPhrase(event.target.value);
                  ancarion.current?.notice();
                }}
              />
              <div className="rack-slip__actions">
                <button type="submit" className="btn" disabled={!phrase.trim() || busy}>
                  {stage === 'checking' ? 'Consulting the seal' : 'Present your words'}
                </button>
                <button type="button" className="btn btn--quiet" onClick={dismiss} disabled={busy}>
                  Withdraw
                </button>
              </div>
            </form>
          )}
          <p className="rack-slip__status" role="status" aria-live="polite">
            {status || ' '}
          </p>
          {busy && stage !== 'checking' && (
            <button type="button" className="rack-slip__skip" onClick={enter}>
              Skip opening
            </button>
          )}
        </div>
      )}
    </div>
  );
}


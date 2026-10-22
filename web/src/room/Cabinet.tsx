// The Cabinet, which keeps the letters to High Command, and the word that opens
// it. Ancarion keeps it from the wall beside: a wrong word earns the gate's own
// refusals (narrowed eyes, then the head-shake, then the sigh) and the right
// one his nod, after which the Cabinet's Fresh! drawer slides out and the
// reader goes through to it (/reports, the Cabinet's takeover).
//
// Authorization is exactly the Reports gate's: the same `openReports` against
// POST /api/reports/gate, the same Reports-only writ. Nothing new is opened on
// the server. A reader already holding the writ is let straight through after
// a nod. A reader who arrives at /reports or /reports/:id without it is sent
// back to the room with this slip open (`sealed`), so Ancarion still performs,
// and on his nod goes on to where they were going.
//
// It was the Scroll Rack until 2026-10-22.

import { useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from 'react';

import { openReports, reportsIsOpen } from '../api';
import {
  ACCEPTED_PERFORMANCE_HOLD_MS,
  ACCEPTED_STILL_HOLD_MS,
  DOOR_SWING_MS,
  refusalFor,
} from '../components/useAncarion';
import { CabinetArt } from './art';
import { ImageSlot } from './ImageSlot';
import { plainClick, useNavigate } from './nav';
import type { AncarionHandle } from './RoomPortrait';

type Stage = 'shut' | 'asking' | 'checking' | 'accepted' | 'opening';

/** With the writ already held: a nod, not the whole performance. */
const ACKNOWLEDGE_HOLD_MS = 900;
/** Reduced motion: the drawer is simply out, and the reader goes on. */
const STILL_OPEN_MS = 220;

const preloadCabinet = () => void import('./takeovers/Cabinet');

interface Props {
  ancarion: RefObject<AncarionHandle>;
  /** The slip's field, shared with the portrait so he knows when he is addressed. */
  field: RefObject<HTMLInputElement>;
  /** Where a reader who arrived without the writ was going; the slip opens for them. */
  sealed?: { href: string } | null;
}

export function Cabinet({ ancarion, field, sealed = null }: Props) {
  const navigate = useNavigate();
  const inputId = useId();
  const [stage, setStage] = useState<Stage>('shut');
  const [phrase, setPhrase] = useState('');
  const [status, setStatus] = useState('');
  const writ = useRef<Promise<boolean> | null>(null);
  const request = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);
  const denials = useRef(0);
  const target = useRef('/reports');

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

  // Turned back at the takeover for want of the writ: ask for the word here.
  useEffect(() => {
    if (!sealed) return;
    target.current = sealed.href;
    writ.current = Promise.resolve(false);
    ancarion.current?.warm();
    setStage('asking');
    setStatus('The Cabinet is sealed. State the word to open it.');
  }, [sealed, ancarion]);

  /** A reader drawing near: wake his reactions, fetch the Cabinet, ask after the writ once. */
  const approach = () => {
    ancarion.current?.warm();
    preloadCabinet();
    writ.current ??= reportsIsOpen();
  };

  const enter = () => navigate(target.current);

  /** The Fresh! drawer slides out, then the reader goes through. */
  const draw = (hold: number) => {
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
    target.current = '/reports';
    if (await (writ.current ?? Promise.resolve(false))) {
      setStage('accepted');
      ancarion.current?.accept();
      setStatus('Ancarion knows you. The Cabinet is opened.');
      draw(ACKNOWLEDGE_HOLD_MS);
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
      setStatus('“You are expected.” The Cabinet is unlocked.');
      draw(performs ? ACCEPTED_PERFORMANCE_HOLD_MS : ACCEPTED_STILL_HOLD_MS);
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
    <div className="cabinet-object" data-stage={stage}>
      <a
        href="/reports"
        className="object object--cabinet"
        data-object="cabinet"
        aria-label="The Cabinet: letters to High Command, filed by when they came, kept behind Ancarion's word."
        aria-expanded={asking}
        onClick={knock}
        onPointerEnter={approach}
        onFocus={approach}
      >
        <ImageSlot name="cabinet" className="object__art cabinet">
          <CabinetArt />
        </ImageSlot>
        <span className="plaque">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M6 11h12v10H6Z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          The Cabinet
        </span>
        <span className="describer" aria-hidden="true">
          Letters to High Command, filed by when they came.
        </span>
      </a>

      {(asking || stage === 'accepted' || stage === 'opening') && (
        <div className="cabinet-slip parchment" role="group" aria-label="The word for the Cabinet">
          {asking && (
            <form className="cabinet-slip__form" onSubmit={submit}>
              <label className="cabinet-slip__label" htmlFor={inputId}>
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
              <div className="cabinet-slip__actions">
                <button type="submit" className="btn" disabled={!phrase.trim() || busy}>
                  {stage === 'checking' ? 'Consulting the seal' : 'Present your words'}
                </button>
                <button type="button" className="btn btn--quiet" onClick={dismiss} disabled={busy}>
                  Withdraw
                </button>
              </div>
            </form>
          )}
          <p className="cabinet-slip__status" role="status" aria-live="polite">
            {status || ' '}
          </p>
          {busy && stage !== 'checking' && (
            <button type="button" className="cabinet-slip__skip" onClick={enter}>
              Skip opening
            </button>
          )}
        </div>
      )}
    </div>
  );
}

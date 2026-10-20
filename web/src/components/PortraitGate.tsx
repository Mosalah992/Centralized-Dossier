import { useEffect, useId, useRef, useState } from 'react';

import frame from '../assets/portrait-frame.png';
import { NirnSky } from './NirnSky';
import {
  ACCEPTED_PERFORMANCE_HOLD_MS,
  ACCEPTED_STILL_HOLD_MS,
  DOOR_SWING_MS,
  refusalFor,
  useAncarion,
  type AncarionClips,
} from './useAncarion';
import '../styles/portrait-gate.css';

export type { ClipSource, PortraitState } from './useAncarion';

export type GateDecision =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds?: number };

export interface PortraitGateProps {
  collection: string;
  eyebrow: string;
  description: string;
  clips?: Partial<AncarionClips>;
  verify: (passphrase: string, signal: AbortSignal) => Promise<GateDecision>;
  /** Starts the already-authorized route's data request behind the opening. */
  onAuthorized?: () => void;
  onGranted: () => void;
  /** Draws Nirn, Masser and Secunda behind the gate. Opt-in per volume. */
  sky?: boolean;
  /** A still painting drawn darkened behind the gate. Opt-in per volume. */
  backdrop?: string;
}

type AuthState = 'locked' | 'checking' | 'denied' | 'error' | 'authorized';

const BUSY: readonly AuthState[] = ['checking', 'authorized'];

/**
 * Presentation only: the supplied canvas and its frame always travel together.
 * Authorization remains with the per-volume Pages endpoint supplied by `verify`.
 * Ancarion's performance — clips, idling, dozing, voice — is useAncarion's;
 * this gate keeps the field, the check and the door he stands in.
 */
export function PortraitGate({
  collection,
  eyebrow,
  description,
  clips,
  verify,
  onAuthorized,
  onGranted,
  sky = false,
  backdrop,
}: PortraitGateProps) {
  const root = useRef<HTMLElement>(null);
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const ancarion = useAncarion({
    clips,
    scope: root,
    isAttending: () => document.activeElement === input.current,
  });
  const { portraitState, setPortraitState, reducedMotion } = ancarion;
  const [authState, setAuthState] = useState<AuthState>('locked');
  const [phrase, setPhrase] = useState('');
  const [dialogue, setDialogue] = useState('“State the phrase entrusted to you.”');
  const [status, setStatus] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const request = useRef<AbortController | null>(null);
  const openingTimer = useRef<number | null>(null);
  const denialCount = useRef(0);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    ancarion.clearReaction();
    setCanSkip(false);
    setPortraitState('open');
    onGranted();
  };

  useEffect(
    () => () => {
      request.current?.abort();
      if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (authState !== 'denied' && authState !== 'error') return;
    const frame = window.requestAnimationFrame(() => input.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [authState]);

  const notice = ancarion.notice;

  function settle() {
    if (authState === 'checking') return;
    ancarion.settle();
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (BUSY.includes(authState)) return;
    const passphrase = phrase;
    if (!passphrase.trim()) {
      setStatus('Enter the passphrase.');
      input.current?.focus();
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
    setAuthState('checking');
    ancarion.consult();
    setDialogue('“One moment. The register must be consulted.”');
    setStatus('Checking authorization…');

    try {
      const result = await verify(passphrase, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        denialCount.current += 1;
        const reaction = refusalFor(denialCount.current);
        setPhrase('');
        setAuthState('denied');
        ancarion.react(reaction);
        setDialogue('“That is not the phrase I was given.”');
        setStatus(
          result.retryAfterSeconds
            ? `The seal requires patience. Try again in ${result.retryAfterSeconds} seconds.`
            : result.message,
        );
        input.current?.focus();
        return;
      }

      setAuthState('authorized');
      const performs = ancarion.accept();
      setDialogue('“You are expected. Enter.”');
      setStatus('Authorization recognized.');
      setCanSkip(true);
      onAuthorized?.();
      if (reducedMotion) {
        finish();
        return;
      }
      openingTimer.current = window.setTimeout(
        () => {
          setPortraitState('opening');
          openingTimer.current = window.setTimeout(finish, DOOR_SWING_MS);
        },
        performs ? ACCEPTED_PERFORMANCE_HOLD_MS : ACCEPTED_STILL_HOLD_MS,
      );
    } catch {
      if (controller.signal.aborted && !timedOut) return;
      setAuthState('error');
      ancarion.rest();
      setDialogue('“The registry is beyond my reach. A moment of patience.”');
      setStatus(
        timedOut
          ? 'The authorization service took too long. Please retry.'
          : 'The authorization service could not be reached. Please retry.',
      );
      input.current?.focus();
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  };

  const busy = BUSY.includes(authState);
  return (
    <section
      ref={root}
      className="portrait-gate"
      data-state={portraitState}
      data-sky={sky ? 'true' : undefined}
      data-backdrop={backdrop ? 'true' : undefined}
      aria-busy={authState === 'checking'}
    >
      {sky && <NirnSky />}
      {backdrop && (
        <div className="portrait-gate__backdrop" aria-hidden="true">
          <img src={backdrop} alt="" decoding="async" />
        </div>
      )}
      <header className="portrait-gate__title">
        <p className="portrait-gate__allegiance">Third Aldmeri Dominion</p>
        <h1>{collection}</h1>
      </header>
      <div className="portrait-gate__stage" aria-hidden="true">
        <div className="portrait-gate__threshold">
          <p>The seal is lifted</p>
          <h2>You are expected.</h2>
        </div>
        <div className="portrait-gate__door">
          <div className="portrait-gate__aperture">{ancarion.media}</div>
          <img className="portrait-gate__frame" src={frame} alt="" />
        </div>
      </div>
      {ancarion.voice}

      {/* The portrait stands alone, with only the field beneath it. The words
          that used to sit beside it — the eyebrow, the description and
          Ancarion's spoken line, as a live region — are still here for anyone
          reading the gate with assistive technology. */}
      <div className="portrait-gate__copy">
        <p className="portrait-gate__eyebrow sr-only">{eyebrow} · Keeper of the threshold</p>
        <p className="portrait-gate__description sr-only">{description}</p>
        <p className="portrait-gate__dialogue sr-only" aria-live="polite">
          {dialogue}
        </p>
        <form className="portrait-gate__form" onSubmit={submit}>
          <label className="sr-only" htmlFor={inputId}>Passphrase</label>
          <input
            ref={input}
            id={inputId}
            type="password"
            placeholder="Passphrase"
            value={phrase}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-invalid={authState === 'denied'}
            onFocus={notice}
            onBlur={settle}
            onChange={(event) => {
              setPhrase(event.target.value);
              notice();
            }}
          />
          <button type="submit" disabled={!phrase.trim() || busy}>
            {authState === 'checking' ? 'Consulting the seal' : 'Present your words'}
          </button>
        </form>
        <p className="portrait-gate__status" role="status" aria-live="polite">
          {status || ' '}
        </p>
        {canSkip && (
          <button className="portrait-gate__skip" type="button" onClick={finish}>
            Skip opening
          </button>
        )}
      </div>
    </section>
  );
}

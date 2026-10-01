import { useEffect, useId, useRef, useState } from 'react';

import ancarion from '../assets/canonreeve.webp';
import ancarionIdle from '../assets/ancarion-living-portrait.mp4';
import frame from '../assets/portrait-frame.png';
import '../styles/portrait-gate.css';

export type GateDecision =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds?: number };

export interface PortraitGateProps {
  collection: string;
  eyebrow: string;
  description: string;
  clips?: Partial<Record<'idle' | 'listening' | 'denied' | 'accepted', string>>;
  verify: (passphrase: string, signal: AbortSignal) => Promise<GateDecision>;
  /** Starts the already-authorized route's data request behind the opening. */
  onAuthorized?: () => void;
  onGranted: () => void;
}

type GateState = 'locked' | 'checking' | 'denied' | 'error' | 'accepted' | 'opening';

const BUSY: readonly GateState[] = ['checking', 'accepted', 'opening'];
const DEFAULT_CLIPS = { idle: ancarionIdle } as const;

/**
 * Presentation only: the supplied canvas and its frame always travel together.
 * Authorization remains with the per-volume Pages endpoint supplied by `verify`.
 */
export function PortraitGate({ collection, eyebrow, description, clips = DEFAULT_CLIPS, verify, onAuthorized, onGranted }: PortraitGateProps) {
  const inputId = useId();
  const [state, setState] = useState<GateState>('locked');
  const [phrase, setPhrase] = useState('');
  const [dialogue, setDialogue] = useState('“State the phrase entrusted to you.”');
  const [status, setStatus] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeClip, setActiveClip] = useState<'idle' | 'listening' | 'denied' | 'accepted' | null>(null);
  const request = useRef<AbortController | null>(null);
  const openingTimer = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    setCanSkip(false);
    onGranted();
  };

  useEffect(() => () => {
    request.current?.abort();
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const clip = reducedMotion ? undefined : activeClip ? clips?.[activeClip] : undefined;
    const element = video.current;
    if (!element || !clip) return;
    element.currentTime = 0;
    void element.play().catch(() => setActiveClip(null));
  }, [activeClip, clips, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      setActiveClip(null);
      return;
    }
    const requested = state === 'checking'
      ? 'listening'
      : state === 'denied'
        ? 'denied'
        : state === 'accepted' || state === 'opening'
          ? 'accepted'
          : 'idle';
    setActiveClip(clips?.[requested] ? requested : clips?.idle ? 'idle' : null);
  }, [clips, reducedMotion, state]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (BUSY.includes(state)) return;
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
    setState('checking');
    setDialogue('“One moment. The register must be consulted.”');
    setStatus('Checking authorization…');

    try {
      const result = await verify(passphrase, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setPhrase('');
        setState('denied');
        setDialogue('“That is not the phrase I was given.”');
        setStatus(result.retryAfterSeconds
          ? `The seal requires patience. Try again in ${result.retryAfterSeconds} seconds.`
          : result.message);
        input.current?.focus();
        return;
      }

      setState('accepted');
      setDialogue('“You are expected. Enter.”');
      setStatus('Authorization recognized.');
      setCanSkip(true);
      onAuthorized?.();
      if (reducedMotion) {
        finish();
        return;
      }
      openingTimer.current = window.setTimeout(() => {
        setState('opening');
        openingTimer.current = window.setTimeout(finish, 1_250);
      }, 520);
    } catch {
      if (controller.signal.aborted && !timedOut) return;
      setState('error');
      setDialogue('“The registry is beyond my reach. A moment of patience.”');
      setStatus(timedOut
        ? 'The authorization service took too long. Please retry.'
        : 'The authorization service could not be reached. Please retry.');
      input.current?.focus();
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  };

  const busy = BUSY.includes(state);
  return (
    <section className="portrait-gate" data-state={state} aria-busy={state === 'checking'}>
      <div className="portrait-gate__stage" aria-hidden="true">
        <div className="portrait-gate__threshold">
          <p>The seal is lifted</p>
          <h2>You are expected.</h2>
        </div>
        <div className="portrait-gate__door">
          <div className="portrait-gate__aperture">
            <img className="portrait-gate__portrait" src={ancarion} alt="" />
            {activeClip && clips?.[activeClip] && !reducedMotion && (
              <video
                ref={video}
                className="portrait-gate__reaction"
                src={clips[activeClip]}
                muted
                playsInline
                preload="metadata"
                loop={activeClip === 'idle'}
                onError={() => setActiveClip(null)}
                onEnded={() => { if (activeClip !== 'idle') setActiveClip('idle'); }}
              />
            )}
          </div>
          <img className="portrait-gate__frame" src={frame} alt="" />
        </div>
      </div>

      <div className="portrait-gate__copy">
        <p className="portrait-gate__eyebrow">{eyebrow} · Keeper of the threshold</p>
        <h1>{collection}</h1>
        <p className="portrait-gate__description">{description}</p>
        <p className="portrait-gate__dialogue" aria-live="polite">{dialogue}</p>
        <form className="portrait-gate__form" onSubmit={submit}>
          <label htmlFor={inputId}>Passphrase</label>
          <input
            ref={input}
            id={inputId}
            type="password"
            value={phrase}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-invalid={state === 'denied'}
            onChange={(event) => setPhrase(event.target.value)}
          />
          <button type="submit" disabled={!phrase.trim() || busy}>
            {state === 'checking' ? 'Consulting the seal' : 'Present your words'}
          </button>
        </form>
        <p className="portrait-gate__status" role="status" aria-live="polite">{status || '\u00a0'}</p>
        {canSkip && <button className="portrait-gate__skip" type="button" onClick={finish}>Skip opening</button>}
      </div>
    </section>
  );
}

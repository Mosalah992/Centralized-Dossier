import { useGSAP } from '@gsap/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import ancarionAcceptedMp4 from '../assets/ancarion-accept.mp4';
import ancarionAcceptedWebm from '../assets/ancarion-accept.webm';
import ancarionIdleMp4 from '../assets/ancarion-idle.mp4';
import ancarionIdleWebm from '../assets/ancarion-idle.webm';
import ancarionDeniedMp4 from '../assets/ancarion-refusal.mp4';
import ancarionDeniedWebm from '../assets/ancarion-refusal.webm';
import ancarionAnnoyedMp4 from '../assets/ancarion-sigh.mp4';
import ancarionAnnoyedWebm from '../assets/ancarion-sigh.webm';
import ancarion from '../assets/canonreeve.webp';
import frame from '../assets/portrait-frame.png';
import { NirnSky } from './NirnSky';
import { D, gsap, staged } from '../motion';
import '../styles/portrait-gate.css';

export type GateDecision =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds?: number };

/** One source, or several in preference order (the browser plays the first it can). */
export type ClipSource = string | readonly string[];

export interface PortraitGateProps {
  collection: string;
  eyebrow: string;
  description: string;
  clips?: Partial<
    Record<'idle' | 'listening' | 'denied' | 'annoyed' | 'accepted', ClipSource>
  >;
  verify: (passphrase: string, signal: AbortSignal) => Promise<GateDecision>;
  /** Starts the already-authorized route's data request behind the opening. */
  onAuthorized?: () => void;
  onGranted: () => void;
  /** Draws Nirn, Masser and Secunda behind the gate. Opt-in per volume. */
  sky?: boolean;
}

type AuthState = 'locked' | 'checking' | 'denied' | 'error' | 'authorized';

export type PortraitState =
  | 'idle'
  | 'listening'
  | 'denied'
  | 'annoyed'
  | 'accepted'
  | 'opening'
  | 'open';

type ReactionState = Extract<PortraitState, 'denied' | 'annoyed' | 'accepted'>;

const BUSY: readonly AuthState[] = ['checking', 'authorized'];
// WebM first: it is a fifth of the MP4's size. The MP4 is for browsers
// without VP9.
const DEFAULT_CLIPS = {
  idle: [ancarionIdleWebm, ancarionIdleMp4],
  denied: [ancarionDeniedWebm, ancarionDeniedMp4],
  annoyed: [ancarionAnnoyedWebm, ancarionAnnoyedMp4],
  accepted: [ancarionAcceptedWebm, ancarionAcceptedMp4],
} satisfies Partial<Record<PortraitState, ClipSource>>;
const REACTION_STATES: ReactionState[] = ['denied', 'annoyed', 'accepted'];
const IDLE_REPLAY_PAUSE_MS = 2_000;
// Safety nets for a reaction whose `ended` never arrives; both performances
// run 5.04 s, and `ended` normally returns him to idle first.
const DENIED_FALLBACK_MS = 5_500;
const ANNOYED_FALLBACK_MS = 5_500;
// How long Ancarion holds before the door swings. A still needs only a beat;
// the accept performance's nod has finished and his eyes have reopened by
// about 3.7 s, and the clip plays on beneath the swinging door.
const ACCEPTED_STILL_HOLD_MS = 520;
const ACCEPTED_PERFORMANCE_HOLD_MS = 3_700;

function isReactionState(state: PortraitState): state is ReactionState {
  return REACTION_STATES.includes(state as ReactionState);
}

function sourceList(source: ClipSource): readonly string[] {
  return typeof source === 'string' ? [source] : source;
}

function isVideoAsset(source: ClipSource) {
  return /\.(?:mp4|webm)(?:[?#].*)?$/i.test(sourceList(source)[0] ?? '');
}

function videoType(source: string) {
  return /\.webm(?:[?#].*)?$/i.test(source) ? 'video/webm' : 'video/mp4';
}

/**
 * A <video> with <source> children reports a failed load on its last
 * <source>, not on itself, so the fallback handler goes there.
 */
function VideoSources({
  sources,
  onError,
}: {
  sources: readonly string[];
  onError: () => void;
}) {
  return (
    <>
      {sources.map((source, index) => (
        <source
          key={source}
          src={source}
          type={videoType(source)}
          onError={index === sources.length - 1 ? onError : undefined}
        />
      ))}
    </>
  );
}

interface ReactionLayerProps {
  state: ReactionState;
  source: ClipSource;
  active: boolean;
  onComplete: (state: ReactionState) => void;
  onFailure: (state: ReactionState) => void;
}

function ReactionLayer({
  state,
  source,
  active,
  onComplete,
  onFailure,
}: ReactionLayerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const videoAsset = isVideoAsset(source);
  const sources = sourceList(source);
  const sourceKey = sources.join('|');

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!active) {
      element.pause();
      return;
    }

    element.currentTime = 0;
    void element.play().catch(() => onFailure(state));
  }, [active, onFailure, sourceKey, state]);

  if (videoAsset) {
    return (
      <video
        key={sourceKey}
        ref={video}
        className="portrait-gate__reaction"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        data-active={active}
        onEnded={() => onComplete(state)}
        onError={() => onFailure(state)}
      >
        <VideoSources sources={sources} onError={() => onFailure(state)} />
      </video>
    );
  }

  return (
    <img
      className="portrait-gate__reaction"
      src={sources[0]}
      alt=""
      aria-hidden="true"
      data-active={active}
      onError={() => onFailure(state)}
    />
  );
}

/**
 * Presentation only: the supplied canvas and its frame always travel together.
 * Authorization remains with the per-volume Pages endpoint supplied by `verify`.
 */
export function PortraitGate({
  collection,
  eyebrow,
  description,
  clips = DEFAULT_CLIPS,
  verify,
  onAuthorized,
  onGranted,
  sky = false,
}: PortraitGateProps) {
  const root = useRef<HTMLElement>(null);
  const inputId = useId();
  const [authState, setAuthState] = useState<AuthState>('locked');
  const [portraitState, setPortraitState] = useState<PortraitState>('idle');
  const [phrase, setPhrase] = useState('');
  const [dialogue, setDialogue] = useState('“State the phrase entrusted to you.”');
  const [status, setStatus] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [idleUnavailable, setIdleUnavailable] = useState(false);
  const [failedReactions, setFailedReactions] = useState<
    Partial<Record<ReactionState, true>>
  >({});
  const request = useRef<AbortController | null>(null);
  const openingTimer = useRef<number | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const idleReplayTimer = useRef<number | null>(null);
  const denialCount = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const idleVideo = useRef<HTMLVideoElement>(null);
  const aura = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  const idleSources = sourceList(clips.idle ?? DEFAULT_CLIPS.idle);
  const idleKey = idleSources.join('|');
  const acceptedSource = clips.accepted ?? DEFAULT_CLIPS.accepted;
  const activeReaction = isReactionState(portraitState) ? portraitState : null;

  const markReactionFailed = useCallback((reaction: ReactionState) => {
    setFailedReactions((current) => ({ ...current, [reaction]: true }));
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    if (idleReplayTimer.current !== null) window.clearTimeout(idleReplayTimer.current);
    setCanSkip(false);
    setPortraitState('open');
    onGranted();
  };

  useEffect(
    () => () => {
      request.current?.abort();
      if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
      if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
      if (idleReplayTimer.current !== null) window.clearTimeout(idleReplayTimer.current);
    },
    [],
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = idleVideo.current;
    if (!element) return;
    if (reducedMotion || idleUnavailable) {
      if (idleReplayTimer.current !== null) {
        window.clearTimeout(idleReplayTimer.current);
        idleReplayTimer.current = null;
      }
      element.pause();
      return;
    }

    void element.play().catch(() => setIdleUnavailable(true));
  }, [idleKey, idleUnavailable, reducedMotion]);

  const pauseBeforeIdleReplay = useCallback(() => {
    if (reducedMotion || idleUnavailable) return;
    if (idleReplayTimer.current !== null) window.clearTimeout(idleReplayTimer.current);
    idleReplayTimer.current = window.setTimeout(() => {
      idleReplayTimer.current = null;
      const element = idleVideo.current;
      if (!element) return;
      element.currentTime = 0;
      void element.play().catch(() => setIdleUnavailable(true));
    }, IDLE_REPLAY_PAUSE_MS);
  }, [idleUnavailable, reducedMotion]);

  useEffect(() => {
    if (authState !== 'denied' && authState !== 'error') return;
    const frame = window.requestAnimationFrame(() => input.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [authState]);

  useGSAP(
    () =>
      staged(({ moving }) => {
        if (!moving) return;

        // Only a new reaction fades in; the accept clip carried into the
        // opening is already showing.
        const activeLayer = isReactionState(portraitState)
          ? root.current?.querySelector<HTMLElement>(
              '.portrait-gate__reaction[data-active="true"]',
            )
          : null;
        const auraElement = aura.current;
        const timeline = gsap.timeline();

        if (activeLayer) {
          timeline.fromTo(
            activeLayer,
            { opacity: 0 },
            { opacity: 1, duration: D.leaf, ease: 'draw' },
            0,
          );
        }

        if (auraElement && portraitState === 'listening') {
          timeline.fromTo(
            auraElement,
            { opacity: 0.18 },
            { opacity: 0.36, duration: D.hand, ease: 'quiet' },
            0,
          );
        } else if (
          auraElement &&
          (portraitState === 'denied' || portraitState === 'annoyed')
        ) {
          timeline.fromTo(
            auraElement,
            { opacity: 0.28 },
            {
              opacity: portraitState === 'annoyed' ? 0.06 : 0.1,
              duration: D.leaf,
              ease: 'quiet',
            },
            0,
          );
        } else if (auraElement && portraitState === 'accepted') {
          timeline.fromTo(
            auraElement,
            { opacity: 0.2 },
            { opacity: 0.58, duration: D.hand, ease: 'quiet' },
            0,
          );
        }

        return () => timeline.kill();
      }),
    {
      scope: root,
      dependencies: [portraitState],
      revertOnUpdate: true,
    },
  );

  function notice() {
    setPortraitState((current) =>
      current === 'idle' || current === 'listening' ? 'listening' : current,
    );
  }

  function settle() {
    if (authState === 'checking') return;
    setPortraitState((current) => (current === 'listening' ? 'idle' : current));
  }

  function returnFromReaction(delay: number) {
    if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => {
      setPortraitState(document.activeElement === input.current ? 'listening' : 'idle');
      reactionTimer.current = null;
    }, delay);
  }

  const completeReaction = useCallback(
    (reaction: ReactionState) => {
      if (reaction === 'accepted' || activeReaction !== reaction) return;
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
        reactionTimer.current = null;
      }
      setPortraitState(document.activeElement === input.current ? 'listening' : 'idle');
    },
    [activeReaction],
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (BUSY.includes(authState)) return;
    const passphrase = phrase;
    if (!passphrase.trim()) {
      setStatus('Enter the passphrase.');
      input.current?.focus();
      return;
    }

    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = null;
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
    setPortraitState('listening');
    setDialogue('“One moment. The register must be consulted.”');
    setStatus('Checking authorization…');

    try {
      const result = await verify(passphrase, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        denialCount.current += 1;
        const reaction: ReactionState = denialCount.current > 1 ? 'annoyed' : 'denied';
        setPhrase('');
        setAuthState('denied');
        setPortraitState(reaction);
        setDialogue('“That is not the phrase I was given.”');
        setStatus(
          result.retryAfterSeconds
            ? `The seal requires patience. Try again in ${result.retryAfterSeconds} seconds.`
            : result.message,
        );
        input.current?.focus();
        returnFromReaction(
          reaction === 'annoyed' ? ANNOYED_FALLBACK_MS : DENIED_FALLBACK_MS,
        );
        return;
      }

      setAuthState('authorized');
      setPortraitState('accepted');
      setDialogue('“You are expected. Enter.”');
      setStatus('Authorization recognized.');
      setCanSkip(true);
      onAuthorized?.();
      if (reducedMotion) {
        finish();
        return;
      }
      const performs = isVideoAsset(acceptedSource) && !failedReactions.accepted;
      openingTimer.current = window.setTimeout(
        () => {
          setPortraitState('opening');
          openingTimer.current = window.setTimeout(finish, 1_250);
        },
        performs ? ACCEPTED_PERFORMANCE_HOLD_MS : ACCEPTED_STILL_HOLD_MS,
      );
    } catch {
      if (controller.signal.aborted && !timedOut) return;
      setAuthState('error');
      setPortraitState(document.activeElement === input.current ? 'listening' : 'idle');
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
      aria-busy={authState === 'checking'}
    >
      {sky && <NirnSky />}
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
          <div className="portrait-gate__aperture">
            <div
              className="portrait-gate__media-stage"
              data-idle-failed={idleUnavailable || reducedMotion}
            >
              <img className="portrait-gate__portrait" src={ancarion} alt="" />
              <video
                ref={idleVideo}
                key={idleKey}
                className="portrait-gate__idle"
                poster={ancarion}
                autoPlay
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                onEnded={pauseBeforeIdleReplay}
                onError={() => setIdleUnavailable(true)}
              >
                <VideoSources sources={idleSources} onError={() => setIdleUnavailable(true)} />
              </video>
              {REACTION_STATES.map((reaction) => {
                const source = clips[reaction] ?? DEFAULT_CLIPS[reaction];
                if (!source || failedReactions[reaction]) return null;
                return (
                  <ReactionLayer
                    key={reaction}
                    state={reaction}
                    source={source}
                    // The accept performance keeps playing while the door swings.
                    active={
                      activeReaction === reaction ||
                      (reaction === 'accepted' && portraitState === 'opening')
                    }
                    onComplete={completeReaction}
                    onFailure={markReactionFailed}
                  />
                );
              })}
              <span ref={aura} className="portrait-gate__aura" />
            </div>
          </div>
          <img className="portrait-gate__frame" src={frame} alt="" />
        </div>
      </div>

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
          {status || '\u00a0'}
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

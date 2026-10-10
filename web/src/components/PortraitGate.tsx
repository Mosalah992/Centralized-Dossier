import { useGSAP } from '@gsap/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import ancarionAcceptedMp4 from '../assets/ancarion-accept.mp4';
import ancarionAcceptedWebm from '../assets/ancarion-accept.webm';
import ancarionAsleep from '../assets/ancarion-asleep.webp';
import ancarionDozeMp4 from '../assets/ancarion-doze.mp4';
import ancarionDozeWebm from '../assets/ancarion-doze.webm';
import ancarionAppraiseMp4 from '../assets/ancarion-idle-appraise.mp4';
import ancarionAppraiseWebm from '../assets/ancarion-idle-appraise.webm';
import ancarionBreatheMp4 from '../assets/ancarion-idle-breathe.mp4';
import ancarionBreatheWebm from '../assets/ancarion-idle-breathe.webm';
import ancarionDrowseMp4 from '../assets/ancarion-idle-drowse.mp4';
import ancarionDrowseWebm from '../assets/ancarion-idle-drowse.webm';
import ancarionSmokeMp4 from '../assets/ancarion-idle-smoke.mp4';
import ancarionSmokeWebm from '../assets/ancarion-idle-smoke.webm';
import ancarionIdleMp4 from '../assets/ancarion-idle.mp4';
import ancarionIdleWebm from '../assets/ancarion-idle.webm';
import ancarionListeningMp4 from '../assets/ancarion-listening.mp4';
import ancarionListeningWebm from '../assets/ancarion-listening.webm';
import ancarionDeniedMp4 from '../assets/ancarion-refusal.mp4';
import ancarionDeniedWebm from '../assets/ancarion-refusal.webm';
import ancarionRebuffedMp4 from '../assets/ancarion-shake.mp4';
import ancarionRebuffedWebm from '../assets/ancarion-shake.webm';
import ancarionAnnoyedMp4 from '../assets/ancarion-sigh.mp4';
import ancarionAnnoyedWebm from '../assets/ancarion-sigh.webm';
import ancarionWakeMp4 from '../assets/ancarion-wake.mp4';
import ancarionWakeWebm from '../assets/ancarion-wake.webm';
import ancarion from '../assets/canonreeve.webp';
import frame from '../assets/portrait-frame.png';
import { AMBIENCE_CHANGED_EVENT, ambienceWanted } from './Ambience';
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
    Record<
      'idle' | 'listening' | 'denied' | 'rebuffed' | 'annoyed' | 'accepted' | 'doze' | 'wake',
      ClipSource
    >
  >;
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

export type PortraitState =
  | 'idle'
  | 'listening'
  | 'denied'
  | 'rebuffed'
  | 'annoyed'
  | 'accepted'
  | 'opening'
  | 'open'
  | 'dozing'
  | 'asleep'
  | 'waking';

type ReactionState = Extract<PortraitState, 'denied' | 'rebuffed' | 'annoyed' | 'accepted'>;
/** Every clip that plays over the idle layer. */
type Performance = ReactionState | 'listening' | 'doze' | 'wake';
type Line = 'greet' | 'denied' | 'rebuffed' | 'annoyed' | 'accepted' | 'woken';

const BUSY: readonly AuthState[] = ['checking', 'authorized'];
// WebM first: it is a fifth of the MP4's size. The MP4 is for browsers
// without VP9.
const DEFAULT_CLIPS = {
  idle: [ancarionIdleWebm, ancarionIdleMp4],
  listening: [ancarionListeningWebm, ancarionListeningMp4],
  denied: [ancarionDeniedWebm, ancarionDeniedMp4],
  // The original head-shake, kept for the second refusal.
  rebuffed: [ancarionRebuffedWebm, ancarionRebuffedMp4],
  annoyed: [ancarionAnnoyedWebm, ancarionAnnoyedMp4],
  accepted: [ancarionAcceptedWebm, ancarionAcceptedMp4],
  doze: [ancarionDozeWebm, ancarionDozeMp4],
  wake: [ancarionWakeWebm, ancarionWakeMp4],
} satisfies Record<'idle' | Performance, ClipSource>;
// With the plain idle, the moments he plays back to back while nothing else is
// happening. Each starts and ends on the still, like every other clip.
const IDLE_VARIANTS: readonly ClipSource[] = [
  [ancarionAppraiseWebm, ancarionAppraiseMp4],
  [ancarionSmokeWebm, ancarionSmokeMp4],
  [ancarionBreatheWebm, ancarionBreatheMp4],
  [ancarionDrowseWebm, ancarionDrowseMp4],
];
const REACTION_STATES: ReactionState[] = ['denied', 'rebuffed', 'annoyed', 'accepted'];
const PERFORMANCES: Performance[] = [...REACTION_STATES, 'listening', 'doze', 'wake'];
// Safety nets for a reaction whose `ended` never arrives; the performances
// run 4.67-5.04 s, and `ended` normally returns him to idle first.
const DENIED_FALLBACK_MS = 5_500;
const ANNOYED_FALLBACK_MS = 5_500;
// How long Ancarion holds before the door swings. A still needs only a beat;
// the accept performance's nod has finished and his eyes have reopened by
// about 3.7 s, and the clip plays on beneath the swinging door.
const ACCEPTED_STILL_HOLD_MS = 520;
const ACCEPTED_PERFORMANCE_HOLD_MS = 3_700;
// Left alone, he nods off; sooner at night, when he is asleep on arrival.
const DOZE_AFTER_MS = 45_000;
const NIGHT_DOZE_AFTER_MS = 20_000;
const STIRRING_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'focusin'] as const;
/** Matches Dispatch: a voice carries words, so it sits well above the room tone. */
const VOICE_VOLUME = 0.85;

// Unlike the covers, the recordings are optional: a line nobody has recorded
// yet is silence, not a build error.
const VOICE_FILES = import.meta.glob<string>('../assets/voice/ancarion-*.{ogg,mp3,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function voiceLine(line: Line): string | undefined {
  const match = Object.keys(VOICE_FILES).find((path) =>
    path.split('/').pop()?.startsWith(`ancarion-${line}.`),
  );
  return match ? VOICE_FILES[match] : undefined;
}

function isNight(date = new Date()) {
  const hour = date.getHours();
  return hour >= 23 || hour < 6;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isReactionState(state: PortraitState): state is ReactionState {
  return REACTION_STATES.includes(state as ReactionState);
}

function sourceList(source: ClipSource): readonly string[] {
  return typeof source === 'string' ? [source] : source;
}

function isVideoAsset(source: ClipSource) {
  return /\.(?:mp4|webm)(?:[?#].*)?$/i.test(sourceList(source)[0] ?? '');
}

/**
 * Only a missing or unplayable source retires a clip. A play() cut short by a
 * pause(), or held by autoplay policy, will succeed another time.
 */
function cannotPlay(error: unknown) {
  return error instanceof DOMException && error.name === 'NotSupportedError';
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
  state: Performance;
  source: ClipSource;
  active: boolean;
  /** Shown until the clip has a frame: the frame the clip starts on. */
  poster: string;
  preload: 'auto' | 'metadata';
  onComplete: (state: Performance) => void;
  onFailure: (state: Performance) => void;
}

function ReactionLayer({
  state,
  source,
  active,
  poster,
  preload,
  onComplete,
  onFailure,
}: ReactionLayerProps) {
  const video = useRef<HTMLVideoElement>(null);
  // Read at rejection time; as an effect dependency it would restart the
  // clip whenever the parent re-renders with a new callback.
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
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
    // Interrupted or held back this once: skip the performance, keep the clip.
    void element.play().catch((error) => (cannotPlay(error) ? onFailure(state) : completeRef.current(state)));
  }, [active, onFailure, sourceKey, state]);

  if (videoAsset) {
    return (
      <video
        key={sourceKey}
        ref={video}
        className="portrait-gate__reaction"
        poster={poster}
        muted
        playsInline
        preload={preload}
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
  backdrop,
}: PortraitGateProps) {
  const root = useRef<HTMLElement>(null);
  const inputId = useId();
  const [authState, setAuthState] = useState<AuthState>('locked');
  // At night he is found asleep, as the portraits in the corridors are.
  const [portraitState, setPortraitState] = useState<PortraitState>(() =>
    isNight() && !prefersReducedMotion() ? 'asleep' : 'idle',
  );
  const [phrase, setPhrase] = useState('');
  const [dialogue, setDialogue] = useState('“State the phrase entrusted to you.”');
  const [status, setStatus] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [idleUnavailable, setIdleUnavailable] = useState(false);
  // 0 is the plain idle; 1.. index IDLE_VARIANTS.
  const [idleClip, setIdleClip] = useState(0);
  const [failedIdleVariants, setFailedIdleVariants] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  // The listening clip plays once when he first notices the reader, not on
  // every keystroke or after every refusal.
  const [attentive, setAttentive] = useState(false);
  const [failedPerformances, setFailedPerformances] = useState<
    Partial<Record<Performance, true>>
  >({});
  const request = useRef<AbortController | null>(null);
  const openingTimer = useRef<number | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const denialCount = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const idleVideo = useRef<HTMLVideoElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const greeted = useRef(false);
  // Stirred while still nodding off: wake as soon as the doze finishes.
  const wakeAfterDoze = useRef(false);
  const aura = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  const idlePool = [clips.idle ?? DEFAULT_CLIPS.idle, ...IDLE_VARIANTS];
  const idleSources = sourceList(idlePool[idleClip] ?? idlePool[0]!);
  const idleKey = idleSources.join('|');
  const acceptedSource = clips.accepted ?? DEFAULT_CLIPS.accepted;
  const activeReaction = isReactionState(portraitState) ? portraitState : null;
  const canDoze = !failedPerformances.doze && !failedPerformances.wake;
  const hasVoice = Object.keys(VOICE_FILES).length > 0;
  const overlaid =
    portraitState === 'asleep' ||
    PERFORMANCES.some(
      (performance) => !failedPerformances[performance] && performanceActive(performance),
    );

  const speak = useCallback((line: Line) => {
    const audio = voice.current;
    const source = voiceLine(line);
    if (!audio || !source || !ambienceWanted()) return;
    audio.src = source;
    audio.currentTime = 0;
    audio.volume = VOICE_VOLUME;
    // Without a gesture first the browser refuses, and silence is right then.
    void audio.play().catch(() => {});
  }, []);

  const markPerformanceFailed = useCallback((performance: Performance) => {
    setFailedPerformances((current) => ({ ...current, [performance]: true }));
    if (performance === 'listening') setAttentive(false);
    if (performance === 'doze' || performance === 'wake') {
      setPortraitState((current) =>
        current === 'dozing' || current === 'asleep' || current === 'waking' ? 'idle' : current,
      );
    }
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    setCanSkip(false);
    setPortraitState('open');
    onGranted();
  };

  useEffect(
    () => () => {
      request.current?.abort();
      if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
      if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    },
    [],
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) {
        setPortraitState((current) =>
          current === 'dozing' || current === 'asleep' || current === 'waking' ? 'idle' : current,
        );
      }
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // While another clip covers him the idle waits on its first frame, the
  // still, and starts from there once the cover lifts, so every hand-off is
  // still to still. It also starts each newly mounted idle clip; nextIdle
  // decides which one that is.
  useEffect(() => {
    const element = idleVideo.current;
    if (!element) return;
    if (reducedMotion || idleUnavailable || overlaid) {
      element.pause();
      if (overlaid) element.currentTime = 0;
      return;
    }

    element.currentTime = 0;
    void element.play().catch((error) => cannotPlay(error) && setIdleUnavailable(true));
  }, [idleKey, idleUnavailable, overlaid, reducedMotion]);

  // He never rests on the still: the next idle moment follows at once, drawn
  // from all of them but never the one just played, so nothing recurs on a
  // fixed beat.
  const nextIdle = useCallback(() => {
    if (reducedMotion || idleUnavailable) return;
    const choices = [0, ...IDLE_VARIANTS.map((_, index) => index + 1)].filter(
      (index) => index !== idleClip && !failedIdleVariants.has(index),
    );
    const next =
      choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)]! : idleClip;
    if (next !== idleClip) {
      // A different clip mounts in its place and the effect above starts it.
      setIdleClip(next);
      return;
    }
    const element = idleVideo.current;
    if (!element) return;
    element.currentTime = 0;
    void element.play().catch((error) => cannotPlay(error) && setIdleUnavailable(true));
  }, [failedIdleVariants, idleClip, idleUnavailable, reducedMotion]);

  const idleFailed = useCallback(() => {
    if (idleClip === 0) {
      setIdleUnavailable(true);
      return;
    }
    // A variant that will not play is dropped; the plain idle carries on.
    setFailedIdleVariants((current) => new Set(current).add(idleClip));
    setIdleClip(0);
  }, [idleClip]);

  // Left alone he dozes off; any stir wakes him.
  useEffect(() => {
    if (reducedMotion || !canDoze) return;
    const after = isNight() ? NIGHT_DOZE_AFTER_MS : DOZE_AFTER_MS;
    let timer: number | null = null;
    const arm = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        // Nobody watching: he is simply asleep when the reader comes back.
        const watched = document.visibilityState === 'visible';
        setPortraitState((current) =>
          current === 'idle' ? (watched ? 'dozing' : 'asleep') : current,
        );
      }, after);
    };
    const stir = () => {
      setPortraitState((current) => {
        if (current === 'asleep') return 'waking';
        if (current === 'dozing') wakeAfterDoze.current = true;
        return current;
      });
      arm();
    };
    for (const name of STIRRING_EVENTS) window.addEventListener(name, stir, { passive: true });
    arm();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      for (const name of STIRRING_EVENTS) window.removeEventListener(name, stir);
    };
  }, [canDoze, reducedMotion]);

  useEffect(() => {
    if (portraitState === 'waking') speak('woken');
  }, [portraitState, speak]);

  // The roundel in the corner silences him too, mid-sentence if need be.
  useEffect(() => {
    const onPreferenceChange = () => {
      if (!ambienceWanted()) voice.current?.pause();
    };
    window.addEventListener(AMBIENCE_CHANGED_EVENT, onPreferenceChange);
    return () => window.removeEventListener(AMBIENCE_CHANGED_EVENT, onPreferenceChange);
  }, []);

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
          (portraitState === 'denied' ||
            portraitState === 'rebuffed' ||
            portraitState === 'annoyed')
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
    // Asleep, dozing or waking: the stir handler wakes him, and he turns to
    // the field once the wake has played.
    if (portraitState !== 'idle') return;
    setPortraitState('listening');
    if (!reducedMotion && !failedPerformances.listening) setAttentive(true);
    if (!greeted.current) {
      greeted.current = true;
      speak('greet');
    }
  }

  function settle() {
    if (authState === 'checking') return;
    setAttentive(false);
    setPortraitState((current) => (current === 'listening' ? 'idle' : current));
  }

  function returnFromReaction(delay: number) {
    if (reactionTimer.current !== null) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => {
      setPortraitState(document.activeElement === input.current ? 'listening' : 'idle');
      reactionTimer.current = null;
    }, delay);
  }

  const completePerformance = useCallback(
    (performance: Performance) => {
      const attending = document.activeElement === input.current;
      if (performance === 'listening') {
        setAttentive(false);
        return;
      }
      if (performance === 'doze') {
        const wake = wakeAfterDoze.current;
        wakeAfterDoze.current = false;
        setPortraitState((current) =>
          current === 'dozing' ? (wake || attending ? 'waking' : 'asleep') : current,
        );
        return;
      }
      if (performance === 'wake') {
        setPortraitState((current) =>
          current === 'waking' ? (attending ? 'listening' : 'idle') : current,
        );
        // Woken by a reader at the field: the greeting he slept through.
        if (attending && !greeted.current) {
          greeted.current = true;
          speak('greet');
        }
        return;
      }
      if (performance === 'accepted' || activeReaction !== performance) return;
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
        reactionTimer.current = null;
      }
      setPortraitState(attending ? 'listening' : 'idle');
    },
    [activeReaction, speak],
  );

  function performanceActive(performance: Performance) {
    switch (performance) {
      // The accept performance keeps playing while the door swings.
      case 'accepted':
        return portraitState === 'accepted' || portraitState === 'opening';
      case 'listening':
        return portraitState === 'listening' && attentive;
      case 'doze':
        return portraitState === 'dozing';
      case 'wake':
        return portraitState === 'waking';
      default:
        return portraitState === performance;
    }
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
    setAttentive(false);
    setPortraitState('listening');
    setDialogue('“One moment. The register must be consulted.”');
    setStatus('Checking authorization…');

    try {
      const result = await verify(passphrase, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        denialCount.current += 1;
        // His patience wears: narrowed eyes, then the head-shake, then sighs.
        const reaction: ReactionState =
          denialCount.current === 1 ? 'denied' : denialCount.current === 2 ? 'rebuffed' : 'annoyed';
        setPhrase('');
        setAuthState('denied');
        setPortraitState(reaction);
        speak(reaction);
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
      speak('accepted');
      setDialogue('“You are expected. Enter.”');
      setStatus('Authorization recognized.');
      setCanSkip(true);
      onAuthorized?.();
      if (reducedMotion) {
        finish();
        return;
      }
      const performs = isVideoAsset(acceptedSource) && !failedPerformances.accepted;
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
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                onEnded={nextIdle}
                onError={idleFailed}
              >
                <VideoSources sources={idleSources} onError={idleFailed} />
              </video>
              {PERFORMANCES.map((performance) => {
                const source = clips[performance] ?? DEFAULT_CLIPS[performance];
                if (!source || failedPerformances[performance]) return null;
                return (
                  <ReactionLayer
                    key={performance}
                    state={performance}
                    source={source}
                    active={performanceActive(performance)}
                    poster={performance === 'wake' ? ancarionAsleep : ancarion}
                    // Doze and wake are needed only after a long quiet; the
                    // poster covers the moment either takes to load.
                    preload={performance === 'doze' || performance === 'wake' ? 'metadata' : 'auto'}
                    onComplete={completePerformance}
                    onFailure={markPerformanceFailed}
                  />
                );
              })}
              <img
                className="portrait-gate__reaction"
                src={ancarionAsleep}
                alt=""
                aria-hidden="true"
                data-active={portraitState === 'asleep'}
              />
              <span ref={aura} className="portrait-gate__aura" />
            </div>
          </div>
          <img className="portrait-gate__frame" src={frame} alt="" />
        </div>
      </div>
      {hasVoice && <audio ref={voice} preload="auto" aria-hidden="true" />}

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
          {status || ' '}
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

// The archive's ambience. A looping track, a visible control, and a remembered
// preference.
//
// Browsers refuse to play sound before the reader has interacted with the
// page, and a page that made noise the moment it loaded would deserve to be
// refused. So: the track waits for the first deliberate gesture — breaking
// the seal, or any click or key press for a member who already holds a writ —
// and the roundel in the corner stops it for good if it is unwelcome.
//
// Which track plays depends on where the reader is standing: the hall has its
// own tone, and History of the Realm its own. The component is mounted once for
// the whole archive and takes the track as a prop, rather than each volume
// mounting its own player — two elements would talk over each other, and the
// mute the reader chose in the hall would not be honoured in the volume.

import { useCallback, useEffect, useRef, useState } from 'react';
import './Ambience.css';

interface Props {
  /**
   * Bundled URL of the loop to play. Changing it swaps the source on the one
   * element: the previous track stops where it stands and the new one fades in
   * from silence. Not a true crossfade — that would need two elements — but
   * walking into a different room is a cut, not a blend.
   */
  track: string;
}

const STORAGE_KEY = 'archive:ambience';
/** Under a reading voice. This is a room tone, not a performance. */
const VOLUME = 0.32;
const FADE_MS = 1600;

const remembered = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    // Private browsing with storage denied — treat as the default.
    return true;
  }
};

const remember = (wanted: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, wanted ? 'on' : 'off');
  } catch {
    /* nothing to do; the preference simply will not survive the visit */
  }
};

export function Ambience({ track }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number>();
  const [wanted, setWanted] = useState(remembered);
  const [sounding, setSounding] = useState(false);

  /** Ramp in rather than cut in, so the track arrives under the page. */
  const fadeIn = useCallback((audio: HTMLAudioElement) => {
    window.clearInterval(fadeRef.current);
    audio.volume = 0;
    const started = performance.now();
    fadeRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / FADE_MS);
      audio.volume = VOLUME * progress;
      if (progress === 1) window.clearInterval(fadeRef.current);
    }, 40);
  }, []);

  const start = useCallback(
    (audio: HTMLAudioElement) => {
      fadeIn(audio);
      // Must be called synchronously inside the gesture on iOS Safari.
      return audio.play().then(
        () => setSounding(true),
        () => setSounding(false),
      );
    },
    [fadeIn],
  );

  // Try immediately; if the browser refuses, wait for the first gesture. Also
  // runs when `track` changes: React has already swapped the element's src by
  // the time effects fire, so this starts the new loop rather than the old.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !wanted) return;

    void start(audio);

    const onGesture = () => {
      if (audioRef.current && audioRef.current.paused) void start(audioRef.current);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    for (const event of events) {
      window.addEventListener(event, onGesture, { once: true, passive: true });
    }
    return () => {
      for (const event of events) window.removeEventListener(event, onGesture);
    };
  }, [wanted, start, track]);

  useEffect(() => () => window.clearInterval(fadeRef.current), []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (wanted) {
      window.clearInterval(fadeRef.current);
      audio.pause();
      setSounding(false);
      setWanted(false);
      remember(false);
    } else {
      setWanted(true);
      remember(true);
      void start(audio);
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={track}
        loop
        preload={wanted ? 'auto' : 'none'}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`ambience${sounding ? ' ambience--sounding' : ''}`}
        onClick={toggle}
        aria-pressed={sounding}
        aria-label={wanted ? 'Silence the hall' : 'Let the hall sound'}
        title={wanted ? 'Silence the hall' : 'Let the hall sound'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {wanted ? (
            <>
              <path d="M15.4 9.2a4 4 0 0 1 0 5.6" />
              <path d="M17.9 6.8a7.5 7.5 0 0 1 0 10.4" />
            </>
          ) : (
            <path d="M16 9.5l5 5m0-5l-5 5" />
          )}
        </svg>
      </button>
    </>
  );
}

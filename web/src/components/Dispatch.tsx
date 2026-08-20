// A dispatch that repeats itself.
//
// The Stipends Registry carries a spoken message from Celeriel, and it is meant
// to be heard more than once: it sounds shortly after the volume is opened and
// again on an interval for as long as the reader stays with the register.
//
// This is NOT the ambience, and deliberately not part of it. The hall's tone is
// a single looping element mounted once in App, whose whole design is that one
// track plays at a time and swapping it cuts the previous one off. A message is
// the opposite shape — a short one-shot that must layer over the room tone
// rather than replace it — so it gets its own element and its own timer.
//
// WHAT IT MUST NOT DO is speak after the reader has asked for silence. That
// roundel in the corner is the only sound control the archive offers, and a
// voice which ignored it would make the control a lie: the reader would mute
// the hall, hear a woman start talking three minutes later, and have nowhere
// to go. So the preference is read from Ambience before every playing, and the
// component listens for the moment it changes.

import { useEffect, useRef } from 'react';
import { AMBIENCE_CHANGED_EVENT, ambienceWanted } from './Ambience';

interface Props {
  /** Bundled or public URL of the recording. */
  src: string;
  /** Milliseconds between repeats. */
  every: number;
  /**
   * Milliseconds before the first playing. Deliberately short rather than a
   * full interval: a reader who consults the registry for two minutes and
   * leaves should still have heard the message once, and a message nobody
   * stays long enough to hear is not a message.
   */
  settle?: number;
}

/**
 * Well above the hall's 0.32, because this one carries words. A room tone can
 * sit under the reading; a voice that does is just mud.
 */
const VOLUME = 0.85;

export function Dispatch({ src, every, settle = 6000 }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let first: number | undefined;
    let repeat: number | undefined;

    const speak = () => {
      const audio = audioRef.current;
      if (!audio || !ambienceWanted()) return;

      // Rewind first: without this a second playing resumes from the end of the
      // first and returns silence.
      audio.currentTime = 0;
      audio.volume = VOLUME;

      // Autoplay is allowed here because getting to this volume took gestures —
      // the seal, then the book — and user activation is sticky for the page
      // once given. Where a browser refuses anyway, the round is simply skipped
      // rather than retried: a message that fought the autoplay policy would
      // arrive at some arbitrary later moment, which is worse than not arriving.
      void audio.play().catch(() => {});
    };

    first = window.setTimeout(() => {
      speak();
      repeat = window.setInterval(speak, every);
    }, settle);

    // Silence stops a message already in progress, not merely the next one.
    // Waiting for the current playing to finish would be the wrong reading of a
    // button labelled "Silence the hall".
    const onPreferenceChange = () => {
      if (ambienceWanted()) return;
      audioRef.current?.pause();
    };
    window.addEventListener(AMBIENCE_CHANGED_EVENT, onPreferenceChange);

    // Leaving the volume ends it. The timers belong to this mounting, and App
    // remounts per slug, so walking back to the cabinet stops the message
    // rather than leaving it to fire over some other register.
    return () => {
      window.clearTimeout(first);
      window.clearInterval(repeat);
      window.removeEventListener(AMBIENCE_CHANGED_EVENT, onPreferenceChange);
      audioRef.current?.pause();
    };
  }, [src, every, settle]);

  return <audio ref={audioRef} src={src} preload="auto" aria-hidden="true" />;
}

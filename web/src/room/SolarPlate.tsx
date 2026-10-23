// Ancarion's plate: where his name hung, the word that opens the Solar, High
// Command's room (the realm map, the Clerk Table, Canonreeve's Desk).
//
// He keeps it as he kept the Scroll Rack and then the Cabinet: a wrong word
// earns the gate's own refusals (narrowed eyes, then the head-shake, then the
// sigh) and the right one his nod, after which the reader goes through to
// /solar. A reader already holding the Solar's writ who presses the portrait
// is let through after a nod. A reader who reached /solar without the writ is
// turned back here (`sealed`), with the plate waiting for their word.
//
// Authorization is the Solar's own: POST /api/solar/gate under SOLAR_PASSPHRASE,
// a writ of its own. Nothing he does here opens the Cabinet, nor the Cabinet's
// word the Solar.

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type RefObject } from 'react';

import { openSolar, solarIsOpen } from '../api';
import { ACCEPTED_PERFORMANCE_HOLD_MS, ACCEPTED_STILL_HOLD_MS, refusalFor } from '../components/useAncarion';
import { useNavigate } from './nav';
import type { AncarionHandle } from './RoomPortrait';

type Stage = 'idle' | 'checking' | 'accepted';

/** With the writ already held: a nod, not the whole performance. */
const ACKNOWLEDGE_HOLD_MS = 900;

const preloadSolar = () => void import('../views/Solar');

export interface PlateHandle {
  /** The portrait was pressed: through, if the writ is held; otherwise, the plate. */
  knock(): void;
  /** A reader drawing near the portrait. */
  approach(): void;
}

interface Props {
  ancarion: RefObject<AncarionHandle>;
  /** The plate's field, shared with the portrait so he knows when he is addressed. */
  field: RefObject<HTMLInputElement>;
  /** Turned back from /solar for want of the writ. */
  sealed?: boolean;
}

export const SolarPlate = forwardRef<PlateHandle, Props>(function SolarPlate({ ancarion, field, sealed = false }, ref) {
  const navigate = useNavigate();
  const inputId = useId();
  const statusId = useId();
  const [stage, setStage] = useState<Stage>('idle');
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

  // Turned back at the Solar's door: the plate waits for the word.
  useEffect(() => {
    if (!sealed) return;
    writ.current = Promise.resolve(false);
    ancarion.current?.warm();
    setStatus('The Solar is sealed. Speak the word at Ancarion’s plate.');
    window.requestAnimationFrame(() => field.current?.focus());
  }, [sealed, ancarion, field]);

  const approach = () => {
    ancarion.current?.warm();
    preloadSolar();
    writ.current ??= solarIsOpen();
  };

  const enter = (hold: number) => later(() => navigate('/solar'), hold);

  useImperativeHandle(ref, () => ({
    approach,
    async knock() {
      if (stage !== 'idle') return;
      approach();
      if (await (writ.current ?? Promise.resolve(false))) {
        setStage('accepted');
        ancarion.current?.accept();
        setStatus('Ancarion knows you. The Solar is open.');
        enter(ancarion.current?.reducedMotion() ? ACCEPTED_STILL_HOLD_MS : ACKNOWLEDGE_HOLD_MS);
        return;
      }
      field.current?.focus();
    },
  }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stage !== 'idle') return;
    const passphrase = phrase;
    if (!passphrase.trim()) {
      setStatus('Speak the word first.');
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
    setStatus('Ancarion weighs the word…');
    ancarion.current?.consult();

    try {
      const result = await openSolar(passphrase, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        denials.current += 1;
        setPhrase('');
        setStage('idle');
        ancarion.current?.react(refusalFor(denials.current));
        setStatus(
          result.retryAfterSeconds
            ? `Ancarion requires patience. Try again in ${result.retryAfterSeconds} seconds.`
            : result.message,
        );
        window.requestAnimationFrame(() => field.current?.focus());
        return;
      }
      writ.current = Promise.resolve(true);
      setStage('accepted');
      const performs = ancarion.current?.accept() ?? false;
      setStatus('“You are expected.” The Solar is opened.');
      enter(performs ? ACCEPTED_PERFORMANCE_HOLD_MS : ACCEPTED_STILL_HOLD_MS);
    } catch {
      if (controller.signal.aborted && !timedOut) return;
      setStage('idle');
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

  const busy = stage !== 'idle';

  return (
    <div className="solar-plate" data-stage={stage}>
      <form className="solar-plate__form" onSubmit={submit}>
        <label className="sr-only" htmlFor={inputId}>
          The word that opens the Solar
        </label>
        <input
          ref={field}
          id={inputId}
          className="solar-plate__field"
          type="password"
          placeholder="Speak the word"
          value={phrase}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          aria-describedby={statusId}
          aria-invalid={denials.current > 0 && !phrase ? true : undefined}
          onFocus={() => {
            approach();
            ancarion.current?.notice();
          }}
          onBlur={() => stage === 'idle' && ancarion.current?.settle()}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setPhrase('');
            setStatus('');
            field.current?.blur();
          }}
          onChange={(event) => {
            setPhrase(event.target.value);
            ancarion.current?.notice();
          }}
        />
        <button type="submit" className="solar-plate__seal" disabled={busy || !phrase.trim()} aria-label="Present the word">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 2.5l2.2 6.8 6.8 2.7-6.8 2.7L12 21.5l-2.2-6.8-6.8-2.7 6.8-2.7z" fill="currentColor" />
          </svg>
        </button>
      </form>
      <p className="solar-plate__status" id={statusId} role="status" aria-live="polite">
        {status || ' '}
      </p>
    </div>
  );
});

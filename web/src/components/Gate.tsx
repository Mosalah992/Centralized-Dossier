import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import sealUrl from '../assets/gate-seal.webp';
import './Gate.css';

type Phase = 'sealed' | 'breaking' | 'open';

interface GateProps {
  /** Called once the unfurl finishes and the archive should mount. */
  onOpen: () => void;
}

export function Gate({ onOpen }: GateProps) {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !word) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passphrase: word }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(body?.error ?? 'The archive is unreachable.');
        setPending(false);
        inputRef.current?.select();
        return;
      }

      setWord('');
      if (reduced) {
        onOpen();
      } else {
        setPhase('breaking');
      }
    } catch {
      setError('The archive is unreachable.');
      setPending(false);
    }
  }

  const half = (side: 'left' | 'right') => ({
    initial: { x: 0, y: 0, rotate: 0, opacity: 1 },
    breaking: {
      x: side === 'left' ? -46 : 46,
      y: 120,
      rotate: side === 'left' ? -34 : 29,
      opacity: 0,
      transition: { duration: 0.85, ease: [0.32, 0, 0.24, 1] as const },
    },
  });

  return (
    <div className="gate">
      <motion.div
        className="gate__parchment"
        initial={false}
        animate={phase === 'breaking' ? { scaleY: 0.04, opacity: 0 } : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: phase === 'breaking' ? 0.55 : 0, ease: [0.7, 0, 0.3, 1] }}
        onAnimationComplete={() => {
          if (phase === 'breaking') {
            setPhase('open');
            onOpen();
          }
        }}
      >
        <p className="gate__eyebrow">Third Aldmeri Dominion</p>
        <h1 className="gate__title">Embassy Archives</h1>
        <p className="gate__note">
          These registers are sealed. Speak the word given to you at your posting.
        </p>

        <form className="gate__form" onSubmit={submit}>
          <label className="gate__label" htmlFor="gate-word">
            Word of passage
          </label>
          <input
            id="gate-word"
            ref={inputRef}
            className="gate__input"
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            value={word}
            disabled={pending || phase !== 'sealed'}
            onChange={(event) => setWord(event.target.value)}
          />
          <button
            className="gate__button"
            type="submit"
            disabled={pending || !word || phase !== 'sealed'}
          >
            {pending ? 'Testing the seal' : 'Break the seal'}
          </button>
        </form>

        <div className="gate__error" role="status" aria-live="polite">
          <AnimatePresence>
            {error && (
              <motion.p
                key={error}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* One image, two copies, each clipped by one half of the same jagged
            polygon — the seam vertices are identical so no gap or overlap can
            show. The drop shadow lives on the parent: filtering the union
            gives one silhouette shadow at rest and a shadow per half once
            they separate, where a per-half filter would cast each half's
            shadow across the seam while the seal is still whole. */}
        <div className="gate__seal" aria-hidden="true">
          {(['left', 'right'] as const).map((side) => (
            <motion.div
              key={side}
              className={`gate__seal-half gate__seal-half--${side}`}
              variants={half(side)}
              initial="initial"
              animate={phase === 'breaking' ? 'breaking' : 'initial'}
            >
              {/* Above the fold and in the first render, so a high fetch
                  priority does the work of a preload without costing members
                  who already hold a writ the download of a gate they skip. */}
              {/* React 18's runtime warns about this prop while its own types
                  require the camelCase spelling, so there is no form that
                  satisfies both. Kept as the types want it; the warning is
                  cosmetic and goes away on React 19. */}
              <img src={sealUrl} alt="" draggable={false} fetchPriority="high" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// The gate. One door now: the reader presents themselves to Discord, and the
// Embassy admits them if they are on its rolls.
//
// THE SEAL IS THE DOOR. It is not decoration beside a button — pressing the wax
// is what starts the login, which is why it is a real <a> with the seal drawn
// inside it rather than an image with a click handler bolted on. The keyboard,
// middle-click and open-in-new-tab all behave because it is a link.
//
// The ceremony happens on the press, not on the way back. Breaking it on return
// was tried first and abandoned: it meant carrying a flag across a full page
// navigation and having this component, App, and a network fetch all agree about
// who was mid-ceremony, which they did not reliably do. On the gesture it is one
// component's business and cannot race anything — and it reads better anyway.
// Press the wax, watch it break, then go and be identified.
//
// The shared passphrase is gone from here. It still exists server-side as
// break-glass while GATE_PASSPHRASE is set — see api/gate.ts — but it is not
// offered, because a word held by a hundred people cannot be taken back from
// any one of them.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import sealUrl from '../assets/gate-seal.webp';
import './Gate.css';

type Phase = 'sealed' | 'breaking' | 'open';

/** Where the seal takes the reader. */
const LOGIN = '/api/auth/login';

export function Gate() {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [error, setError] = useState<string | null>(null);
  const [discordOffered, setDiscordOffered] = useState<boolean | null>(null);
  const reduced = useReducedMotion();

  // Ask whether the door is configured. Null until it answers, so the seal does
  // not spend a frame looking pressable when nothing is behind it.
  useEffect(() => {
    let live = true;
    fetch('/api/gate', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((body: { discord?: boolean }) => {
        if (live) setDiscordOffered(Boolean(body.discord));
      })
      .catch(() => { if (live) setDiscordOffered(false); });
    return () => { live = false; };
  }, []);

  /**
   * A login that failed comes back as `?login=<reason>` rather than as a page
   * of JSON — the reader pressed a seal and deserves a sentence. App strips the
   * parameter; this only reads it.
   */
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('login');
    if (!reason) return;

    const said: Record<string, string> = {
      'not-a-member': 'That name is not on the Embassy’s rolls.',
      declined: 'You turned back at the door.',
      stale: 'That attempt had gone cold. Press the seal again.',
      unreachable: 'Discord did not answer. The seal holds.',
      unconfigured: 'The Embassy keeps no register of Discord names yet.',
      exchange: 'Discord would not vouch for that name.',
      incomplete: 'That attempt arrived unfinished.',
    };
    setError(said[reason] ?? 'That login was refused.');

    const clean = new URL(window.location.href);
    clean.searchParams.delete('login');
    window.history.replaceState({}, '', clean.toString());
  }, []);

  /**
   * Press the wax: break it, then leave for Discord.
   *
   * The ceremony happens HERE rather than on the way back, and that is a
   * deliberate second try. Breaking it on return meant handing a flag across a
   * full page navigation and having the gate and the app agree about who was
   * mid-ceremony — two components, one query parameter and a network fetch all
   * having to land in the right order, which they did not reliably do. Doing it
   * on the gesture is one component's business and cannot race anything.
   *
   * It also reads better: you press the seal, it breaks, and then you are taken
   * to be identified.
   */
  function press(event: MouseEvent<HTMLAnchorElement>) {
    // Let the browser have modified clicks — open-in-new-tab should not play a
    // ceremony in a tab the reader is not looking at.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (phase !== 'sealed') return;

    if (reduced) {
      window.location.assign(LOGIN);
      return;
    }
    setPhase('breaking');
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

  const seal = (
    <div className="gate__seal-art" aria-hidden="true">
      {(['left', 'right'] as const).map((side) => (
        <motion.div
          key={side}
          className={`gate__seal-half gate__seal-half--${side}`}
          variants={half(side)}
          initial="initial"
          animate={phase === 'breaking' ? 'breaking' : 'initial'}
        >
          {/* Above the fold and in the first render, so a high fetch priority
              does the work of a preload without costing members who already
              hold a writ the download of a gate they skip. */}
          {/* React 18's runtime warns about this prop while its own types
              require the camelCase spelling, so there is no form that satisfies
              both. Kept as the types want it; the warning is cosmetic and goes
              away on React 19. */}
          <img src={sealUrl} alt="" draggable={false} fetchPriority="high" />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="gate">
      <motion.div
        className="gate__parchment"
        initial={false}
        animate={phase === 'breaking' ? { scaleY: 0.04, opacity: 0 } : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: phase === 'breaking' ? 0.55 : 0, ease: [0.7, 0, 0.3, 1] }}
        onAnimationComplete={() => {
          if (phase !== 'breaking') return;
          setPhase('open');
          // The gate only exists for a reader with no writ, so there is nothing
          // to open in place — the wax is broken and they go to be identified.
          // They return to a mounted archive, not to this component.
          window.location.assign(LOGIN);
        }}
      >
        <p className="gate__eyebrow">Third Aldmeri Dominion</p>
        <h1 className="gate__title">Embassy Archives</h1>
        <p className="gate__note">
          {discordOffered === false
            ? 'These registers are sealed, and the Embassy cannot admit anyone at present.'
            : 'These registers are sealed. Enter by Decree.'}
        </p>

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

        {/* A full page navigation, and it has to be: OAuth is a chain of
            top-level redirects out to Discord and back, which no fetch can
            follow. Once the seal is breaking the link is inert — the reader is
            already through, and a second press would start a login they do not
            need. */}
        {discordOffered && phase === 'sealed' ? (
          <a className="gate__seal gate__seal--live" href={LOGIN} onClick={press}>
            {seal}
            <span className="gate__seal-label">Enter by Decree</span>
          </a>
        ) : (
          <div className="gate__seal">{seal}</div>
        )}
      </motion.div>
    </div>
  );
}

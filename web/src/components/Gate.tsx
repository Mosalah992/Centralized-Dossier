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

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { D, failsafe, gsap, staged } from '../motion';
import sealUrl from '../assets/gate-seal.webp';
import './Gate.css';

type Phase = 'sealed' | 'breaking' | 'open';

/** Where the seal takes the reader. */
const LOGIN = '/api/auth/login';

export function Gate() {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [error, setError] = useState<string | null>(null);
  const [discordOffered, setDiscordOffered] = useState<boolean | null>(null);

  const parchment = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  /** Set the instant the reader is sent onward, so it can only happen once. */
  const left = useRef(false);

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
      // Not the reader's fault and deliberately not phrased as though it were:
      // this is the Embassy failing to ask the question, not Discord answering
      // no. See the status handling in api/auth/callback.ts.
      unverified: 'The Embassy could not put the question to Discord. Use the word below.',
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
    setPhase('breaking');
  }

  /**
   * Send the reader on, once, whatever route got us here.
   *
   * IDEMPOTENT ON PURPOSE. Three things can call this — the ceremony finishing,
   * the failsafe firing, or a reader who asked for stillness pressing the seal —
   * and the first to arrive wins. A ref rather than state because it has to be
   * true the instant it is set, not on the next render.
   */
  function leave() {
    if (left.current) return;
    left.current = true;
    // A full page navigation, and it has to be: OAuth is a chain of top-level
    // redirects out to Discord and back, which no fetch can follow.
    window.location.assign(LOGIN);
  }

  /*
   * The ceremony: the wax gives, then it breaks, then the door shuts behind it.
   *
   * ONE TIMELINE, AND THE NAVIGATION HANGS OFF ITS END — which is the fix for a
   * real lockout, not a reshuffle. Before, two independent animations ran and
   * the navigation was bolted to `onAnimationComplete` on one of them. That
   * callback fires on EVERY completion of that element, so it needed an
   * early-return guard; and it fires only while frames are being produced.
   * Press the seal, switch tabs, rAF stops: the callback never came, and the
   * render had already swapped the live <a> for an inert <div>. The reader was
   * left at a gate with nothing to press until they reloaded.
   *
   * Three things make that impossible now. `leave()` is idempotent, so it does
   * not matter how many times or from where it is called. A `gsap.delayedCall`
   * runs it whether or not the timeline reaches its end. And the seal stays a
   * live link throughout, so the reader always has a door even if every piece
   * of this fails at once.
   *
   * The numbers are the ones that were already here — measured against the art
   * and not up for redesign: 46px apart, 120 down, -34 and 29 of rotation over
   * 0.85s, the parchment closing over 0.7s at +0.55.
   */
  /*
   * The photograph breathes.
   *
   * Fifty-four seconds from one framing to the other and back, which is slow
   * enough to read as the room being alive rather than as something moving.
   * `yoyo` with an infinite repeat is the same alternate the keyframes had.
   *
   * Staged behind `wide` as well as `moving`: below 900px the small image is
   * served and the drift is dropped entirely, because a continuous transform is
   * the wrong thing to hand a battery.
   */
  useGSAP(() => staged(({ moving, wide }) => {
    if (!moving || !wide || !field.current) return;
    const drift = gsap.fromTo(field.current,
      { scale: 1.06, x: '-0.8%', y: '-0.6%' },
      {
        scale: 1.14, x: '0.8%', y: '0.7%',
        duration: 54, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
    return () => { drift.kill(); };
  }), []);

  useGSAP(() => {
    if (phase !== 'breaking') return;

    return staged(({ moving }) => {
      // A reader who asked for stillness is not made to watch anything. They
      // pressed a door; the door opens.
      if (!moving) { leave(); return; }

      const halves = gsap.utils.toArray<HTMLElement>('.gate__seal-half');
      const tl = gsap.timeline({ onComplete: leave });

      // The wax gives before it goes. A degree and a half of counter-rotation
      // is the pressure of a seal being broken rather than merely removed; it
      // costs 80ms and it is the difference between a stamp coming apart and
      // two halves sliding off a page.
      tl.to(halves, {
        rotation: (i: number) => (i === 0 ? 1.5 : -1.5),
        duration: 0.08,
        ease: 'shut',
      });

      tl.to(halves, {
        x: (i: number) => (i === 0 ? -46 : 46),
        y: 120,
        rotation: (i: number) => (i === 0 ? -34 : 29),
        opacity: 0,
        duration: 0.85,
        ease: 'break',
      });

      // The door shuts over the broken wax rather than after it — the overlap
      // is what makes it one gesture instead of two.
      tl.to(parchment.current, {
        scaleY: 0.04,
        opacity: 0,
        duration: 0.7,
        ease: 'shut',
      }, '<0.55');

      // NOT a gsap.delayedCall, which was the first attempt and was wrong: a
      // delayedCall is scheduled on the same ticker as the timeline, so the one
      // mechanism meant to survive a tab that stops producing frames could not.
      // `failsafe` uses setTimeout, which fires regardless, and completes the
      // timeline — which runs `leave` through the ordinary onComplete path.
      const rescue = failsafe(tl);

      return () => { rescue(); tl.kill(); };
    });
  }, { dependencies: [phase] });

  const seal = (
    <div className="gate__seal-art" aria-hidden="true">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className={`gate__seal-half gate__seal-half--${side}`}>
          {/* Above the fold and in the first render, so a high fetch priority
              does the work of a preload without costing members who already
              hold a writ the download of a gate they skip. */}
          {/* React 18's runtime warns about this prop while its own types
              require the camelCase spelling, so there is no form that satisfies
              both. Kept as the types want it; the warning is cosmetic and goes
              away on React 19. */}
          <img src={sealUrl} alt="" draggable={false} fetchPriority="high" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="gate">
      {/* The photograph. A real element rather than a ::before so its drift can
          be driven; see the note in Gate.css. */}
      <div className="gate__field" ref={field} aria-hidden />
      <div className="gate__parchment" ref={parchment}>
        <p className="gate__eyebrow">Third Aldmeri Dominion</p>
        <h1 className="gate__title">Embassy Archives</h1>
        <p className="gate__note">
          {discordOffered === false
            ? 'These registers are sealed, and the Embassy cannot admit anyone at present.'
            : 'These registers are sealed. Enter by Decree.'}
        </p>

        {/* The refusal is set out plainly rather than animated in. It is the
            one thing on this screen a reader needs to read immediately, and
            role="status" has already announced it before any tween could
            finish. */}
        <div className="gate__error" role="status" aria-live="polite">
          {error && <p>{error}</p>}
        </div>

        {/* THE LINK STAYS LIVE WHILE THE WAX BREAKS. It used to go inert the
            moment `phase` left 'sealed', on the reasoning that the reader was
            already through — but that reasoning assumed the ceremony always
            finishes, and when it did not, the reader was left looking at a gate
            with nothing to press. `leave()` is idempotent, so a second press
            during the ceremony costs nothing, and it is a great deal better
            than no press at all. */}
        {discordOffered && phase !== 'open' ? (
          <a className="gate__seal gate__seal--live" href={LOGIN} onClick={press}>
            {seal}
            <span className="gate__seal-label">Enter by Decree</span>
          </a>
        ) : (
          <div className="gate__seal">{seal}</div>
        )}
      </div>
    </div>
  );
}

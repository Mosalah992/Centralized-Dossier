// One of the room's surfaces taking over the screen. It grows out of the
// rectangle it was opened from and shrinks back into it on close; Esc, the
// close seal and the browser's Back button all close it. Takeovers nest (a book
// opened from the shelf), and only the innermost answers Esc and holds focus.
// Ported from the Bruma Joint Archives (src/room/Takeover.tsx).
//
// The outermost takeover is portalled to <body> and the whole archive behind
// it — rail, room, footer — is made `inert`, so neither a pointer nor Tab can
// reach the room while it is covered. A nested takeover renders inside its
// parent, which is how "innermost" is found in the DOM.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { openedFromRoom } from '../router';
import { setOrigin, takeOrigin, useNavigate } from './nav';
import '../styles/takeover.css';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Nested = createContext(false);

function inset(r: DOMRect | null): string {
  if (!r) return 'inset(45% 45% 45% 45% round 24px)';
  const w = window.innerWidth;
  const h = window.innerHeight;
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round 18px)`;
}

interface Props {
  label: string;
  /** Where closing goes when there is no room entry behind it (a deep link). */
  closeTo: string;
  /** Selector of the element focus returns to after closing. */
  returnFocus?: string;
  className?: string;
  children: ReactNode;
}

export function Takeover({ label, closeTo, returnFocus, className = '', children }: Props) {
  const nested = useContext(Nested);
  const ref = useRef<HTMLDivElement>(null);
  const from = useRef<DOMRect | null>(takeOrigin());
  const closing = useRef(false);
  const navigate = useNavigate();

  // The archive behind the outermost takeover is inert and does not scroll.
  useEffect(() => {
    if (nested) return;
    const app = document.querySelector<HTMLElement>('.archive-app');
    app?.setAttribute('inert', '');
    document.documentElement.classList.add('is-taken-over');
    return () => {
      app?.removeAttribute('inert');
      document.documentElement.classList.remove('is-taken-over');
    };
  }, [nested]);

  useLayoutEffect(() => {
    const el = ref.current!;
    const start = inset(from.current);
    setOrigin(null);
    if (reducedMotion()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    } else {
      el.animate(
        [
          { clipPath: start, opacity: 0.6 },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
        ],
        { duration: 520, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
      );
    }
    el.querySelector<HTMLElement>('.takeover__close')?.focus({ preventScroll: true });
    return () => {
      // Deferred a tick: the archive is still `inert` while this unmounts, and
      // an inert element refuses focus.
      if (returnFocus) setTimeout(() => document.querySelector<HTMLElement>(returnFocus)?.focus({ preventScroll: true }), 0);
    };
  }, [returnFocus]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    // Opened from the room: step back through history, so Back and the seal
    // agree. A deep link has no room entry behind it, so it is replaced.
    let left = false;
    const done = () => {
      if (left) return;
      left = true;
      if (openedFromRoom()) window.history.back();
      else navigate(closeTo, { replace: true });
    };
    const el = ref.current;
    if (!el || reducedMotion()) return done();
    const back = from.current ?? (returnFocus ? document.querySelector(returnFocus)?.getBoundingClientRect() : null) ?? null;
    el.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
        { clipPath: inset(back), opacity: 0.4 },
      ],
      { duration: 380, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', fill: 'forwards' },
    ).finished.then(done, done);
    // A hidden or throttled tab may never finish the shrink; closing must not
    // wait on it.
    window.setTimeout(done, 700);
  }, [closeTo, navigate, returnFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only the innermost open takeover answers.
      if (ref.current?.querySelector('.takeover')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!items?.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const surface = (
    <div ref={ref} className={`takeover ${className}`} role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="takeover__close" onClick={close} aria-label={`Close ${label}`}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
      <Nested.Provider value={true}>{children}</Nested.Provider>
    </div>
  );

  return nested ? surface : createPortal(surface, document.body);
}

// The parchment frame every opened volume shares: heading, contents, and a
// foot that names the register it was read from.

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useGSAP } from '@gsap/react';

import { D, STAGGER, failsafe, gsap, staged } from '../motion';

/**
 * Either the page was read from a register — in which case it must say which
 * one and when — or the Embassy keeps it itself, and may give its own
 * provenance or none. A union rather than three optional fields, so a
 * sheet-backed volume cannot quietly ship without its source line.
 */
type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
} & (
  | { tab: string; fetchedAtUtc: string; source?: never }
  | { tab?: never; fetchedAtUtc?: never; source?: ReactNode }
);

/** Time only: the archive shows freshness without printing an ISO timestamp. */
function consultedAt(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return 'just now';
  return `${when.toISOString().slice(11, 16)} UTC`;
}

export function Page({ title, subtitle, tab, fetchedAtUtc, source, children }: Props) {
  const board = useRef<HTMLElement>(null);

  /*
   * Opening a volume, in three beats.
   *
   * The board swings on its hinge; a third of a second later the gold catches
   * along the rule under the heading; and then whatever figures the volume
   * keeps settle onto the page. That order is the whole reason this is a
   * timeline and not a keyframe — the CSS it replaces could say "the cover
   * opens" and nothing after it, so the foil and the registers simply arrived
   * whenever their own rules said to, which was immediately.
   *
   * App.tsx already remounts this per slug, so the sequence restarts when the
   * reader takes down a different volume. That is intended and its comment
   * there says so.
   *
   * FIRST PAINT MATTERS HERE. The CSS used `animation: … both`, so the start
   * state existed before the first frame. useGSAP runs in useLayoutEffect,
   * which is before paint, so the fromTo below is equivalent — but only
   * because it is useGSAP. In a plain useEffect the page would show finished
   * for one frame and then jump back to start.
   */
  useGSAP(() => staged(({ moving }) => {
    const article = board.current;
    if (!article) return;

    // Nothing is touched at all under reduced motion, so the volume is simply
    // open when the reader arrives — which is what they asked for.
    if (!moving) return;

    const foil = article.querySelector('.page__foil');
    const figures = gsap.utils.toArray<HTMLElement>('.register', article);
    const tl = gsap.timeline();

    tl.fromTo(article,
      { opacity: 0, rotationY: -14 },
      { opacity: 1, rotationY: 0, duration: D.page, ease: 'swing' });

    if (foil) {
      tl.fromTo(foil,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: D.page, ease: 'draw',
          clearProps: 'transform,opacity' },
        0.35);
    }

    if (figures.length) {
      tl.fromTo(figures,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: D.page, ease: 'draw',
          stagger: STAGGER.roll, clearProps: 'opacity,transform' },
        0.45);
    }

    // The page starts at opacity 0. If the ticker never runs, this is the only
    // thing standing between the reader and a blank volume.
    const rescue = failsafe(tl);

    return () => {
      rescue();
      tl.kill();
      gsap.set(article, { clearProps: 'opacity,transform' });
    };
  }), []);

  return (
    <article className="page" ref={board}>
      <header className="page__head">
        <p className="page__classification">Thalmor Embassy</p>
        <h1 className="page__title">{title}</h1>
        <p className="page__subtitle">{subtitle}</p>
        <span className="page__foil" aria-hidden />
      </header>

      {children}

      {/* Omitted entirely when there is nothing to attribute — an empty foot
          would still draw its rule across the bottom of the page. */}
      {(source || tab) && (
        <footer className="page__foot">
          {source ?? (
            <p className="page__source">
              Transcribed from the <strong>{tab}</strong> register, consulted{' '}
              {consultedAt(fetchedAtUtc as string)}.
            </p>
          )}
        </footer>
      )}
    </article>
  );
}

/** Septims and counts, grouped for reading. */
export const figure = (value: number) => value.toLocaleString('en-GB');

export function Registers({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="registers">
      {items.map((item) => (
        <div className="register" key={item.label}>
          <div className="register__label">{item.label}</div>
          <div className="register__value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export const Mark = ({ on }: { on: boolean }) => (
  <span className={`mark mark--${on ? 'yes' : 'no'}`} aria-label={on ? 'yes' : 'no'} />
);

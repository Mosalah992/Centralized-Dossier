// The archive index. The cabinet is the primary object on this page; the
// heading stays ceremonial but compact so the six physical volumes dominate.

import { Suspense, lazy, useRef } from 'react';
import { useGSAP } from '@gsap/react';

import { useShelf } from '../api';
import { D, STAGGER, failsafe, gsap, staged, suspendOffScreen } from '../motion';
import { SHELF, isOwnWork } from '../../../shared/volumes';
import { BINDINGS } from '../theme';
import { Book } from './Book';
import { Notice } from './Notice';

/*
 * THE ASTROLABE IS LAZY HERE, AND IT HAS TO BE.
 *
 * Shelf is a static import in App.tsx, so anything it imports normally lands in
 * the entry chunk — the one a reader downloads before they have answered the
 * gate, and the one test/bundle.test.ts caps. anime.js is larger than the
 * headroom that chunk had left, so importing it directly would have broken the
 * ceiling rather than merely nudged it.
 *
 * Behind React.lazy it becomes its own chunk, fetched after the shelf has
 * painted. Nobody waiting at the seal pays for it, and the cabinet does not
 * wait on it either — see the null fallback below.
 */
const Astrolabe = lazy(() => import('./Astrolabe').then((m) => ({ default: m.Astrolabe })));

interface Props {
  onOpen: (href: string) => void;
}

export function Shelf({ onOpen }: Props) {
  const shelf = useShelf();
  const dust = useRef<HTMLSpanElement>(null);
  const cabinet = useRef<HTMLDivElement>(null);

  /*
   * The volumes muster.
   *
   * Outward from the centre of the cabinet rather than left to right, so the
   * shelf fills the way ranks fall in rather than the way a list renders.
   *
   * ON `.book`, NOT `.book__body`. The body owns the hover lift — a CSS
   * transition on `transform` — and a tween writing inline transform to that
   * element would be chased by its own transition, which is the surest way to
   * get motion that looks broken rather than wrong.
   *
   * RUNS ONCE, ON MOUNT, AND THE EMPTY DEPENDENCY LIST IS THE POINT. It was
   * keyed on `shelf.state` first, which made the volumes muster TWICE: once
   * when the component mounted and again when the archivist answered and the
   * state went from loading to ready. The books do not come from that fetch —
   * they are the static SHELF registry, and the fetch only says which tab each
   * one is bound to — so there was never anything for a second run to add
   * except a second entrance on top of the first.
   */
  useGSAP(() => staged(({ moving }) => {
    const shelfEl = cabinet.current;
    if (!moving || !shelfEl) return;

    const books = gsap.utils.toArray<HTMLElement>('.book', shelfEl);
    if (!books.length) return;

    const arrive = gsap.fromTo(books,
      { opacity: 0, y: 18 },
      // `page`, not `board`: a board is a hinged cover swinging open, and this
      // is one object arriving on a shelf. It is also 300ms less of it.
      { opacity: 1, y: 0, duration: D.page, ease: 'draw',
        stagger: STAGGER.muster, clearProps: 'opacity,transform' });
    // Nine volumes blanked and never un-blanked is a shelf nobody can read.
    const rescue = failsafe(arrive);

    return () => {
      rescue();
      arrive.kill();
      gsap.set(books, { clearProps: 'opacity,transform' });
    };
  }), []);

  /*
   * Motes drifting through the torchlight.
   *
   * Suspended when the shelf is scrolled out of view, which is the one thing
   * the CSS keyframes could not do: `animation-play-state` cannot be driven
   * from intersection, so the old loop ran for as long as the tab was visible
   * whether or not anybody could see it.
   */
  useGSAP(() => staged(({ moving }) => {
    const motes = dust.current;
    if (!moving || !motes) return;

    const drift = gsap.fromTo(motes,
      { y: 0 },
      { y: '-1.5rem', duration: 14, ease: 'none', repeat: -1 });
    const watch = suspendOffScreen(motes, drift);

    return () => { watch(); drift.kill(); };
  }), []);

  // Which tab each volume is bound to, once the archivist has answered.
  const tabs = new Map<string, string | null>(
    shelf.state === 'ready' ? shelf.value.volumes.map((v) => [v.slug, v.tab]) : [],
  );

  return (
    <div className="hall" ref={cabinet}>
      <span className="hall__torch hall__torch--left" aria-hidden />
      <span className="hall__torch hall__torch--right" aria-hidden />
      <span className="hall__dust" ref={dust} aria-hidden />

      <header className="hall__head">
        {/* The Dominion insignia. Decorative — the heading beneath it already
            names the archive, so it is not announced a second time. Served
            from public/ as ledger.css serves the same file for its watermark. */}
        <img className="hall__seal" src="/seal.webp" alt="" width={250} height={250} decoding="async" />
        <h1 className="hall__title">
          Thalmor Embassy
          <br />
          Archives
        </h1>
        <p className="hall__subtitle">Official Administrative Registers</p>
      </header>

      {shelf.state === 'error' && (
        <Notice
          kind="error"
          title="The archive cannot be reached"
          body={shelf.message}
        />
      )}

      {shelf.state === 'ready' && !shelf.value.reachable && (
        <Notice
          kind="error"
          title="The registers are sealed"
          body="The archivist cannot reach the master ledger. The volumes below are listed but cannot be opened."
        />
      )}

      <section className="archive-cabinet" aria-label="Archive cabinet">
        <div className="archive-cabinet__cap">
          <span className="archive-cabinet__title">Archive Cabinet</span>
        </div>

        {/* The maker's mark on the cabinet's backboard. A null fallback rather
            than a notice: it is an ornament, and a cabinet that announces a
            missing ornament is worse than one that simply has not got it. */}
        <div className="archive-cabinet__instrument" aria-hidden>
          <Suspense fallback={null}>
            <Astrolabe size={420} quiet legend={false} />
          </Suspense>
        </div>
        <div className="archive-cabinet__interior">
          {SHELF.map((section) => (
            <section
              className={`section section--${section.category.toLowerCase().replace(/\W+/g, '-')}`}
              key={section.category}
            >
              <h2 className="section__plate">
                <span className="section__name">{section.category}</span>
              </h2>
              <div className="shelf">
                {section.volumes.map((volume) => (
                  <Book
                    key={volume.slug}
                    slug={volume.slug}
                    title={volume.title}
                    subtitle={BINDINGS[volume.slug].subtitle}
                    tab={
                      // A kept volume is written here, not read from the sheet,
                      // so nothing the archivist says can withdraw it.
                      isOwnWork(volume.slug)
                        ? volume.title
                        // Treat an unanswered shelf as present; a volume is only
                        // shown withdrawn once the archivist has actually said so.
                        : shelf.state === 'ready'
                          ? tabs.get(volume.slug) ?? null
                          : volume.title
                    }
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="archive-cabinet__base" aria-hidden />
      </section>

    </div>
  );
}

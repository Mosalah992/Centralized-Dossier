// A bound volume: two leaves, a spine, a leaf that turns, and the reader's
// place kept. Every volume on the bookshelf is read this way (2026-10-23); it
// was the Thalmor Chronicles' alone, ported from the Canonreeve Archives
// reader, and was lifted out of web/src/views/Informants.tsx unchanged.
//
// Spread s shows leaves [2s-1, 2s], with s=0 showing the inside of the front
// board and the title page. The turn is a third leaf held above the spread,
// its front carrying the outgoing page and its back the incoming one, rotated
// on the spine. Readers who ask for less motion get the same spread without
// the rotation, and narrow screens get one page at a time, because a two-page
// spread on a phone is two unreadable pages.
//
// Above the book, the scrying: a search over the whole volume that says which
// leaf each passage is on, and the guided-reading toggle. The volume hands in
// `build`, which sets its leaves for a search term and the reading mode (the
// marking is baked into the leaves, and packing counts raw characters, so a
// search can never move the pagination under the reader).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { D, failsafe, gsap, staged } from '../motion';
import { GuidedToggle, useGuidedReading } from '../reading';
import { pageWindow, snippet, type Leaf } from './leaves';

interface Props {
  /** The volume's leaves, for a search term and whether reading is guided. Keep it stable. */
  build: (term: string, guided: boolean) => Leaf[];
  /** The seal on the inside of the front board. */
  seal: string;
  /** What the search is called on this volume, and what it suggests. */
  scryLabel: string;
  placeholder: string;
  /** The pager's accessible name. */
  navLabel: string;
  /** Put the cursor in the search as the volume opens. */
  focusSearch?: boolean;
}

export function BoundBook({ build, seal, scryLabel, placeholder, navLabel, focusSearch = false }: Props) {
  const scry = useRef<HTMLInputElement>(null);
  const scryId = useRef(`scry-${Math.random().toString(36).slice(2, 8)}`).current;
  useEffect(() => {
    if (focusSearch) scry.current?.focus({ preventScroll: true });
  }, [focusSearch]);

  const [query, setQuery] = useState('');
  // Two characters is where a search stops being every page at once.
  const term = query.trim().length >= 2 ? query.trim() : '';
  const [guided, setGuided] = useGuidedReading();

  const leaves = useMemo(() => build(term, guided), [build, term, guided]);

  /** Every passage that answers, with the leaf it sits on. */
  const found = useMemo(() => {
    if (!term) return [];
    const needle = term.toLowerCase();
    const hits: { leaf: number; head: string; label: string; text: string }[] = [];
    leaves.forEach((leaf, index) => {
      for (const item of leaf.items ?? []) {
        if (item.text.toLowerCase().includes(needle) || item.label.toLowerCase().includes(needle)) {
          hits.push({ leaf: index, head: leaf.head, label: item.label, text: item.text });
        }
      }
    });
    return hits;
  }, [leaves, term]);

  const total = leaves.length;
  const maxSpread = Math.max(0, Math.ceil((total - 1) / 2));

  const [spread, setSpread] = useState(0);
  const [page, setPage] = useState(0);
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches,
  );
  const [turning, setTurning] = useState<null | { dir: 1 | -1; to: number }>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const eye = useRef<HTMLSpanElement>(null);

  // The scrying glass breathes while it is listening; not for a reader who
  // asked for stillness.
  useGSAP(() => staged(({ moving }) => {
    if (!moving || !eye.current) return;
    const breath = gsap.fromTo(eye.current,
      { opacity: 0.45, scale: 0.82 },
      { opacity: 1, scale: 1.08, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return () => { breath.kill(); };
  }), []);

  // The reader's place, read through refs at the moment the binding changes:
  // a listener closing over `spread` and `page` would carry the numbers from
  // the render that installed it.
  const spreadRef = useRef(spread);
  const pageRef = useRef(page);
  spreadRef.current = spread;
  pageRef.current = page;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => {
      setNarrow(mq.matches);
      if (mq.matches) setPage(spreadRef.current === 0 ? 0 : 2 * spreadRef.current - 1);
      else setSpread(pageRef.current === 0 ? 0 : Math.ceil(pageRef.current / 2));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // A search narrowing the volume cannot leave the reader past its last leaf.
  useEffect(() => {
    setSpread((s) => Math.min(s, maxSpread));
    setPage((p) => Math.min(p, Math.max(0, total - 1)));
  }, [maxSpread, total]);

  const at = useCallback(
    (i: number): Leaf | null => (i >= 0 && i < total ? leaves[i] ?? null : null),
    [leaves, total],
  );
  // Spread 0 is the inside of the front board facing the title page.
  const facing = (s: number): [number, number] => (s === 0 ? [-1, 0] : [2 * s - 1, 2 * s]);

  const turn = useCallback(
    (dir: 1 | -1) => {
      if (turning) return;
      if (narrow) {
        setPage((p) => Math.min(Math.max(p + dir, 0), total - 1));
        return;
      }
      const to = spread + dir;
      if (to < 0 || to > maxSpread) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setSpread(to);
        return;
      }
      setTurning({ dir, to });
    },
    [turning, narrow, spread, maxSpread, total],
  );

  /**
   * Go to a numbered place: the pager's index (spreads on a wide screen, leaves
   * on a narrow one). An adjacent step still turns a leaf; a jump across the
   * volume is not animated, since one leaf swinging over cannot stand for six.
   */
  const jump = useCallback(
    (target: number) => {
      if (turning) return;
      const count = narrow ? total : maxSpread + 1;
      const from = narrow ? page : spread;
      const to = Math.min(Math.max(target, 0), count - 1);
      if (to === from) return;
      if (!narrow && Math.abs(to - from) === 1) {
        turn(to > from ? 1 : -1);
        return;
      }
      if (narrow) setPage(to);
      else setSpread(to);
    },
    [turning, narrow, total, maxSpread, page, spread, turn],
  );

  /** Open the volume at a leaf (the scrying knows leaves, not spreads). */
  const openAt = useCallback(
    (index: number) => {
      if (narrow) setPage(index);
      else setSpread(index === 0 ? 0 : Math.ceil(index / 2));
    },
    [narrow],
  );

  // Turn the leaf: GSAP on `rotationY` (not `rotateY`, which GSAP ignores
  // silently), the shadow sweeping across, and two nets so a leaf that never
  // lands cannot lock the controls.
  useEffect(() => {
    if (!turning) return;
    const node = leafRef.current;
    if (!node) return;

    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      setSpread(turning.to);
      setTurning(null);
    };

    const from = turning.dir === 1 ? 0 : -180;
    const to = turning.dir === 1 ? -180 : 0;
    const shade = node.parentElement?.querySelector('.chron-leaf__shade') ?? null;
    const tl = gsap.timeline({ onComplete: land });
    tl.fromTo(node, { rotationY: from }, { rotationY: to, duration: D.board, ease: 'swing' }, 0);
    if (shade) {
      tl.fromTo(shade,
        { opacity: 0, xPercent: turning.dir === 1 ? -30 : 30 },
        { opacity: 1, xPercent: 0, duration: D.board * 0.5, ease: 'none' }, 0);
      tl.to(shade,
        { opacity: 0, xPercent: turning.dir === 1 ? 30 : -30, duration: D.board * 0.5, ease: 'none' }, D.board * 0.5);
    }

    const onHidden = () => { if (document.hidden) tl.progress(1); };
    document.addEventListener('visibilitychange', onHidden);
    const rescue = failsafe(tl);
    return () => {
      rescue();
      document.removeEventListener('visibilitychange', onHidden);
      tl.kill();
    };
  }, [turning]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The search box keeps its own arrows.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight') turn(1);
      if (event.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const [leftIndex, rightIndex] = facing(spread);
  const left = at(leftIndex);
  const right = at(rightIndex);
  const atCover = spread === 0;

  // While a leaf is in flight the spread beneath it is already the destination.
  const [nextLeft, nextRight] = turning ? facing(turning.to) : [leftIndex, rightIndex];
  const underLeft = turning && turning.dir === 1 ? left : at(nextLeft);
  const underRight = turning && turning.dir === -1 ? right : at(nextRight);
  const leafFront = turning ? at(turning.dir === 1 ? rightIndex : nextRight) : null;
  const leafBack = turning ? at(turning.dir === 1 ? nextLeft : leftIndex) : null;

  const first = narrow ? page <= 0 : spread <= 0;
  const last = narrow ? page >= total - 1 : spread >= maxSpread;

  const Face = ({ leaf, side }: { leaf: Leaf | null; side: 'left' | 'right' }) =>
    leaf ? (
      <div className="chron-page__inner">
        {leaf.head && <p className="chron-runhead">{leaf.head}</p>}
        <div className="chron-text">{leaf.body}</div>
        <p className={`chron-folio chron-folio--${side}`}>
          {side === 'left' ? leftIndex + 1 : (narrow ? page : rightIndex) + 1}
        </p>
      </div>
    ) : null;

  return (
    <div className="chron">
      <form className="scry" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="scry__glass" aria-hidden>
          <span className="scry__eye" ref={eye} />
        </div>
        <div className="scry__field">
          <label className="scry__label" htmlFor={scryId}>
            {scryLabel}
          </label>
          <input
            ref={scry}
            id={scryId}
            className="scry__input"
            type="search"
            value={query}
            spellCheck={false}
            autoComplete="off"
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {query && (
          <button type="button" className="scry__clear" onClick={() => setQuery('')} aria-label="Dismiss the scrying">
            ×
          </button>
        )}
        <GuidedToggle on={guided} onChange={() => setGuided((was) => !was)} />
      </form>

      {term && (
        <div className="scry__answer" aria-live="polite">
          <p className="scry__count">
            {found.length === 0
              ? 'The glass stays dark. Nothing in this volume answers to that.'
              : `${found.length} passage${found.length === 1 ? '' : 's'} answer${found.length === 1 ? 's' : ''}.`}
          </p>
          {found.length > 0 && (
            <ul className="scry__hits">
              {found.slice(0, 40).map((hit, i) => (
                <li key={`${hit.leaf}-${hit.label}-${i}`}>
                  <button type="button" className="scry__hit" onClick={() => openAt(hit.leaf)}>
                    <span className="scry__hit-date">{hit.label}</span>
                    <span className="scry__hit-head">{hit.head}</span>
                    <span className="scry__hit-text">{snippet(hit.text, term)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {found.length > 40 && <p className="scry__more">Showing the first 40. Narrow the word to see the rest.</p>}
        </div>
      )}

      <div className={`chron-book${atCover && !narrow ? ' chron-book--cover' : ''}`}>
        <div className="chron-board" aria-hidden>
          <img className="chron-board__seal" src={seal} alt="" width={186} height={186} />
        </div>

        <div className="chron-page chron-page--left">
          <button className="chron-edge chron-edge--left" type="button" onClick={() => turn(-1)} disabled={first} aria-label="Previous page" />
          {/* Keyed on the leaf shown, so a turn remounts it and a scrolled leaf
              does not hand its scroll position to the next. */}
          <Face key={leftIndex} leaf={narrow ? null : underLeft} side="left" />
        </div>

        <div className="chron-spine" aria-hidden />

        <div className="chron-page chron-page--right">
          <button className="chron-edge chron-edge--right" type="button" onClick={() => turn(1)} disabled={last} aria-label="Next page" />
          <Face key={narrow ? `p${page}` : `r${rightIndex}`} leaf={narrow ? at(page) : underRight} side="right" />
        </div>

        {turning && <span className="chron-leaf__shade" aria-hidden />}
        {turning && (
          <div ref={leafRef} className="chron-leaf" aria-hidden>
            <div className="chron-leaf__face chron-leaf__face--front">
              <Face leaf={leafFront} side="right" />
            </div>
            <div className="chron-leaf__face chron-leaf__face--back">
              <Face leaf={leafBack} side="left" />
            </div>
          </div>
        )}
      </div>

      <nav className="chron-nav" aria-label={navLabel}>
        <button className="chron-nav__btn chron-nav__btn--end" type="button" onClick={() => jump(0)} disabled={first} aria-label="First page">
          ‹‹ First
        </button>
        <button className="chron-nav__btn" type="button" onClick={() => turn(-1)} disabled={first}>
          ‹ Previous
        </button>
        <ol className="chron-nav__pages">
          {pageWindow(narrow ? page : spread, narrow ? total : maxSpread + 1).map((slot, i) =>
            slot === 'gap' ? (
              <li className="chron-nav__gap" key={`gap${i}`} aria-hidden="true">
                …
              </li>
            ) : (
              <li key={slot}>
                <button
                  type="button"
                  className={`chron-nav__num${slot === (narrow ? page : spread) ? ' is-current' : ''}`}
                  onClick={() => jump(slot)}
                  aria-label={narrow ? `Page ${slot + 1}` : `Spread ${slot + 1}`}
                  aria-current={slot === (narrow ? page : spread) ? 'page' : undefined}
                >
                  {slot + 1}
                </button>
              </li>
            ),
          )}
        </ol>
        <span className="chron-nav__pos" aria-live="polite">
          {narrow ? `Page ${page + 1} of ${total}` : `Spread ${spread + 1} of ${maxSpread + 1}`}
        </span>
        <button className="chron-nav__btn" type="button" onClick={() => turn(1)} disabled={last}>
          Next ›
        </button>
        <button
          className="chron-nav__btn chron-nav__btn--end"
          type="button"
          onClick={() => jump((narrow ? total : maxSpread + 1) - 1)}
          disabled={last}
          aria-label="Last page"
        >
          Last ››
        </button>
      </nav>
    </div>
  );
}

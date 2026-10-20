// A book opened from the shelf.
//
// The text is typeset for the screen it is read on: the book's paragraphs are
// flowed into pages measured against a hidden page of the real size, so a
// desktop spread is full and a phone page never overflows (paginate.ts). Two
// pages at a time on wide screens, one on phones; a leaf really turns over
// unless the reader asks for less motion.
//
// Ported from the Bruma Joint Archives' reader, which itself borrowed the
// scrying (search the whole book and jump to a passage), guided reading, the
// windowed pager, clickable page edges and the turning leaf from this
// archive's Chronicles reader — so the two archives read alike.
//
// Books here are bundled (web/src/books/), each its own lazy chunk; Phase 2
// adds books a librarian shelves, served from /api/room/books/:slug.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Book } from '../../../../shared/books';
import { bundledBook } from '../../books/registry';
import { Fleuron } from '../art';
import { fetchRoom } from '../room-api';
import { contentsPages, flatten, paginate, type Block, type SetPage } from './paginate';
import { GuidedToggle, pageWindow, prose, snippet, useGuidedReading } from './book-reading';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; book: Book };

function useBook(slug: string): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    const bundled = bundledBook(slug);
    const found: Promise<Loaded> = bundled
      ? bundled.load().then((book) => ({ state: 'ok', book }) as Loaded, () => ({ state: 'error' }) as Loaded)
      : fetchRoom<Book>(`/api/room/books/${encodeURIComponent(slug)}`).then((r) =>
          r.state === 'ok' ? { state: 'ok', book: r.data } : r.state === 'error' ? { state: 'error' } : { state: 'missing' },
        );
    void found.then((next) => live && setLoaded(next));
    return () => {
      live = false;
    };
  }, [slug]);
  return loaded;
}

type Sheet = { kind: 'blank' } | { kind: 'title' } | { kind: 'page'; page: SetPage; n: number };

function useWide(): boolean {
  const q = '(min-width: 820px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function BookReader({ slug }: { slug: string }) {
  const book = useBook(slug);
  if (book.state === 'loading') return <p className="loading">Opening the book…</p>;
  if (book.state === 'missing') return <p className="loading">No such book stands on this shelf.</p>;
  if (book.state === 'error') return <p className="loading">The book could not be opened.</p>;
  return <Reader book={book.book} />;
}

function Reader({ book }: { book: Book }) {
  const wide = useWide();
  const blocks = useMemo(() => flatten(book), [book]);
  const pageBox = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<SetPage[] | null>(null);
  const [pos, setPos] = useState(wide ? 0 : 1); // sheet index shown (wide: the left of a spread)
  const anchor = useRef(-1); // first block on screen, to keep the place across re-typesetting
  const [turn, setTurn] = useState<null | 'next' | 'prev'>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const [guided, setGuided] = useGuidedReading();
  const [query, setQuery] = useState('');
  const [contentsOpen, setContentsOpen] = useState(false);
  const term = query.trim().length >= 2 ? query.trim() : '';

  // ---- Typesetting, against the real page size; again whenever it changes.
  useLayoutEffect(() => {
    const box = pageBox.current;
    const m = measure.current;
    if (!box || !m) return;
    let timer = 0;
    let last = '';
    const run = () => {
      const r = box.getBoundingClientRect();
      const size = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (size === last || r.width < 50) return;
      last = size;
      m.style.width = `${r.width}px`;
      m.style.height = `${r.height}px`;
      const next = paginate(blocks, m, r.height);
      setPages(next);
      // Return to the remembered block in the same render as the new pages,
      // so nothing in between can mistake the old position for the place.
      if (anchor.current >= 0) {
        let p = 0;
        next.forEach((pg, k) => {
          if ((pg.blocks[0]?.i ?? Infinity) <= anchor.current) p = k;
        });
        setPos(p + 2);
      }
    };
    // Measure with the real fonts, not the fallback they replace. `fonts.ready`
    // alone is not enough: it resolves at once while no text has yet asked for
    // a face, so ask for each face the pages use, and set the type again if a
    // face arrives later.
    const faces = ['400 17px "EB Garamond"', 'italic 400 17px "EB Garamond"', '600 17px "EB Garamond"', '700 17px "Cinzel"'];
    Promise.all(faces.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(run);
    const again = () => {
      last = '';
      run();
    };
    document.fonts.addEventListener('loadingdone', again);
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(run, 120);
    });
    ro.observe(box);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
      document.fonts.removeEventListener('loadingdone', again);
    };
  }, [blocks]);

  const sheets = useMemo<Sheet[]>(() => {
    // The inside of the front board, the title page, then the text; padded so the last spread is whole.
    const s: Sheet[] = [{ kind: 'blank' }, { kind: 'title' }, ...(pages ?? []).map((page, k) => ({ kind: 'page' as const, page, n: k + 1 }))];
    if (s.length % 2) s.push({ kind: 'blank' });
    return s;
  }, [pages]);

  const normal = useCallback((s: number) => (wide ? Math.max(0, s - (s % 2)) : Math.min(Math.max(1, s), sheets.length - 1)), [wide, sheets.length]);
  const at = normal(pos);
  const step = wide ? 2 : 1;
  const canPrev = at - step >= (wide ? 0 : 1);
  const canNext = at + step < sheets.length;

  // Remember the first block on screen…
  useEffect(() => {
    const onScreen = wide ? [sheets[at], sheets[at + 1]] : [sheets[at]];
    const first = onScreen.find((s): s is Extract<Sheet, { kind: 'page' }> => s?.kind === 'page');
    if (first) anchor.current = first.page.blocks[0]?.i ?? anchor.current;
    else if (at <= 1) anchor.current = -1;
  }, [at, sheets, wide]);

  const go = useCallback(
    (dir: 'next' | 'prev') => {
      if (turn) return;
      if (dir === 'next' ? !canNext : !canPrev) return;
      if (reducedMotion()) return setPos(at + (dir === 'next' ? step : -step));
      setTurn(dir);
    },
    [turn, canNext, canPrev, at, step],
  );

  /** Go straight to a sheet. A neighbour turns the leaf; a long jump does not pretend to. */
  const openAt = useCallback(
    (sheet: number) => {
      const to = normal(sheet);
      if (to === at || turn) return;
      if (Math.abs(to - at) === step) return go(to > at ? 'next' : 'prev');
      setPos(to);
    },
    [normal, at, turn, step, go],
  );

  useLayoutEffect(() => {
    const el = leaf.current;
    if (!turn || !el) return;
    const frames: Keyframe[] = wide
      ? turn === 'next'
        ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }]
        : [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }]
      : turn === 'next'
        ? [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-180deg)', opacity: 0.2 }]
        : [{ transform: 'rotateY(-180deg)', opacity: 0.2 }, { transform: 'rotateY(0deg)', opacity: 1 }];
    const a = el.animate(frames, { duration: 720, easing: 'cubic-bezier(0.35, 0.1, 0.28, 1)', fill: 'forwards' });
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      setPos(at + (turn === 'next' ? step : -step));
      setTurn(null);
    };
    a.finished.then(land, land);
    // A tab hidden mid-turn stops producing frames; finish the turn rather than strand the controls.
    const onHidden = () => document.hidden && a.finish();
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [turn, wide, at, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go('next');
      else if (e.key === 'ArrowLeft') go('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Esc closes the Contents first, before the takeover behind it hears it.
  useEffect(() => {
    if (!contentsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setContentsOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [contentsOpen]);

  // ---- The scrying: every passage that answers, with its chapter.
  const hits = useMemo(() => {
    if (!term || !pages) return [];
    const t = term.toLowerCase();
    const out: { sheet: number; head: string; text: string }[] = [];
    let chapter = book.title;
    pages.forEach((pg, k) => {
      for (const b of pg.blocks) {
        if (b.kind === 'chapter') chapter = b.text;
        if (b.text.toLowerCase().includes(t)) out.push({ sheet: k + 2, head: chapter, text: b.text });
      }
    });
    return out;
  }, [term, pages, book.title]);

  const contentsAt = useMemo(() => (pages ? contentsPages(book, pages) : []), [book, pages]);

  // ---- What lies beneath the turning leaf, and what is printed on its faces.
  let left: Sheet | undefined, right: Sheet | undefined, front: Sheet | undefined, back: Sheet | undefined;
  let leftKey = at, rightKey = at + 1;
  if (wide) {
    left = sheets[turn === 'prev' ? at - 2 : at];
    right = sheets[turn === 'next' ? at + 3 : at + 1];
    leftKey = turn === 'prev' ? at - 2 : at;
    rightKey = turn === 'next' ? at + 3 : at + 1;
    if (turn === 'next') [front, back] = [sheets[at + 1], sheets[at + 2]];
    if (turn === 'prev') [front, back] = [sheets[at], sheets[at - 1]];
  } else {
    right = sheets[turn === 'next' ? at + 1 : at];
    rightKey = turn === 'next' ? at + 1 : at;
    if (turn === 'next') [front, back] = [sheets[at], { kind: 'blank' }];
    if (turn === 'prev') [front, back] = [sheets[at - 1], { kind: 'blank' }];
  }

  const face = { book, term, guided };

  const count = wide ? sheets.length / 2 : sheets.length - 1;
  const current = wide ? at / 2 : at - 1;
  const toSlot = (slot: number) => (wide ? slot * 2 : slot + 1);

  return (
    <div className="reader">
      <form className="scry" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="scry__field">
          <label className="scry__label" htmlFor="scry-input">
            Search this book
          </label>
          <input
            id="scry-input"
            className="scry__input"
            type="search"
            value={query}
            spellCheck={false}
            autoComplete="off"
            placeholder="a word, a name, an article…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {query && (
          <button type="button" className="scry__clear" onClick={() => setQuery('')} aria-label="Clear the search">
            ×
          </button>
        )}
        <GuidedToggle on={guided} onChange={() => setGuided((was) => !was)} />
      </form>

      {term && (
        <div className="scry__answer" aria-live="polite">
          <p className="scry__count">
            {hits.length === 0 ? 'Nothing in this book answers to that.' : `${hits.length} passage${hits.length === 1 ? '' : 's'} answer${hits.length === 1 ? 's' : ''}.`}
          </p>
          {hits.length > 0 && (
            <ul className="scry__hits">
              {hits.slice(0, 40).map((h, k) => (
                <li key={k}>
                  <button type="button" className="scry__hit" onClick={() => openAt(h.sheet)}>
                    <span className="scry__hit-page">Page {h.sheet - 1}</span>
                    <span className="scry__hit-head">{h.head}</span>
                    <span className="scry__hit-text">{snippet(h.text, term)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hits.length > 40 && <p className="scry__more">Showing the first 40. Narrow the word to see the rest.</p>}
        </div>
      )}

      {book.draft && <p className="reader__draft">Placeholder text: this book awaits its agreed wording.</p>}

      <div
        className={`openbook${wide ? ' openbook--wide' : ''}`}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 'next' : 'prev');
        }}
      >
        {wide && (
          <div className="openbook__page openbook__page--left">
            <button type="button" className="page-edge page-edge--left" onClick={() => go('prev')} disabled={!canPrev} aria-label="Previous page" />
            <PageFace {...face} key={`l${leftKey}`} sheet={left} />
          </div>
        )}
        <div className="openbook__page openbook__page--right" ref={pageBox}>
          <button type="button" className="page-edge page-edge--right" onClick={() => go('next')} disabled={!canNext} aria-label="Next page" />
          {pages ? <PageFace {...face} key={`r${rightKey}`} sheet={right} /> : <div className="leafpage leafpage--setting">Setting the type…</div>}
        </div>
        {turn && <span className={`leaf-shade leaf-shade--${turn}`} aria-hidden="true" />}
        {turn && (
          <div ref={leaf} className={`leaf leaf--${turn}${wide ? ' leaf--wide' : ''}`} aria-hidden="true">
            <div className="leaf__face leaf__face--front">
              <PageFace {...face} sheet={front} />
            </div>
            <div className="leaf__face leaf__face--back">
              <PageFace {...face} sheet={back} />
            </div>
          </div>
        )}
      </div>

      <nav className="book-nav" aria-label="Book navigation">
        <button type="button" className="book-nav__btn" onClick={() => openAt(toSlot(0))} disabled={!canPrev} aria-label="First page">
          ‹‹
        </button>
        <button type="button" className="book-nav__btn" onClick={() => go('prev')} disabled={!canPrev || !!turn} aria-label="Previous page">
          ‹
        </button>
        <ol className="book-nav__pages">
          {pageWindow(current, count).map((slot, k) =>
            slot === 'gap' ? (
              <li className="book-nav__gap" key={`g${k}`} aria-hidden="true">
                …
              </li>
            ) : (
              <li key={slot}>
                <button
                  type="button"
                  className={`book-nav__num${slot === current ? ' is-current' : ''}`}
                  onClick={() => openAt(toSlot(slot))}
                  aria-label={wide ? `Spread ${slot + 1}` : slot === 0 ? 'Title page' : `Page ${slot}`}
                  aria-current={slot === current ? 'page' : undefined}
                >
                  {/* On a phone the pager counts as the folios do: the title page is T, then 1, 2, … */}
                  {wide ? slot + 1 : slot === 0 ? 'T' : slot}
                </button>
              </li>
            ),
          )}
        </ol>
        <button type="button" className="book-nav__btn" onClick={() => go('next')} disabled={!canNext || !!turn} aria-label="Next page">
          ›
        </button>
        <button type="button" className="book-nav__btn" onClick={() => openAt(toSlot(count - 1))} disabled={!canNext} aria-label="Last page">
          ››
        </button>
        {book.contents && book.contents.length > 0 && (
          <button type="button" className="book-nav__contents" onClick={() => setContentsOpen(true)} aria-haspopup="dialog">
            Contents
          </button>
        )}
      </nav>

      {contentsOpen && book.contents && (
        <div className="contents-backdrop" onClick={() => setContentsOpen(false)}>
          <nav className="contents parchment" aria-label="Contents" onClick={(e) => e.stopPropagation()}>
            <h3>Contents</h3>
            <ol>
              {book.contents.map((c, k) => (
                <li key={k} className={`contents__entry contents__entry--${c.level}`}>
                  <button
                    type="button"
                    autoFocus={k === 0}
                    onClick={() => {
                      setContentsOpen(false);
                      if (contentsAt[k] !== undefined && contentsAt[k]! >= 0) setPos(normal(contentsAt[k]! + 2));
                    }}
                  >
                    <span>{c.title}</span>
                    <span className="contents__page">{(contentsAt[k] ?? 0) + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {/* The hidden page the text is measured against. */}
      <div ref={measure} className="leafpage leafpage--measure" aria-hidden="true" />
    </div>
  );
}

function PageFace({ sheet, book, term, guided }: { sheet: Sheet | undefined; book: Book; term: string; guided: boolean }) {
  if (!sheet || sheet.kind === 'blank') return <div className="leafpage leafpage--blank" />;
  if (sheet.kind === 'title') {
    return (
      <div className="leafpage leafpage--title">
        <Fleuron />
        <h3>{book.title}</h3>
        {book.subtitle && <p className="leafpage__subtitle">{book.subtitle}</p>}
        <Fleuron size={16} />
        <p className="leafpage__imprint">Kept by the Thalmor Embassy</p>
      </div>
    );
  }
  const text = (b: Block): ReactNode => prose(b.text, term, guided && (b.kind === 'para' || b.kind === 'note'));
  return (
    <div className="leafpage">
      {sheet.page.blocks.map((b, k) => {
        switch (b.kind) {
          case 'chapter':
            return <h4 key={k}>{text(b)}</h4>;
          case 'section':
            return (
              <h5 key={k} className="leafpage__section">
                {text(b)}
              </h5>
            );
          case 'article':
            return (
              <h6 key={k} className="leafpage__article">
                {text(b)}
              </h6>
            );
          case 'note':
            return (
              <p key={k} className="leafpage__note">
                <em>{text(b)}</em>
              </p>
            );
          default:
            return <p key={k}>{text(b)}</p>;
        }
      })}
      <span className="leafpage__folio">{sheet.n}</span>
    </div>
  );
}

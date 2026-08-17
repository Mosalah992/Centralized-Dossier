// Thalmor Chronicles — the one volume that is read rather than tabulated.
//
// Every other view lays its register out as a table, because a register is a
// table. This one is prose, and prose set in a full-width column under a
// parchment header reads like a web page rather than a book. So it is bound:
// two leaves, a spine, a leaf that turns, and the reader's place kept.
//
// The mechanic is ported from the Canonreeve Archives reader — spread s shows
// pages [2s-1, 2s], with s=0 showing the board and the title page — and the
// turn is done with a third leaf held above the spread, its front carrying the
// outgoing page and its back the incoming one, rotated on the spine. Readers
// who ask for less motion get the same spread without the rotation, and narrow
// screens get one page at a time, because a two-page spread on a phone is two
// unreadable pages.
//
// Its text arrives from /api/chronicle rather than from this bundle. That is
// the whole point of the volume: see SealedVolume in shared/types.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { chronicleIsOpen, openChronicle, useChronicle } from '../api';
import type { Chronicle, ChronicleEntry } from '../api';
import { Consulting, Notice } from '../components/Notice';
import { GuidedToggle, mark, prose, useGuidedReading } from '../reading';
import sealUrl from '../assets/volumes/informants-seal.webp';

/**
 * Roughly how much text a page holds before it has to scroll.
 *
 * Pagination is by character budget rather than by measurement: entries run
 * from one line to a dozen, so a fixed count per page would leave some leaves
 * a third full and overflow others badly. A budget keeps them close to even
 * without a layout pass, and the page still scrolls if an entry is longer than
 * the budget by itself — which a few of the graver ones are.
 */
const PAGE_BUDGET = 1500;

interface Leaf {
  /** Running head, printed small above the text. */
  head: string;
  body: ReactNode;
  /**
   * What this leaf holds, in plain text, so the scrying can say which leaf a
   * passage landed on. Recorded as the leaf is packed: by the time a body
   * exists it is React, and reading the text back out of a rendered tree to
   * search it would be working against the grain.
   *
   * Absent on the leaves carrying no record — the title page, the foreword and
   * the colophon. Those are the volume talking about itself, and turning them
   * up in a search for a name would only be noise.
   */
  items?: { label: string; text: string }[];
}

/**
 * A short window of `text` around the first hit, marked.
 *
 * Cut on the term rather than from the start of the passage: an entry can run
 * a dozen lines, and a result list that opened every one of them at its first
 * sentence would say nothing about why it matched.
 */
function snippet(text: string, term: string): ReactNode {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return mark(text.slice(0, 140), term);
  const from = Math.max(0, at - 60);
  const to = Math.min(text.length, at + term.length + 90);
  return (
    <>
      {from > 0 && '… '}
      {mark(text.slice(from, to), term)}
      {to < text.length && ' …'}
    </>
  );
}

function Entry(
  { entry, term, guided }: { entry: ChronicleEntry; term: string; guided: boolean },
) {
  return (
    <div className={`chron-entry${entry.weight === 'grave' ? ' chron-entry--grave' : ''}`}>
      <p className="chron-entry__date">{mark(entry.date, term)}</p>
      <p className="chron-entry__text">{prose(entry.text, term, guided)}</p>
    </div>
  );
}

/** Greedy pack: fill a leaf until the budget is spent, then start another. */
function packEntries(
  entries: ChronicleEntry[],
  head: string,
  term: string,
  guided: boolean,
  lead?: ReactNode,
): Leaf[] {
  const leaves: Leaf[] = [];
  let batch: ChronicleEntry[] = [];
  let spent = 0;

  const flush = () => {
    if (!batch.length) return;
    const mine = batch;
    const first = leaves.length === 0;
    leaves.push({
      head,
      body: (
        <>
          {first && lead}
          {mine.map((entry) => (
            <Entry
              key={entry.date + entry.text.slice(0, 24)}
              entry={entry}
              term={term}
              guided={guided}
            />
          ))}
        </>
      ),
      items: mine.map((entry) => ({ label: entry.date, text: entry.text })),
    });
    batch = [];
    spent = 0;
  };

  // The month's standfirst occupies part of the first leaf, so that leaf takes
  // a smaller share of entries than the ones after it.
  if (lead) spent = 420;

  for (const entry of entries) {
    if (batch.length && spent + entry.text.length > PAGE_BUDGET) flush();
    batch.push(entry);
    spent += entry.text.length;
  }
  flush();
  return leaves;
}

function buildLeaves(chronicle: Chronicle, term: string, guided: boolean): Leaf[] {
  const leaves: Leaf[] = [];

  // Page 0 — the title page, which sits opposite the board.
  leaves.push({
    head: '',
    body: (
      <div className="chron-title">
        <p className="chron-title__class">Sealed — Embassy Register</p>
        <h1 className="chron-title__name">Thalmor Chronicles</h1>
        <p className="chron-title__rule" aria-hidden />
        <p className="chron-title__by">
          Assembled from the field reports of seven-and-forty informants of the
          Thalmor Embassy in Skyrim.
        </p>
        <p className="chron-title__span">Rain’s Hand 28 — Last Seed 13</p>
      </div>
    ),
  });

  // Page 1 — provenance, and the one thing the compiler could not settle.
  leaves.push({
    head: 'Before the Chronicle',
    body: (
      <>
        <h2 className="chron-h">Before the Chronicle</h2>
        {/* Written through `prose` like the entries are, so guided reading does
            not stop at the foreword and leave the reader wondering whether it
            had failed. The cited title is its own run because it is set in
            italic and the guide has to fall inside the emphasis, not around it. */}
        <p className="chron-p">
          {prose(
            'What follows is drawn from the Embassy’s own informants — every report '
            + 'filed to the Justiciars across four months, and the working traffic '
            + 'around them. It is not the account of the free presses, which is kept in ',
            term, guided,
          )}
          <em>{prose('History of the Realm', term, guided)}</em>
          {prose(
            ' and which the province may read. This is what our agents wrote to us, '
            + 'and it is sealed accordingly.',
            term, guided,
          )}
        </p>
        <p className="chron-p">
          {prose(
            'Where two loyal accounts of one day disagree, both are set down and the '
            + 'disagreement is marked. Nothing here is smoothed for the comfort of the '
            + 'reader, and nothing is invented to close a gap. Where the record simply '
            + 'stops — and it stops in several places, some of them grave — this '
            + 'chronicle says so rather than guess.',
            term, guided,
          )}
        </p>
      </>
    ),
  });

  for (const month of chronicle.months) {
    const lead = (
      <>
        <h2 className="chron-h">{month.name}</h2>
        <p className="chron-standfirst">{prose(month.standfirst, term, guided)}</p>
      </>
    );
    leaves.push(...packEntries(month.entries, month.name, term, guided, lead));
  }

  // Closing apparatus: who was arrayed against us, and what we never learned.
  const powerLeaves: Leaf[] = [];
  let batch: typeof chronicle.powers = [];
  let spent = 420;
  const flushPowers = () => {
    if (!batch.length) return;
    const mine = batch;
    const first = powerLeaves.length === 0;
    powerLeaves.push({
      head: 'The Powers Arrayed',
      body: (
        <>
          {first && <h2 className="chron-h">The Powers Arrayed</h2>}
          <dl className="chron-list">
            {mine.map((p) => (
              <div className="chron-list__row" key={p.name}>
                <dt>{mark(p.name, term)}</dt>
                <dd>{prose(p.note, term, guided)}</dd>
              </div>
            ))}
          </dl>
        </>
      ),
      items: mine.map((p) => ({ label: p.name, text: p.note })),
    });
    batch = [];
    spent = 0;
  };
  for (const power of chronicle.powers) {
    if (batch.length && spent + power.note.length > PAGE_BUDGET) flushPowers();
    batch.push(power);
    spent += power.note.length;
  }
  flushPowers();
  leaves.push(...powerLeaves);

  const gapLeaves: Leaf[] = [];
  let gaps: typeof chronicle.unresolved = [];
  let gapSpent = 420;
  const flushGaps = () => {
    if (!gaps.length) return;
    const mine = gaps;
    const first = gapLeaves.length === 0;
    gapLeaves.push({
      head: 'What the Record Does Not Say',
      body: (
        <>
          {first && <h2 className="chron-h">What the Record Does Not Say</h2>}
          <dl className="chron-list">
            {mine.map((u) => (
              <div className="chron-list__row" key={u.name}>
                <dt>{mark(u.name, term)}</dt>
                <dd>{prose(u.note, term, guided)}</dd>
              </div>
            ))}
          </dl>
        </>
      ),
      items: mine.map((u) => ({ label: u.name, text: u.note })),
    });
    gaps = [];
    gapSpent = 0;
  };
  for (const item of chronicle.unresolved) {
    if (gaps.length && gapSpent + item.note.length > PAGE_BUDGET) flushGaps();
    gaps.push(item);
    gapSpent += item.note.length;
  }
  flushGaps();
  leaves.push(...gapLeaves);

  leaves.push({
    head: 'Colophon',
    body: (
      <div className="chron-colophon">
        <h2 className="chron-h">Colophon</h2>
        <p className="chron-p">
          Compiled from the informants’ reports as they were filed, and sealed
          under the writ of the Embassy. It is held apart from the registers
          because it is not read from the roll: no clerk keeps it, and no tab can
          withdraw it. It may be read only by those who answer the gate.
        </p>
        <p className="chron-p chron-p--sig">
          <em>For the Glory of the Third Aldmeri Dominion.</em>
        </p>
      </div>
    ),
  });

  return leaves;
}

/**
 * The volume's own door.
 *
 * Not the archive's gate reused: a reader who reaches this has already answered
 * that one, and telling them the archive is sealed would be false. This asks
 * for the second word only, and a refusal here leaves them exactly where they
 * were — still inside the archive, still holding their writ, simply not
 * admitted to this book.
 */
function VolumeSeal({ onOpen }: { onOpen: () => void }) {
  const [word, setWord] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="chron-lock"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || !word) return;
        setPending(true);
        setRefusal(null);
        openChronicle(word)
          .then((error) => {
            if (error) {
              setRefusal(error);
              setWord('');
            } else {
              onOpen();
            }
          })
          .catch(() => setRefusal('The volume cannot be reached.'))
          .finally(() => setPending(false));
      }}
    >
      <img className="chron-lock__seal" src={sealUrl} alt="" width={186} height={186} />

      <p className="chron-lock__class">Sealed — Embassy Register</p>
      <h1 className="chron-lock__title">Thalmor Chronicles</h1>
      <p className="chron-lock__note">
        This volume is kept under its own word. Your writ admits you to the
        archive; it does not admit you here.
      </p>

      <label className="chron-lock__label" htmlFor="chron-word">
        The word
      </label>
      <input
        id="chron-word"
        className="chron-lock__input"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={word}
        onChange={(event) => setWord(event.target.value)}
        disabled={pending}
      />

      {/* Reserved height, so a refusal does not shove the button down the page. */}
      <p className="chron-lock__refusal" role="alert">
        {refusal ?? ' '}
      </p>

      <button className="chron-lock__btn" type="submit" disabled={pending || !word}>
        {pending ? 'Testing the seal' : 'Break the seal'}
      </button>
    </form>
  );
}

export function InformantsView() {
  // Null until the volume's door has answered, so the lock does not flash for a
  // reader who is already through it.
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    chronicleIsOpen().then((open) => {
      if (live) setUnlocked(open);
    });
    return () => {
      live = false;
    };
  }, []);

  const chronicle = useChronicle(unlocked === true);

  const [query, setQuery] = useState('');
  // Two characters is where a search stops being every page at once. The
  // volume runs to eighty-five entries, so a single letter answers with the
  // whole book and tells the reader nothing.
  const term = query.trim().length >= 2 ? query.trim() : '';

  // Rebuilt when the term changes, because the marking is baked into the leaf
  // bodies. That is cheap — eighty-five entries — and it buys the one thing a
  // search over a paginated book has to have: the pagination cannot move under
  // the reader, since packing counts raw characters and marking adds none.
  const [guided, setGuided] = useGuidedReading();

  const leaves = useMemo(
    () => (chronicle.state === 'ready' ? buildLeaves(chronicle.value, term, guided) : []),
    [chronicle, term, guided],
  );

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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => {
      setNarrow(mq.matches);
      // Keep roughly the same place across the change of binding.
      if (mq.matches) setPage((p) => (spread === 0 ? 0 : 2 * spread - 1) || p);
      else setSpread(page === 0 ? 0 : Math.ceil(page / 2));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [spread, page]);

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

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setSpread(to);
        return;
      }
      setTurning({ dir, to });
    },
    [turning, narrow, spread, maxSpread, total],
  );

  /**
   * Open the volume at a given leaf. Used by the scrying, which knows a leaf
   * index and nothing about how the book is bound — and the binding changes
   * under it, since a narrow screen shows one leaf where a wide one shows two.
   */
  const openAt = useCallback(
    (index: number) => {
      if (narrow) setPage(index);
      // Leaf 0 faces the inside board and has no partner; every later spread
      // holds an odd leaf on the left and the even one after it on the right.
      else setSpread(index === 0 ? 0 : Math.ceil(index / 2));
    },
    [narrow],
  );

  // Drive the rotation one frame after the leaf is mounted, so the browser has
  // a start state to animate from rather than jumping straight to the end.
  useEffect(() => {
    if (!turning) return;
    const node = leafRef.current;
    if (!node) return;

    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => node.classList.add('chron-leaf--over')),
    );

    const done = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform') return;
      setSpread(turning.to);
      setTurning(null);
    };
    node.addEventListener('transitionend', done);

    // A leaf that never fires transitionend (interrupted, or a browser that
    // skips it) would strand the reader mid-turn with the controls locked.
    const failsafe = window.setTimeout(() => {
      setSpread(turning.to);
      setTurning(null);
    }, 1400);

    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('transitionend', done);
      window.clearTimeout(failsafe);
    };
  }, [turning]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') turn(1);
      if (event.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  if (unlocked === null) return <Consulting />;
  if (!unlocked) return <VolumeSeal onOpen={() => setUnlocked(true)} />;

  if (chronicle.state === 'loading') return <Consulting />;
  if (chronicle.state === 'error') {
    return (
      <Notice
        kind="error"
        title="The chronicle cannot be opened"
        body={chronicle.message}
      />
    );
  }

  const [leftIndex, rightIndex] = facing(spread);
  const left = at(leftIndex);
  const right = at(rightIndex);
  const atCover = spread === 0;

  // While a leaf is in flight the spread beneath it is already the destination,
  // so the reader sees the new page appear from under the turning one.
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
      {/* The scrying. A search over a sealed volume, dressed as the Embassy
          would dress it — but it is still a search box, so it is a real input
          in a real label and answers to the keyboard like one. */}
      <form className="scry" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="scry__glass" aria-hidden>
          <span className="scry__eye" />
        </div>
        <div className="scry__field">
          <label className="scry__label" htmlFor="scry-input">
            Scry the chronicle
          </label>
          <input
            id="scry-input"
            className="scry__input"
            type="search"
            value={query}
            spellCheck={false}
            autoComplete="off"
            placeholder="a name, a hold, a day…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {query && (
          <button
            type="button"
            className="scry__clear"
            onClick={() => setQuery('')}
            aria-label="Dismiss the scrying"
          >
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
          {found.length > 40 && (
            <p className="scry__more">
              Showing the first 40. Narrow the word to see the rest.
            </p>
          )}
        </div>
      )}

      <div className={`chron-book${atCover && !narrow ? ' chron-book--cover' : ''}`}>
        {/* The volume's own seal, not the Dominion insignia the rest of the
            archive stamps — this board belongs to this book. */}
        <div className="chron-board" aria-hidden>
          <img className="chron-board__seal" src={sealUrl} alt="" width={186} height={186} />
        </div>

        <div className="chron-page chron-page--left">
          <button
            className="chron-edge chron-edge--left"
            type="button"
            onClick={() => turn(-1)}
            disabled={first}
            aria-label="Previous page"
          />
          {/* Keyed on the leaf being shown so React remounts it on a turn.
              Without it the overflow scroll position survives the page change,
              and a reader who scrolled to the foot of one leaf lands halfway
              down the next. */}
          <Face key={leftIndex} leaf={narrow ? null : underLeft} side="left" />
        </div>

        <div className="chron-spine" aria-hidden />

        <div className="chron-page chron-page--right">
          <button
            className="chron-edge chron-edge--right"
            type="button"
            onClick={() => turn(1)}
            disabled={last}
            aria-label="Next page"
          />
          <Face
            key={narrow ? `p${page}` : `r${rightIndex}`}
            leaf={narrow ? at(page) : underRight}
            side="right"
          />
        </div>

        {turning && (
          <div
            ref={leafRef}
            className={`chron-leaf${turning.dir === -1 ? ' chron-leaf--back' : ''}`}
            aria-hidden
          >
            <div className="chron-leaf__face chron-leaf__face--front">
              <Face leaf={leafFront} side="right" />
            </div>
            <div className="chron-leaf__face chron-leaf__face--back">
              <Face leaf={leafBack} side="left" />
            </div>
          </div>
        )}
      </div>

      <nav className="chron-nav" aria-label="Chronicle navigation">
        <button className="chron-nav__btn" type="button" onClick={() => turn(-1)} disabled={first}>
          ‹ Previous
        </button>
        <span className="chron-nav__pos" aria-live="polite">
          {narrow
            ? `Page ${page + 1} of ${total}`
            : `Spread ${spread + 1} of ${maxSpread + 1}`}
        </span>
        <button className="chron-nav__btn" type="button" onClick={() => turn(1)} disabled={last}>
          Next ›
        </button>
      </nav>
    </div>
  );
}

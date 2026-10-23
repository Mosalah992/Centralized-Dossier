// Thalmor Chronicles — the first volume that was read rather than tabulated,
// and the pattern every volume on the bookshelf now follows (2026-10-23): its
// reader became web/src/books/BoundBook.tsx, and this file keeps only what is
// the Chronicles' own — how its months, filings and apparatus are set as leaves.
//
// Its text arrives from /api/chronicle rather than from this bundle. It is no
// longer sealed: the First Emissary opened it, Latest Filings and all, on
// 2026-10-23, and Ancarion's gate came off it.

import { useCallback } from 'react';
import type { ReactNode } from 'react';

import type { ServedFiling } from '../../../shared/filings';
import { useChronicle } from '../api';
import type { Chronicle, ChronicleEntry } from '../api';
import { BoundBook } from '../books/BoundBook';
import { PAGE_BUDGET, type Leaf } from '../books/leaves';
import { Consulting, Notice } from '../components/Notice';
import { mark, prose } from '../reading';
import sealUrl from '../assets/volumes/informants-seal.webp';

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
        <p className="chron-title__class">Embassy Register</p>
        <h1 className="chron-title__name">Chronicles</h1>
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
      <div className="chron-foreword">
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
            + 'and it is kept apart accordingly.',
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
      </div>
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
  // NOT pushed here — see the note above the colophon. The powers are built at
  // this point because the packing needs `chronicle.powers` in scope, and they
  // are laid in at the back of the volume.

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

  /*
   * ── The funeral ─────────────────────────────────────────────────────────
   *
   * Set as a document rather than written up as an entry, for the same reason
   * the Notice of Recall is in History of the Realm: the Embassy did not write
   * it. Every other page in this volume is the Embassy's account of what it
   * did; this is a notice posted for the province, and the one thing the
   * archive holds on how its longest search ended.
   */
  const funeral = chronicle.funeral;
  if (funeral) {
    leaves.push({
      head: 'The Warden of the Pale',
      body: (
        <div className="chron-obit">
          <h2 className="chron-h">The Warden of the Pale</h2>
          <p className="chron-p">{prose(funeral.lead, term, guided)}</p>
          <figure className="chron-notice">
            {funeral.notice.map((line, i) => (
              <p
                className={i === 1 || i === 2 ? 'chron-notice__name' : 'chron-notice__line'}
                key={line.slice(0, 28)}
              >
                {mark(line, term)}
              </p>
            ))}
            <p className="chron-notice__close">{mark(funeral.close, term)}</p>
          </figure>
        </div>
      ),
      items: [
        { label: 'Ghorzug, Warden of the Pale', text: funeral.lead },
        { label: 'Eirik Colderwater', text: funeral.notice.join(' ') },
      ],
    });
  }

  /*
   * ── The Latest Filings ──────────────────────────────────────────────────
   *
   * Raw reports, pulled nightly by the chronicler Worker and NOT written up.
   * They are set apart from everything above them on purpose: the months are
   * composed prose, read out of the reports and rewritten, and these are the
   * reports themselves with the handles taken out. Letting the two sit in one
   * sequence would quietly claim the volume had chronicled something it has
   * only received.
   *
   * Absent, empty, and "the collector found nothing last night" all render the
   * same way — as no section at all — which is right: a heading over an empty
   * list tells the reader about the machinery rather than about the Embassy.
   */
  const filings = chronicle.filings ?? [];
  if (filings.length) {
    const filingLeaves: Leaf[] = [];
    let batch: ServedFiling[] = [];
    let spent = 0;

    const flushFilings = () => {
      if (!batch.length) return;
      const mine = batch;
      const first = filingLeaves.length === 0;

      filingLeaves.push({
        head: 'Latest Filings',
        body: (
          <>
            {first && <h2 className="chron-h">Latest Filings</h2>}
            {first && (
              <p className="chron-p chron-p--standfirst">
                {prose(
                  'Reports received since the chronicle was last written, set down as '
                  + 'they were filed. They have not been read into the record above: no '
                  + 'judgement has been passed on them, nothing has been corroborated, '
                  + 'and no month has been composed from them yet.',
                  term, guided,
                )}
              </p>
            )}
            {mine.map((f) => (
              <article className="chron-filing" key={`${f.agent}-${f.filedAt}`}>
                <p className="chron-filing__head">
                  <span className="chron-filing__agent">{mark(f.agent, term)}</span>
                  {f.inWorld && <span className="chron-filing__when">{f.inWorld}</span>}
                  <span className="chron-filing__filed">{f.filedAt.slice(0, 10)}</span>
                </p>
                <p className="chron-p">{prose(f.text, term, guided)}</p>
              </article>
            ))}
          </>
        ),
        items: mine.map((f) => ({ label: f.agent, text: f.text })),
      });

      batch = [];
      spent = 0;
    };

    for (const f of filings) {
      if (batch.length && spent + f.text.length > PAGE_BUDGET) flushFilings();
      batch.push(f);
      spent += f.text.length;
    }
    flushFilings();
    leaves.push(...filingLeaves);
  }

  /*
   * THE POWERS ARRAYED, at the back.
   *
   * They used to sit between the last month and the closing apparatus, which
   * put four pages of standing description in the middle of a chronicle that
   * runs by date — the reader came off Last Seed, read a survey of the Empire,
   * the holds and the orders, and then had to pick the thread up again at the
   * Warden. A reference table belongs where a reader goes looking for it rather
   * than where they trip over it.
   *
   * Before the colophon and not after it: the colophon is the book's note about
   * itself and is the last leaf by definition.
   */
  leaves.push(...powerLeaves);

  leaves.push({
    head: 'Colophon',
    body: (
      <div className="chron-colophon">
        <h2 className="chron-h">Colophon</h2>
        <p className="chron-p">
          Compiled from the informants’ reports as they were filed. It is held
          apart from the registers because it is not read from the roll: no
          clerk keeps it, and no tab can withdraw it.
        </p>
        <p className="chron-p chron-p--sig">
          <em>For the Glory of the Third Aldmeri Dominion.</em>
        </p>
      </div>
    ),
  });

  return leaves;
}

export function InformantsView() {
  const chronicle = useChronicle();
  const value = chronicle.state === 'ready' ? chronicle.value : null;
  const build = useCallback((term: string, guided: boolean) => (value ? buildLeaves(value, term, guided) : []), [value]);

  if (chronicle.state === 'loading') return <Consulting />;
  if (chronicle.state === 'error') {
    return <Notice kind="error" title="The chronicle cannot be opened" body={chronicle.message} />;
  }

  return (
    <BoundBook
      build={build}
      seal={sealUrl}
      scryLabel="Scry the chronicle"
      placeholder="a name, a hold, a day…"
      navLabel="Chronicle navigation"
      focusSearch
    />
  );
}

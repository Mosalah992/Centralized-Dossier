// A book taken down from the shelf and opened over it, bound as every volume
// on the shelf is (2026-10-23; web/src/books/BoundBook.tsx). It replaced the
// Bruma-ported reader, which typeset pages by measurement; the books now read
// exactly as the Chronicles do.
//
// Books here are bundled (web/src/books/), each its own lazy chunk; Phase 2
// adds books a librarian shelves, served from /api/room/books/:slug.

import { useCallback, useEffect, useState } from 'react';

import sealUrl from '../../assets/gate-seal.webp';
import type { Book } from '../../../../shared/books';
import { bindBlocks, type BookBlock } from '../../books/bind';
import { BoundBook } from '../../books/BoundBook';
import { TitlePage, type Leaf } from '../../books/leaves';
import { bundledBook } from '../../books/registry';
import { fetchRoom } from '../room-api';

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

/**
 * A book's pages as blocks: each page's heading a chapter, '## ' and '### '
 * paragraphs headings, a paragraph wrapped in asterisks an aside.
 */
export function blocksOfBook(book: Book): BookBlock[] {
  const blocks: BookBlock[] = [];
  for (const page of book.pages) {
    if (page.heading) blocks.push({ kind: 'chapter', text: page.heading });
    for (const p of page.paragraphs) {
      if (p.startsWith('### ')) blocks.push({ kind: 'heading', text: p.slice(4) });
      else if (p.startsWith('## ')) blocks.push({ kind: 'heading', text: p.slice(3) });
      else if (/^\*.+\*$/s.test(p)) blocks.push({ kind: 'para', aside: true, text: p.slice(1, -1) });
      else blocks.push({ kind: 'para', text: p });
    }
  }
  return blocks;
}

function Bound({ book }: { book: Book }) {
  const build = useCallback(
    (term: string, guided: boolean): Leaf[] => [
      {
        head: '',
        body: (
          <TitlePage
            kicker="The Embassy’s Shelf"
            name={book.title}
            by={book.subtitle}
            span={book.draft ? 'A draft, awaiting the community’s own wording.' : undefined}
          />
        ),
      },
      ...bindBlocks(blocksOfBook(book), term, guided),
    ],
    [book],
  );
  return (
    <BoundBook
      build={build}
      seal={sealUrl}
      scryLabel="Search the book"
      placeholder="a word, a clause, a name…"
      navLabel={`${book.title} navigation`}
    />
  );
}

export function ShelfBook({ slug }: { slug: string }) {
  const book = useBook(slug);
  if (book.state === 'loading') return <p className="loading">Opening the book…</p>;
  if (book.state === 'missing') return <p className="loading">No such book stands on this shelf.</p>;
  if (book.state === 'error') return <p className="loading">The book could not be opened.</p>;
  return <Bound book={book.book} />;
}

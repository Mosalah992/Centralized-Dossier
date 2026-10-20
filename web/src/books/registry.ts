// The books the Embassy keeps on its own shelf, bundled with the site.
//
// Embassy-kept like the Penal Code rather than a volume: the White-Gold
// Concordat is public text the Embassy holds, not a register read from the
// sheet (VOLUMES) and not one of the archive's own registers (KEPT), so it has
// no slug, no cover and no place in the rail. Each book is its own lazy chunk;
// the shelf needs only the spine, which lives here.
//
// Phase 2 shelves more books through the Librarian; the bookshelf merges those
// from /api/room/books with this list.

import type { Book, BookSummary } from '../../../shared/books';

interface BundledBook {
  summary: BookSummary;
  load: () => Promise<Book>;
}

export const BUNDLED_BOOKS: readonly BundledBook[] = [
  {
    summary: {
      slug: 'white-gold-concordat',
      title: 'The White-Gold Concordat',
      subtitle: 'Peace Treaty between the Mede Empire and the Aldmeri Dominion',
      spine: { leather: '#2b2216', label: 'WGC', height: 0.97 },
      pageCount: 43,
    },
    load: () => import('./white-gold-concordat.json').then((m) => m.default as Book),
  },
];

export const bundledBook = (slug: string) => BUNDLED_BOOKS.find((b) => b.summary.slug === slug);

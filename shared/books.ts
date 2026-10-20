// A book on the Embassy's bookshelf. Shared by the browser and (in Phase 2)
// the Functions, so the shape of a book is defined once whether it is bundled
// (web/src/books/) or shelved by a librarian into D1. Ported from the Bruma
// Joint Archives, which defined it first.

export interface BookPage {
  heading?: string;
  /**
   * Paragraphs in reading order. A paragraph starting '## ' is a section
   * heading, '### ' an article heading; one wrapped in *asterisks* is an
   * italic note.
   */
  paragraphs: string[];
}

/** A Contents entry: chapter (1) or section (2), and the page index it opens on. */
export interface ContentsEntry {
  title: string;
  level: 1 | 2;
  page: number;
}

export interface Book {
  slug: string;
  title: string;
  subtitle?: string;
  /** Spine binding: leather colour, the short label on the spine, height 0.8–1. */
  spine: { leather: string; label: string; height?: number };
  /** Placeholder text awaiting the community's own wording. */
  draft?: boolean;
  contents?: ContentsEntry[];
  pages: BookPage[];
}

export type BookSummary = Omit<Book, 'pages' | 'contents'> & { pageCount: number };

// The shelf only needs the spine; contents and pages come with the book itself.
export const summarize = ({ pages, contents: _contents, ...rest }: Book): BookSummary => ({ ...rest, pageCount: pages.length });

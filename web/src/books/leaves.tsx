// The leaves of a bound book, and the small pieces of type-setting every bound
// volume shares (BoundBook.tsx): the character budget a leaf is packed to, the
// snippet a search hit shows, and which page numbers the pager prints.

import type { ReactNode } from 'react';

import { mark } from '../reading';

/**
 * Roughly how much text a page holds before it has to scroll.
 *
 * Pagination is by character budget rather than by measurement: entries run
 * from one line to a dozen, so a fixed count per page would leave some leaves
 * a third full and overflow others badly. A budget keeps them close to even
 * without a layout pass, and the page still scrolls if an entry is longer than
 * the budget by itself.
 */
export const PAGE_BUDGET = 1500;

export interface Leaf {
  /** Running head, printed small above the text. */
  head: string;
  body: ReactNode;
  /**
   * What this leaf holds, in plain text, so the scrying can say which leaf a
   * passage landed on. Recorded as the leaf is packed: by the time a body
   * exists it is React, and reading the text back out of a rendered tree to
   * search it would be working against the grain.
   *
   * Absent on the leaves carrying no record (title page, foreword, colophon).
   */
  items?: { label: string; text: string }[];
}

/**
 * A short window of `text` around the first hit, marked. Cut on the term
 * rather than from the start of the passage, so a result says why it matched.
 */
export function snippet(text: string, term: string): ReactNode {
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

/**
 * Which page numbers to print, given where the reader is: always the first and
 * the last, the current and its neighbours, and an ellipsis wherever the run
 * breaks. Below eight it prints them all. The ellipsis is not a button.
 */
export function pageWindow(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);

  const out: (number | 'gap')[] = [0];
  const lo = Math.max(1, Math.min(current - 1, count - 4));
  const hi = Math.min(count - 2, Math.max(current + 1, 3));

  if (lo > 1) out.push('gap');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 2) out.push('gap');

  out.push(count - 1);
  return out;
}

/** A volume's title page: what it is, its name, a rule, who made it, and its span. */
export function TitlePage({ kicker, name, by, span }: { kicker: string; name: string; by?: ReactNode; span?: string }) {
  return (
    <div className="chron-title">
      <p className="chron-title__class">{kicker}</p>
      <h1 className="chron-title__name">{name}</h1>
      <p className="chron-title__rule" aria-hidden />
      {by && <p className="chron-title__by">{by}</p>}
      {span && <p className="chron-title__span">{span}</p>}
    </div>
  );
}

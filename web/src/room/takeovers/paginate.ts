// Typesetting for the reader (ported unchanged from the Bruma Joint Archives). A book arrives as source pages (chapters and
// their paragraphs); the reader flows that text into pages of whatever size
// the screen gives it, measuring each block in a hidden page with the same
// styles, so a desktop page is full and a phone page never overflows.

import type { Book } from '../../../../shared/books';

export type BlockKind = 'chapter' | 'section' | 'article' | 'note' | 'para';

export interface Block {
  kind: BlockKind;
  text: string;
  /** Index of the source page this block came from, for the Contents. */
  src: number;
  /** Index in the flattened book, so a reader's place survives re-typesetting. */
  i: number;
}

export interface SetPage {
  blocks: Block[];
}

export function flatten(book: Book): Block[] {
  const out: Block[] = [];
  const add = (kind: BlockKind, text: string, src: number) => out.push({ kind, text, src, i: out.length });
  book.pages.forEach((page, src) => {
    if (page.heading) add('chapter', page.heading, src);
    for (const p of page.paragraphs) {
      if (p.startsWith('### ')) add('article', p.slice(4), src);
      else if (p.startsWith('## ')) add('section', p.slice(3), src);
      else if (/^\*.+\*$/.test(p)) add('note', p.slice(1, -1), src);
      else add('para', p, src);
    }
  });
  return out;
}

const isHeading = (b: Block) => b.kind === 'chapter' || b.kind === 'section' || b.kind === 'article';

/** The element a block renders as; Page in BookReader renders the same tags and classes. */
export function blockElement(doc: Document, b: Block): HTMLElement {
  const tag = { chapter: 'h4', section: 'h5', article: 'h6', note: 'p', para: 'p' }[b.kind];
  const el = doc.createElement(tag);
  if (b.kind === 'section') el.className = 'leafpage__section';
  if (b.kind === 'article') el.className = 'leafpage__article';
  if (b.kind === 'note') {
    el.className = 'leafpage__note';
    el.appendChild(doc.createElement('em')).textContent = b.text;
  } else el.textContent = b.text;
  return el;
}

/**
 * Flow blocks into pages that fit `measure` (an empty, hidden .leafpage of the
 * real page's size). Chapters start a fresh page; a heading is never left at
 * the foot of a page; a paragraph too long for a page is split at sentences.
 */
export function paginate(blocks: Block[], measure: HTMLElement, height: number): SetPage[] {
  const doc = measure.ownerDocument;
  const pages: SetPage[] = [];
  let cur: Block[] = [];
  // Measure how far the text runs, not how big the hidden box happens to be:
  // a zero-height marker after the last block gives the content's foot, and
  // the page's bottom padding is added to it. This holds whatever height the
  // browser gives the measuring element.
  const style = getComputedStyle(measure);
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const marker = doc.createElement('div');
  marker.style.cssText = 'height:0;margin:0;padding:0;clear:both';
  const overflows = () => {
    measure.appendChild(marker);
    const foot = marker.getBoundingClientRect().top - measure.getBoundingClientRect().top + padBottom;
    marker.remove();
    return foot > height + 1;
  };
  const reset = () => {
    measure.replaceChildren();
  };
  const flush = () => {
    if (cur.length) pages.push({ blocks: cur });
    cur = [];
    reset();
  };
  const tryAdd = (b: Block): boolean => {
    const el = blockElement(doc, b);
    measure.appendChild(el);
    if (!overflows()) {
      cur.push(b);
      return true;
    }
    el.remove();
    return false;
  };

  /** Place a paragraph, splitting it at sentences when it cannot fit whole. */
  const placePara = (b: Block) => {
    if (tryAdd(b)) return;
    const sentences: string[] = b.text.match(/[^.;:!?]+[.;:!?]+["”’)]*\s*|[^.;:!?]+$/g) ?? [b.text];
    let rest: string[] = sentences;
    while (rest.length) {
      // As much of the rest as fits on this page.
      let take = rest.length;
      while (take > 0 && !tryAdd({ ...b, text: rest.slice(0, take).join('').trim() })) take--;
      if (take === 0) {
        if (cur.length) {
          flush();
          continue;
        }
        // A single sentence longer than a page: place it and let the page scroll.
        cur.push({ ...b, text: rest[0]!.trim() });
        measure.appendChild(blockElement(doc, cur[cur.length - 1]!));
        take = 1;
      }
      rest = rest.slice(take);
      if (rest.length) flush();
    }
  };

  /**
   * Keep-with-next, decided before placing rather than repaired after: a run
   * of headings goes on this page only if the opening sentence of the text
   * that follows it fits here too. Otherwise the page ends before them.
   */
  const fitsWithNext = (from: number): boolean => {
    const els: HTMLElement[] = [];
    let k = from;
    while (k < blocks.length && isHeading(blocks[k]!) && blocks[k]!.kind !== 'chapter') els.push(blockElement(doc, blocks[k++]!));
    const next = blocks[k];
    if (next && !isHeading(next)) {
      const opening = next.text.match(/^[^.;:!?]+[.;:!?]*/)?.[0] ?? next.text;
      els.push(blockElement(doc, { ...next, text: opening }));
    }
    for (const el of els) measure.appendChild(el);
    const ok = !overflows();
    for (const el of els) el.remove();
    return ok;
  };

  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k]!;
    if (b.kind === 'chapter' && cur.length) flush();
    if (b.kind === 'para' || b.kind === 'note') {
      placePara(b);
      continue;
    }
    // The first of a run of section/article headings decides for the run.
    const startsRun = b.kind !== 'chapter' && (k === 0 || !isHeading(blocks[k - 1]!) || blocks[k - 1]!.kind === 'chapter');
    if (startsRun && cur.length && !fitsWithNext(k)) flush();
    if (!tryAdd(b)) {
      flush();
      if (!tryAdd(b)) cur.push(b);
    }
  }
  flush();
  return pages;
}

/** The set page each Contents entry opens on. */
export function contentsPages(book: Book, pages: SetPage[]): number[] {
  return (book.contents ?? []).map((c) => {
    const at = pages.findIndex((p) =>
      p.blocks.some((b) => b.src === c.page && (c.level === 1 ? b.kind === 'chapter' : b.kind === 'section' && b.text === c.title)),
    );
    return at < 0 ? pages.findIndex((p) => p.blocks.some((b) => b.src >= c.page)) : at;
  });
}

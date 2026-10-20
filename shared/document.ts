// A document's text → the pages of a book. Used by scripts/emit-books.mjs for
// the bundled books and, in Phase 2, by the Librarian's /archives shelve, so a
// document is set the same way wherever it comes from. Ported unchanged from
// the Bruma Joint Archives so a book reads alike in both archives.
//
// The text is plain or Markdown:
//   # Heading      a chapter: always starts a new page, listed in Contents
//   ## Heading     a section: listed in Contents, never left alone at a page foot
//   ### Heading    an article or clause heading inside a section
//   blank-line-separated paragraphs; *wrapped in asterisks* = italic note
// Plain text with no headings is simply paragraphs.
//
// Pages are filled to a word budget sized for the smallest page the reader
// shows (a phone). The reader re-flows them to the screen anyway; these pages
// are the source pages the Contents points into.

import type { BookPage, ContentsEntry } from './books';

const BUDGET = 135;
const PARAGRAPH = 7;
const COST = { chapter: 30, section: 24, article: 20 };

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Blank-line-separated blocks, each joined to one line, invisible characters removed. */
export function blocksOf(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) =>
      b
        .trim()
        .replace(/\s*\n\s*/g, ' ')
        .replace(/[​-‍﻿]/g, '')
        // Deeper Markdown headings count as article headings.
        .replace(/^#{4,6} /, '### '),
    )
    .filter(Boolean);
}

/** Split a paragraph longer than a page at sentence ends. */
function splitLong(p: string): string[] {
  if (words(p) <= BUDGET - 40) return [p];
  const sentences: string[] = p.match(/[^.;:]+[.;:]+["”’)]*\s*|[^.;:]+$/g) ?? [p];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && words(cur + s) > BUDGET - 40) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function paginateBlocks(blocks: string[]): { pages: BookPage[]; contents: ContentsEntry[] } {
  const pages: BookPage[] = [];
  const contents: ContentsEntry[] = [];
  let page: BookPage | null = null;
  let used = 0;
  const open = (heading?: string) => {
    page = heading ? { heading, paragraphs: [] } : { paragraphs: [] };
    pages.push(page);
    used = heading ? COST.chapter : 0;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.startsWith('# ')) {
      const title = b.slice(2).trim();
      open(title);
      contents.push({ title, level: 1, page: pages.length - 1 });
      continue;
    }
    if (!page) open();
    const isSection = b.startsWith('## ');
    const isArticle = b.startsWith('### ');
    if (isSection || isArticle) {
      // Keep a heading with the start of what follows it.
      const after = blocks[i + 1];
      const next = after && !after.startsWith('#') ? Math.min(words(after) + PARAGRAPH, 40) : 0;
      const cost = isSection ? COST.section : COST.article;
      if (used > 0 && used + cost + next > BUDGET) open();
      page!.paragraphs.push(b);
      used += cost;
      if (isSection) contents.push({ title: b.slice(3).trim(), level: 2, page: pages.length - 1 });
      continue;
    }
    for (const part of splitLong(b)) {
      const n = words(part) + PARAGRAPH;
      if (used > 0 && used + n > BUDGET) open();
      page!.paragraphs.push(part);
      used += n;
    }
  }
  // A heading never ends a page: carry any trailing headings over to the next
  // page, and correct the Contents entries that pointed at them.
  for (let p = 0; p < pages.length - 1; p++) {
    const carry: string[] = [];
    const paras = pages[p]!.paragraphs;
    while (paras.length && /^#{2,3} /.test(paras[paras.length - 1]!)) carry.unshift(paras.pop()!);
    if (!carry.length) continue;
    if (pages[p + 1]!.heading) {
      // The next page starts a chapter; give the carried headings a page of their own instead.
      pages.splice(p + 1, 0, { paragraphs: carry });
      for (const c of contents) if (c.page > p) c.page++;
    } else pages[p + 1]!.paragraphs.unshift(...carry);
    for (const c of contents) if (c.level === 2 && c.page === p && carry.includes(`## ${c.title}`)) c.page = p + 1;
  }
  return { pages: pages.filter((p) => p.heading || p.paragraphs.length), contents };
}

export const parseDocument = (text: string) => paginateBlocks(blocksOf(text));

/** The Contents of a book stored as pages: chapters from page headings, sections from '## ' paragraphs. */
export function contentsOf(pages: BookPage[]): ContentsEntry[] {
  const out: ContentsEntry[] = [];
  pages.forEach((p, i) => {
    if (p.heading) out.push({ title: p.heading, level: 1, page: i });
    for (const para of p.paragraphs) if (para.startsWith('## ')) out.push({ title: para.slice(3).trim(), level: 2, page: i });
  });
  return out;
}

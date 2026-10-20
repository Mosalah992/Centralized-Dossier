import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { Book } from '../shared/books';
import { blocksOf, paginateBlocks } from '../shared/document';
import { BUNDLED_BOOKS } from '../web/src/books/registry';

const read = (path: string) => readFileSync(path, 'utf8');
const wgc = JSON.parse(read('web/src/books/white-gold-concordat.json')) as Book;

describe('the White-Gold Concordat on the shelf', () => {
  it('is the output of its source, so the JSON is reproducible', () => {
    const source = read('content/books/sources/white-gold-concordat.md').replace(/\r\n/g, '\n');
    const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
    const { pages, contents } = paginateBlocks(blocksOf(body));
    expect(wgc.pages).toEqual(pages);
    expect(wgc.contents).toEqual(contents);
  });

  it('points every Contents entry at a page that exists', () => {
    for (const entry of wgc.contents ?? []) {
      expect(entry.page).toBeGreaterThanOrEqual(0);
      expect(entry.page).toBeLessThan(wgc.pages.length);
    }
  });

  it('is described on the spine as it is bound', () => {
    const summary = BUNDLED_BOOKS.find((b) => b.summary.slug === wgc.slug)!.summary;
    expect(summary.title).toBe(wgc.title);
    expect(summary.pageCount).toBe(wgc.pages.length);
    expect(summary.spine).toEqual(wgc.spine);
  });
});

describe('typesetting', () => {
  it('starts every chapter on a page of its own and never ends a page on a heading', () => {
    const { pages } = paginateBlocks(blocksOf('# One\n\nAlpha.\n\n## Section\n\nBeta.\n\n# Two\n\nGamma.'));
    expect(pages.map((p) => p.heading)).toEqual(['One', 'Two']);
    for (const page of pages) {
      const last = page.paragraphs[page.paragraphs.length - 1];
      expect(last && /^#{2,3} /.test(last)).toBeFalsy();
    }
  });
});

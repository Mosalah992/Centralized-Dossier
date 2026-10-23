import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { bindBlocks, type BookBlock } from '../web/src/books/bind';
import { PAGE_BUDGET, pageWindow } from '../web/src/books/leaves';
import { blocksOfBook } from '../web/src/room/takeovers/ShelfBook';
import type { Book } from '../shared/books';

const read = (path: string) => readFileSync(path, 'utf8');

/**
 * Every volume on the bookshelf is bound as the Chronicles are (2026-10-23):
 * leaves packed to a character budget, a chapter always starting a leaf, and
 * every passage findable by the scrying.
 */

describe('binding', () => {
  const para = (n: number): BookBlock => ({ kind: 'para', text: `${'x'.repeat(n)}` });

  it('starts every chapter on a fresh leaf, and names the running head after it', () => {
    const leaves = bindBlocks(
      [{ kind: 'chapter', text: 'One' }, para(100), { kind: 'chapter', text: 'Two' }, para(100)],
      '', false,
    );
    expect(leaves.map((l) => l.head)).toEqual(['One', 'Two']);
  });

  it("packs to the budget, and gives an over-long block a leaf of its own", () => {
    const leaves = bindBlocks([para(900), para(900), para(PAGE_BUDGET * 2), para(10)], '', false);
    expect(leaves).toHaveLength(4);
  });

  it('never leaves a heading at the foot of a leaf', () => {
    const leaves = bindBlocks([para(1300), { kind: 'heading', text: 'Midyear' }, para(600)], '', false);
    // The heading would fit on the first leaf, and its entry would not: both go on.
    expect(leaves).toHaveLength(2);
    expect(leaves[1]!.items?.[0]?.text).toBe('x'.repeat(600));
  });

  it('says what each leaf holds, for the scrying', () => {
    const [leaf] = bindBlocks(
      [{ kind: 'chapter', text: 'The Register' }, { kind: 'entry', label: 'Second Seed 10', text: 'The Embassy is attacked.' }, { kind: 'field', label: 'As defenders', text: 'At Solitude.' }],
      '', false,
    );
    expect(leaf!.items).toEqual([
      { label: 'Second Seed 10', text: 'The Embassy is attacked.' },
      { label: 'As defenders', text: 'At Solitude.' },
    ]);
  });

  it('prints every page number for a short book, and windows a long one', () => {
    expect(pageWindow(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(pageWindow(10, 30)).toEqual([0, 'gap', 9, 10, 11, 'gap', 29]);
  });
});

describe('a book from the shelf', () => {
  it('reads its pages as chapters, headings, asides and paragraphs', () => {
    const book: Book = {
      slug: 'b', title: 'B', spine: { leather: '#000', label: 'B' },
      pages: [{ heading: 'Article I', paragraphs: ['## Section', 'Text.', '*A note.*'] }],
    };
    expect(blocksOfBook(book)).toEqual([
      { kind: 'chapter', text: 'Article I' },
      { kind: 'heading', text: 'Section' },
      { kind: 'para', text: 'Text.' },
      { kind: 'para', aside: true, text: 'A note.' },
    ]);
  });

  it('binds the Concordat into more than a few leaves', async () => {
    const wgc = (await import('../web/src/books/white-gold-concordat.json')).default as Book;
    expect(bindBlocks(blocksOfBook(wgc), '', false).length).toBeGreaterThan(10);
  });
});

describe('every volume is a bound book, and none is sealed', () => {
  it('binds the Chronicles, the History, the Arrests, the Code and the shelf books through one reader', () => {
    for (const path of ['web/src/views/Informants.tsx', 'web/src/views/History.tsx', 'web/src/views/Enforcement.tsx', 'web/src/views/PenalCode.tsx', 'web/src/room/takeovers/ShelfBook.tsx']) {
      expect(read(path), path).toContain('<BoundBook');
    }
  });

  it('serves the Chronicles to anyone, Latest Filings included', () => {
    // Read as source: the route is typed against Cloudflare's Pages types,
    // which this browser-test project does not carry.
    const route = read('functions/api/chronicle/index.ts');
    expect(route).not.toMatch(/readWrit|readCookie|CHRONICLE_COOKIE_NAME|403/);
    expect(route).toContain("'Cache-Control': 'public, max-age=60'");
    expect(route).toContain('filings,');
    // The message id stays on the server's side of the wire.
    expect(route).toContain('stored.map(({ agent, filedAt, inWorld, text }) => ({ agent, filedAt, inWorld, text }))');
    expect(existsSync('functions/api/chronicle/gate.ts')).toBe(false);
    expect(read('web/src/api.ts')).toContain("useAsync<Chronicle>('/api/chronicle')");
  });
});

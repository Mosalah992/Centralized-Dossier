#!/usr/bin/env node
// Turn a book's source text (content/books/sources/*.md) into the paged JSON
// the room's bookshelf bundles (web/src/books/{slug}.json). Run after editing a
// source:
//   node scripts/emit-books.mjs
//
// Ported from the Bruma Joint Archives' scripts/build-books.mjs so a treaty set
// there and here paginates identically. Source format:
//   frontmatter: slug, title, subtitle, spine, leather, height
//   # Heading      a chapter: always starts a new page, listed in Contents
//   ## Heading     a section: listed in Contents, never left alone at a page foot
//   ### Heading    an article or offence heading inside a section
//   blank-line-separated paragraphs; *wrapped in asterisks* = italic note
//
// The JSON is committed, like history-data.ts: a reproducible script plus its
// output, so the build never needs this step to have run.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

import { blocksOf, paginateBlocks } from '../shared/document.ts';

const DIR = 'content/books/sources';
const OUT = 'web/src/books';
const words = (s) => s.split(/\s+/).filter(Boolean).length;

function parse(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) throw new Error('missing frontmatter');
  const meta = Object.fromEntries(
    m[1].split('\n').map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')];
    }),
  );
  const blocks = blocksOf(text.replace(/\r\n/g, '\n').slice(m[0].length));
  return { meta, blocks };
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const { meta, blocks } = parse(readFileSync(`${DIR}/${file}`, 'utf8'));
  const { pages, contents } = paginateBlocks(blocks);
  const book = {
    slug: meta.slug,
    title: meta.title,
    ...(meta.subtitle ? { subtitle: meta.subtitle } : {}),
    spine: { leather: meta.leather ?? '#2b2216', label: meta.spine, height: Number(meta.height ?? 0.9) },
    contents,
    pages,
  };
  writeFileSync(`${OUT}/${meta.slug}.json`, JSON.stringify(book, null, 2) + '\n');
  console.log(`${meta.slug}: ${pages.length} pages, ${contents.filter((c) => c.level === 1).length} chapters, ${blocks.reduce((n, b) => n + words(b), 0)} words`);
}

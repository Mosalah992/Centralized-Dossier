// Re-emit web/src/views/history-data.ts from content/history.json.
//
//   node scripts/emit-history.mjs
//
// UNLIKE THE OTHER TWO VOLUMES, this one is bundled into the browser rather
// than served from behind the gate — History of the Realm is transcribed from
// newspapers the whole province could buy, so there is nothing in it the gate
// exists to withhold. That is why the emitted file sits under web/src/ and is
// committed to git, where chronicle.ts and enforcement.ts are not.
//
// ONLY THE RECORDS ARE DATA. The view keeps its prose — the preamble, the Road
// to War, the reckoning of the Dominion in the public eye — because that is
// JSX carrying real markup, and a JSON file cannot hold an <em> without
// inventing a markup language to put it back. The dated entries, the
// transcribed Notice of Recall and the four papers are genuinely records, and
// those are what the editor owns.
//
// The template in scripts/templates/ holds every comment and declaration; this
// script only ever fills the five array bodies. A comment in that file is
// therefore safe to edit by hand, and will survive the next regeneration.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'content', 'history.json');
const OUT = path.join(ROOT, 'web', 'src', 'views', 'history-data.ts');
const TEMPLATE = path.join(ROOT, 'scripts', 'templates', 'history.ts.txt');

/** A TypeScript single-quoted literal. */
function ts(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n')}'`;
}

/** One `{ date, weight?, text }` record, in the field order the file uses. */
function entry(e) {
  const lines = ['  {', `    date: ${ts(e.date)},`];
  if (e.weight) lines.push(`    weight: ${ts(e.weight)},`);
  lines.push(`    text: ${ts(e.text)},`, '  },');
  return lines.join('\n');
}

function paper(p) {
  return [
    '  {',
    `    name: ${ts(p.name)},`,
    `    span: ${ts(p.span)},`,
    `    staff: ${ts(p.staff)},`,
    `    note: ${ts(p.note)},`,
    '  },',
  ].join('\n');
}

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

const bodies = {
  SECOND_SEED: data.secondSeed.map(entry).join('\n'),
  MIDYEAR: data.midyear.map(entry).join('\n'),
  RECALL: data.recall.map(entry).join('\n'),
  RECALL_NOTICE: data.recallNotice.map((line) => `  ${ts(line)},`).join('\n'),
  PAPERS: data.papers.map(paper).join('\n'),
};

let text = fs.readFileSync(TEMPLATE, 'utf8');
for (const [name, body] of Object.entries(bodies)) {
  const marker = `//{{${name}}}`;
  if (!text.includes(marker)) {
    console.error(`Template is missing ${marker} — refusing to write a partial volume.`);
    process.exit(1);
  }
  text = text.replace(marker, body);
}

/*
 * REFUSE TO WRITE A VOLUME THAT HAS COLLAPSED — the same guard the other two
 * emitters carry. This one is committed to git, so a bad write is recoverable
 * where the sealed volumes' would not be; the check is here anyway, because
 * "recoverable from git" is not a thing anyone remembers at the moment they
 * need it.
 */
const total = data.secondSeed.length + data.midyear.length + data.recall.length;
const previous = fs.existsSync(OUT)
  ? (fs.readFileSync(OUT, 'utf8').match(/^\s{4}date: /gm) || []).length
  : 0;

if (previous && total < previous * 0.7 && !process.argv.includes('--force')) {
  console.error(`REFUSING TO WRITE — entries fell from ${previous} to ${total}.`);
  console.error('If that is intended, pass --force.');
  process.exit(1);
}

fs.writeFileSync(OUT, text);
console.log(
  `wrote web/src/views/history-data.ts — ${data.secondSeed.length} + ${data.midyear.length} `
  + `+ ${data.recall.length} entries, ${data.recallNotice.length} notice lines, `
  + `${data.papers.length} papers`,
);

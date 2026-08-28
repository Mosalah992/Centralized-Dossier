// Re-emit functions/lib/chronicle.ts from content/chronicle.json.
//
//   node scripts/emit-chronicle.mjs
//
// THE JSON IS THE VOLUME NOW. This file used to be written by hand, which meant
// editing it required a developer and a text editor that would not mangle a
// 500-line TypeScript module. The prose moved to data so the Archives Editor
// can own it; this script puts it back into the shape the Worker imports.
//
// WHAT LIVES HERE RATHER THAN IN THE JSON: every comment. The header below
// explains why this volume is served from functions/ instead of bundled into
// the browser, and that reasoning is not recoverable from the code — it belongs
// with the module, not with the data. The data file holds entries and nothing
// else, so an editor never has to round-trip a comment it does not understand.
//
// BOTH FILES ARE GITIGNORED. The repository is public and this is the volume
// the gate exists to hold back; moving it to JSON does not change that. See the
// held-back table in CLAUDE.md, and back both up with
// scripts/backup-held-back.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'content', 'chronicle.json');
const OUT = path.join(ROOT, 'functions', 'lib', 'chronicle.ts');

/**
 * A TypeScript single-quoted string literal.
 *
 * Backslashes first, then quotes, or the escaping escapes its own escapes.
 * Newlines are written as \n rather than as real line breaks: an entry that
 * carried one would otherwise open a string literal that never closes.
 */
function ts(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n')}'`;
}

const HEAD = `// Thalmor Chronicles — the text of the volume, held on the Worker's side
// of the gate.
//
// GENERATED from content/chronicle.json by scripts/emit-chronicle.mjs.
// Edit the JSON — or use the Archives Editor — not this file.
//
// WHY THIS LIVES IN functions/ AND NOT IN THE VIEW: History of the Realm keeps
// its text in web/src/views/History.tsx, which is the right home for it — that
// chronicle is transcribed from newspapers the whole province could buy, and a
// volume held in the app cannot be withdrawn by a tab being renamed.
//
// This one is different in kind. It is assembled from the Embassy's own
// informant reports: who was interrogated, who was executed, which courts were
// judged loyal, which of our own agents broke. Static assets are served from
// public URLs — only /api/* passes through api/_middleware.ts — so prose
// compiled into the browser bundle is prose anyone with the link can read
// without ever answering the gate. Putting this in a view would have published
// it.
//
// So the text is served from /api/chronicle instead, and the reader's copy
// arrives only after the middleware has checked the writ. The cost is that this
// volume, alone among the ones the Embassy writes itself, needs the Worker to
// be up to be read at all. That is the trade the gate is worth.

export interface ChronicleEntry {
  /** In-world date, as the reports themselves reckon it. */
  date: string;
  text: string;
  /** Set for the handful of days the rest of the chronicle turns on. */
  weight?: 'grave';
}

export interface ChronicleMonth {
  name: string;
  /** One line placing the month before its entries. */
  standfirst: string;
  entries: ChronicleEntry[];
}
`;

/** Stable, filename-safe constant names for the month arrays. */
function constName(name, i) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ‘’']/g, '')
    .toUpperCase()
    // "&" is a word in a month name — "Rain's Hand & Second Seed" was
    // RAINS_HAND_AND_SECOND_SEED by hand, and dropping it silently renames a
    // constant for no reason a reader of the diff could explain.
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `MONTH_${i + 1}`;
}

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

const out = [HEAD];

// One array per month, in the order the volume runs.
const names = data.months.map((m, i) => constName(m.name, i));
data.months.forEach((month, i) => {
  out.push(`\nconst ${names[i]}: ChronicleEntry[] = [`);
  for (const e of month.entries) {
    out.push('  {');
    out.push(`    date: ${ts(e.date)},`);
    if (e.weight) out.push(`    weight: ${ts(e.weight)},`);
    out.push(`    text: ${ts(e.text)},`);
    out.push('  },');
  }
  out.push('];');
});

out.push('\nexport const MONTHS: ChronicleMonth[] = [');
data.months.forEach((month, i) => {
  out.push('  {');
  out.push(`    name: ${ts(month.name)},`);
  out.push(`    standfirst: ${ts(month.standfirst)},`);
  out.push(`    entries: ${names[i]},`);
  out.push('  },');
});
out.push('];');

out.push('\n/** The standing powers, as the reports themselves describe them. */');
out.push('export const POWERS: { name: string; note: string }[] = [');
for (const p of data.powers) {
  out.push('  {');
  out.push(`    name: ${ts(p.name)},`);
  out.push(`    note: ${ts(p.note)},`);
  out.push('  },');
}
out.push('];');

out.push(`
/*
 * WHAT THE RECORD DOES NOT SAY — withdrawn.
 *
 * The section held five open threads. The first of them, the Warden of the
 * Pale, is no longer open: he is dead, and the notice of his funeral is below.
 * The rest were withdrawn with it at the Embassy's instruction.
 *
 * The export stays and stays empty rather than being deleted, because
 * /api/chronicle serves it and the browser's Chronicle type expects it. An
 * empty list renders no heading and no leaf, which is the intended result — see
 * buildLeaves, where the section is skipped when there is nothing in it.
 */`);
// An empty list is written [] rather than an empty pair of brackets on two
// lines — the withdrawn section is meant to look deliberate, not truncated.
if (data.unresolved.length === 0) {
  out.push('export const UNRESOLVED: { name: string; note: string }[] = [];');
} else {
  out.push('export const UNRESOLVED: { name: string; note: string }[] = [');
  for (const u of data.unresolved) {
    out.push('  {');
    out.push(`    name: ${ts(u.name)},`);
    out.push(`    note: ${ts(u.note)},`);
    out.push('  },');
  }
  out.push('];');
}

out.push(`
/**
 * The funeral notice, and the silence in front of it.
 *
 * THE ARCHIVE HAS NO REPORT OF HOW HE DIED. Every power in Skyrim searched for
 * Ghorzug for a month and fifty caves were struck off a list; the reports
 * follow the search in detail and then simply stop. What closes the thread is
 * not a filing but a notice posted for the province — which is why it is set
 * here as a document rather than written up as an entry. It is the only thing
 * the Embassy holds on the matter, and it was not written by the Embassy.
 */`);
out.push('export const FUNERAL: { lead: string; notice: string[]; close: string } = {');
out.push(`  lead: ${ts(data.funeral.lead)},`);
out.push('  notice: [');
for (const line of data.funeral.notice) out.push(`    ${ts(line)},`);
out.push('  ],');
out.push(`  close: ${ts(data.funeral.close)},`);
out.push('};');

const text = out.join('\n') + '\n';

/*
 * REFUSE TO WRITE A VOLUME THAT HAS COLLAPSED.
 *
 * The failure mode of an editor is not a typo, it is an accidental deletion —
 * a cleared field, a bad save, a JSON file truncated by a crash. Losing a third
 * of the entries is not something to discover on the live site, and this file
 * is the ONLY copy the Worker will serve.
 */
const entryCount = data.months.reduce((n, m) => n + m.entries.length, 0);
const previous = fs.existsSync(OUT) ? (fs.readFileSync(OUT, 'utf8').match(/^\s{4}date: /gm) || []).length : 0;

if (previous && entryCount < previous * 0.7 && !process.argv.includes('--force')) {
  console.error(
    `REFUSING TO WRITE — entries fell from ${previous} to ${entryCount}.\n`
    + 'If that is intended, pass --force.',
  );
  process.exit(1);
}

fs.writeFileSync(OUT, text);
console.log(
  `wrote functions/lib/chronicle.ts — ${data.months.length} months, ${entryCount} entries, `
  + `${data.powers.length} powers, ${data.unresolved.length} unresolved`,
);

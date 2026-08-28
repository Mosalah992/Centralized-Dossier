// Re-emit functions/lib/enforcement.ts from content/enforcement.jsonl.
//
//   node scripts/emit-enforcement.mjs
//
// PORTED FROM tmp/enforce/emit.py, which did this job while the ledger was
// being read. The pipeline is JavaScript now so the Archives Editor can drive
// every volume through one toolchain rather than shelling out to Python for
// one of them. The port was PROVED rather than assumed: both emitters were run
// against the same 149 records and their output compared byte for byte.
//
// THE HEADER LIVES IN scripts/templates/, not in this file. It is 3.8 kB of
// prose explaining why the ledger is served rather than bundled, what `kind`
// means and why contradictions are kept — reasoning that belongs with the
// module it heads. Holding it as a template also means it never has to survive
// being escaped into a JavaScript string, which is exactly how a long comment
// acquires stray backslashes.
//
// THE JSONL IS THE WORKING COPY and this is what ships. Sorting happens here
// rather than in the Worker so the module reads as a register — in the order
// the acts were committed — and so a diff of the volume shows what changed
// rather than a reshuffle.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'content', 'enforcement.jsonl');
const OUT = path.join(ROOT, 'functions', 'lib', 'enforcement.ts');
const HEAD_FILE = path.join(ROOT, 'scripts', 'templates', 'enforcement-head.ts.txt');

const MONTHS = [
  'Morning Star', "Sun's Dawn", 'First Seed', "Rain's Hand", 'Second Seed',
  'Mid Year', "Sun's Height", 'Last Seed', 'Hearthfire', 'Frostfall',
  "Sun's Dusk", 'Evening Star',
];

/**
 * Sort by the in-world date.
 *
 * An unparseable date sorts to the END rather than the start, so a malformed
 * entry is visible at the foot of the register instead of masquerading as the
 * earliest act on record.
 */
function key(rec) {
  const m = /^(.+?)\s+(\d+)$/.exec(rec.date);
  if (!m) return [99, 99];
  const idx = MONTHS.indexOf(m[1].trim());
  return [idx >= 0 ? idx : 98, Number(m[2])];
}

/** A TypeScript double-quoted literal, matching the Python emitter exactly. */
function ts(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const FIELDS = ['date', 'agent', 'hand', 'act', 'subject', 'title', 'method', 'outcome', 'kind'];

const records = fs.readFileSync(IN, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

// Array.prototype.sort is stable, as Python's is: two acts on one day keep the
// order they were read in, which is the order the reports were filed.
records.sort((a, b) => {
  const ka = key(a);
  const kb = key(b);
  return ka[0] - kb[0] || ka[1] - kb[1];
});

// A record filed twice under two agents' pens is one act, not two.
const seen = new Set();
const unique = [];
for (const r of records) {
  const sig = `${r.date}|${r.subject}|${r.kind}`;
  if (seen.has(sig)) {
    console.log('DROPPED DUPLICATE:', sig);
    continue;
  }
  seen.add(sig);
  unique.push(r);
}

const out = [fs.readFileSync(HEAD_FILE, 'utf8')];
for (const r of unique) {
  out.push('  {\n');
  for (const f of FIELDS) out.push(`    ${f}: ${ts(r[f] ?? '')},\n`);
  out.push('  },\n');
}
out.push('];\n');

/*
 * REFUSE TO WRITE A LEDGER THAT HAS COLLAPSED — the same guard the chronicle
 * emitter carries, and for the same reason: the failure mode of a manual editor
 * is an accidental deletion, not a typo, and this file is the only copy the
 * Worker serves.
 */
const previous = fs.existsSync(OUT)
  ? (fs.readFileSync(OUT, 'utf8').match(/^\s{4}date: /gm) || []).length
  : 0;

if (previous && unique.length < previous * 0.7 && !process.argv.includes('--force')) {
  console.error(`REFUSING TO WRITE — records fell from ${previous} to ${unique.length}.`);
  console.error('If that is intended, pass --force.');
  process.exit(1);
}

fs.writeFileSync(OUT, out.join(''));

const counts = {};
for (const r of unique) counts[r.kind] = (counts[r.kind] || 0) + 1;
console.log(`wrote functions/lib/enforcement.ts with ${unique.length} entries`);
console.log('  ', Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1])));
console.log('   agents named:', new Set(unique.map((r) => r.agent)).size);

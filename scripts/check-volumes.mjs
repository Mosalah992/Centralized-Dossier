// Are the volumes intact right now?
//
//   node scripts/check-volumes.mjs
//   npm run volumes:check
//
// WHY THIS EXISTS SEPARATELY FROM THE TEST SUITE. test/volumes-pipeline.test.ts
// already fails when a module and its JSON disagree, and that is what caught
// the Chronicles losing eight characters. But it is one file inside a suite
// that takes half a minute and is usually run for other reasons — so the
// question "is the archive intact?" had no cheap answer, and the gap between
// the corruption happening and anyone noticing was days.
//
// This answers it in about a second, and answers a question the suite cannot:
// whether what is on disk still matches the last backup. The suite compares the
// volumes against themselves. Only the backup can say whether they have drifted
// from a state somebody verified.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** Each volume, its generated module, and how to count entries in both. */
const VOLUMES = [
  {
    name: 'Thalmor Chronicles',
    data: 'content/chronicle.json',
    module: 'functions/lib/chronicle.ts',
    count: (j) => j.months.reduce((n, m) => n + m.entries.length, 0),
    strings: (j) => [
      ...j.months.flatMap((m) => [m.standfirst, ...m.entries.map((e) => e.text)]),
      ...j.powers.map((p) => p.note),
    ],
  },
  {
    name: 'Ledger of Enforcement',
    data: 'content/enforcement.jsonl',
    module: 'functions/lib/enforcement.ts',
    jsonl: true,
    count: (rows) => rows.length,
    strings: (rows) => rows.flatMap((r) => [r.act, r.method, r.outcome]),
  },
  {
    name: 'History of the Realm',
    data: 'content/history.json',
    module: 'web/src/views/history-data.ts',
    count: (j) => j.secondSeed.length + j.midyear.length + j.recall.length,
    strings: (j) => [...j.secondSeed, ...j.midyear, ...j.recall].map((e) => e.text),
  },
];

/** The newest dated folder under the backup root, if there is one. */
function latestBackup() {
  const base = process.env.BACKUP_DIR
    ?? path.join(os.homedir(), 'Documents', 'thalmor-archive-backup');
  if (!fs.existsSync(base)) return null;
  const dated = fs.readdirSync(base).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  return dated.length ? path.join(base, dated[dated.length - 1]) : null;
}

const backup = latestBackup();
let problems = 0;

console.log(`Checked ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
if (backup) console.log(`Against backup ${path.basename(backup)}\n`);
else console.log('No backup found — run scripts/backup-held-back.mjs\n');

for (const v of VOLUMES) {
  const file = path.join(ROOT, v.data);
  if (!fs.existsSync(file)) {
    console.log(`  MISSING  ${v.name} — ${v.data}`);
    problems++;
    continue;
  }

  const raw = fs.readFileSync(file, 'utf8');
  const parsed = v.jsonl
    ? raw.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l))
    : JSON.parse(raw);

  const notes = [];

  // Does the served module still carry this data? A stale module means somebody
  // edited the JSON and never published, which is a warning rather than damage.
  const mod = path.join(ROOT, v.module);
  if (fs.existsSync(mod)) {
    const source = fs.readFileSync(mod, 'utf8');
    const entries = (source.match(/^\s{4}date: /gm) || []).length;
    if (entries && Math.abs(entries - v.count(parsed)) > 0) {
      notes.push(`module holds ${entries} entries, data holds ${v.count(parsed)} — run volumes:emit`);
    }
  }

  // Text the volumes render as itself rather than as formatting.
  const stray = v.strings(parsed).filter((t) => typeof t === 'string' && /[[\]*]|```/.test(t));
  if (stray.length) notes.push(`${stray.length} string(s) carry brackets or asterisks`);

  // And the question only a backup can answer.
  let against = '';
  if (backup) {
    const copy = path.join(backup, v.data);
    if (!fs.existsSync(copy)) {
      against = 'not in backup';
    } else {
      const same = sha(fs.readFileSync(copy)) === sha(fs.readFileSync(file));
      const backupBytes = fs.statSync(copy).size;
      const nowBytes = fs.statSync(file).size;
      against = same
        ? 'matches backup'
        : `DIFFERS from backup (${backupBytes} -> ${nowBytes} bytes)`;
    }
  }

  const bad = notes.length > 0;
  if (bad) problems++;
  console.log(
    `  ${bad ? 'CHECK' : 'ok   '}  ${v.name.padEnd(23)}`
    + `${String(v.count(parsed)).padStart(4)} entries  ${String(fs.statSync(file).size).padStart(7)}B  ${against}`,
  );
  for (const n of notes) console.log(`         ${n}`);
}

console.log('');
if (problems) {
  console.log(`${problems} volume(s) want attention.`);
  process.exitCode = 1;
} else {
  console.log('All three volumes intact.');
}

/*
 * A DIFFERENCE FROM THE BACKUP IS NOT AN ERROR, and this deliberately does not
 * treat it as one. Editing a volume is the whole point of the editor; of course
 * it will differ from a copy taken yesterday. It is printed because it is the
 * one line that would have shown the Chronicles quietly losing eight characters
 * on the day it happened rather than days later.
 */

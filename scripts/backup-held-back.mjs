// Copy the files git is not allowed to hold to somewhere outside the repo.
//
//   node scripts/backup-held-back.mjs
//   BACKUP_DIR=D:/backups/thalmor node scripts/backup-held-back.mjs
//
// WHY THIS EXISTS. Four files are gitignored because the GitHub repository is
// public and they are the substance of the volumes the gate exists to hold
// back. A fifth pair — tmp/enforce/records.jsonl and emit.py — is the working
// copy the Ledger of Enforcement is generated from, and tmp/ is ignored too.
// None of it is in git history, so a clone plus a `git log -S` will not find
// it: the deployed Worker holds the built modules and the local disk holds
// everything else, and that is the whole of the redundancy.
//
// THE CHRONICLE IS THE ONE THAT CANNOT BE REBUILT. It was written, not derived.
// informant-reports.md regenerates from a fresh Discord export; the enforcement
// module regenerates from records.jsonl; records.jsonl itself came from reading
// 195 reports one at a time and deciding, per report, whether an act had
// occurred — reproducible only by doing that reading again.
//
// AN EXPLICIT LIST, NEVER A GLOB. Everything copied is named below. A glob over
// the repo that happened to match .env, .dev.vars or credentials/ would write
// live secrets into a plain directory outside the project, which is a worse
// outcome than the data loss this is meant to prevent.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Named one by one, on purpose — see the note above. */
const FILES = [
  // THE SOURCE OF TRUTH MOVED. chronicle.ts used to be the irreplaceable file;
  // it is now generated from content/chronicle.json, and that JSON is what
  // cannot be rebuilt. Backing up only the generated module would have left the
  // safety net pointed at a build artefact.
  ['content/chronicle.json', 'The Thalmor Chronicles. WRITTEN, NOT DERIVED — nothing rebuilds this.'],
  ['content/enforcement.jsonl', 'The Ledger, one judgement call per record. Emitted to enforcement.ts.'],
  ['content/history.json', 'History of the Realm. Also in git, but kept here so a restore is one folder.'],
  ['functions/lib/chronicle.ts', 'Generated. Kept so a restore can skip the emitters if it needs to.'],
  ['functions/lib/enforcement.ts', 'Generated from content/enforcement.jsonl.'],
  ['docs/informant-reports.md', 'Every report, redacted. Regenerates from a fresh export.'],
  ['docs/informant-events-ledger.md', 'The reading pass over the reports. No script rebuilds this.'],
  ['tmp/enforce/emit.py', 'The original Python emitter. Superseded by scripts/emit-enforcement.mjs, kept as the record of how the ledger was built.'],
  ['tmp/enforce/candidates.md', 'The reports that were read. audit-enforcement-sieve.py needs this.'],
];

const stamp = new Date().toISOString().slice(0, 10);
const base = process.env.BACKUP_DIR
  ?? path.join(os.homedir(), 'Documents', 'thalmor-archive-backup');
const dest = path.join(base, stamp);

// Refuse to write inside the repo: a backup the repo can lose with it is not a
// backup, and one inside a gitignored folder is exactly the thing being guarded
// against.
if (path.resolve(dest).startsWith(path.resolve(ROOT) + path.sep)) {
  console.error(`Refusing to back up inside the repo: ${dest}`);
  console.error('Set BACKUP_DIR to a path outside the project.');
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const manifest = [
  'Thalmor Embassy Archives — files held back from git',
  `Taken ${new Date().toISOString()}`,
  '',
  'These are gitignored because the GitHub repository is public. They are not in',
  'git history and cannot be recovered from it. Restore by copying back to the',
  'same relative paths inside the repo.',
  '',
];

let copied = 0;
let missing = 0;

for (const [rel, note] of FILES) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) {
    console.warn(`  missing, skipped: ${rel}`);
    manifest.push(`MISSING  ${rel}`);
    missing++;
    continue;
  }

  const buf = fs.readFileSync(from);
  const to = path.join(dest, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, buf);

  // Read back rather than trusting the write: a truncated copy of the one file
  // nothing can rebuild is worse than a loud failure.
  const back = fs.readFileSync(to);
  if (sha(back) !== sha(buf)) {
    console.error(`  VERIFY FAILED: ${rel}`);
    process.exit(1);
  }

  manifest.push(`${sha(buf)}  ${String(buf.length).padStart(8)}  ${rel}`);
  manifest.push(`${' '.repeat(74)}${note}`);
  console.log(`  ${rel.padEnd(42)} ${String(buf.length).padStart(8)} bytes`);
  copied++;
}

manifest.push('');
manifest.push('NOT INCLUDED, deliberately: .env, .dev.vars, credentials/. Production');
manifest.push('secrets cannot be read back out of Cloudflare — only replaced.');
fs.writeFileSync(path.join(dest, 'MANIFEST.txt'), manifest.join('\n') + '\n');

console.log(`\n${copied} file(s) -> ${dest}${missing ? `  (${missing} missing)` : ''}`);
if (missing) process.exitCode = 1;

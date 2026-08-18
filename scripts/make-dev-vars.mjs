// Writes the service-account key into .dev.vars (git-ignored), so
// `wrangler pages dev` has the same secret the deployed site gets.
//
// wrangler reads .dev.vars values verbatim — it does not unescape them — so the
// key is minified to a single physical line. The newlines inside private_key
// survive as the two-character \n escapes that JSON.parse expects, and the
// whole value stays on one line as the file format requires.
//
// IT MERGES, AND THAT IS THE WHOLE POINT OF THIS FILE'S SECOND DRAFT. It used
// to write .dev.vars from scratch with a single line, which silently deleted
// every other value in it — GATE_SECRET, GATE_PASSPHRASE, GATE_EPOCH,
// CHRONICLE_PASSPHRASE and the Discord ids. Two of those are passphrases that
// CANNOT BE READ BACK OUT OF CLOUDFLARE: losing them locally means guessing, or
// replacing the live ones and locking out everyone holding the old word. The
// script is listed in the README as a routine step, so the only thing that had
// ever protected them was nobody running it.
//
// Everything not owned by this script is passed through untouched: other keys,
// comments, blank lines, and the order they were written in.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Set one KEY=value in a .dev.vars body, leaving every other line exactly as it
 * was. Exported and pure so the dangerous part is testable without a filesystem
 * — see test/dev-vars.test.ts.
 *
 * Replaces the key in place if it is already there, so the file keeps its
 * order and a re-run is a no-op rather than a reshuffle. Appends otherwise.
 */
export function setDevVar(existing, key, value) {
  const line = `${key}=${value}`;
  const lines = existing ? existing.split(/\r?\n/) : [];

  // A value can contain '=' — the JSON key is full of them — so the match is
  // anchored to the start and stops at the first '='.
  const at = lines.findIndex((l) => l.slice(0, l.indexOf('=')) === key && l.includes('='));

  if (at >= 0) lines[at] = line;
  else {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push(line);
  }

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/** Key names only. Values are secrets and never belong on a terminal. */
export const keysIn = (body) => (body ? body.split(/\r?\n/) : [])
  .map((l) => l.slice(0, l.indexOf('=')))
  .filter((k) => /^[A-Z_][A-Z0-9_]*$/.test(k));

// The module is imported by its test, so the work only runs when invoked.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
    || process.argv[1]?.endsWith('make-dev-vars.mjs')) {
  const envPath = path.join(ROOT, '.env');
  const env = Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );

  const keyPath = path.resolve(ROOT, env.GOOGLE_APPLICATION_CREDENTIALS || '');
  if (!fs.existsSync(keyPath)) {
    console.error(`Service-account key not found at ${keyPath}`);
    process.exit(1);
  }

  // Round-trip through JSON.parse so a malformed key fails here, not at runtime.
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8').replace(/^﻿/, ''));

  const target = path.join(ROOT, '.dev.vars');
  const before = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const after = setDevVar(before, 'GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify(key));

  fs.writeFileSync(target, after);

  const kept = keysIn(after).filter((k) => k !== 'GOOGLE_SERVICE_ACCOUNT_JSON');
  console.log(`.dev.vars written for ${key.client_email}`);
  console.log(kept.length
    ? `kept ${kept.length} other value${kept.length === 1 ? '' : 's'}: ${kept.join(', ')}`
    : 'no other values were present');
}

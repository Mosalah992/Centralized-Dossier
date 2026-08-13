// Writes .dev.vars (git-ignored) from the service-account key named in .env, so
// `wrangler pages dev` has the same secret the deployed site gets.
//
// wrangler reads .dev.vars values verbatim — it does not unescape them — so the
// key is minified to a single physical line. The newlines inside private_key
// survive as the two-character \n escapes that JSON.parse expects, and the
// whole value stays on one line as the file format requires.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
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

fs.writeFileSync(
  path.join(ROOT, '.dev.vars'),
  `GOOGLE_SERVICE_ACCOUNT_JSON=${JSON.stringify(key)}\n`,
);

console.log(`.dev.vars written for ${key.client_email}`);

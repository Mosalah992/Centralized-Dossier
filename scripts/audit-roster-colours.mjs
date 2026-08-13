// Compares the roster pill colours in web/src/styles/ledger.css against the
// background colours the live sheet actually uses for Unit, Rank and Race.
// Read-only.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const b64url = (b) => Buffer.from(b).toString('base64url');
const sa = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8').replace(/^﻿/, ''));
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claims = b64url(JSON.stringify({
  iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  aud: sa.token_uri, iat: now, exp: now + 3600,
}));
const signer = crypto.createSign('RSA-SHA256');
signer.update(`${header}.${claims}`);
const jwt = `${header}.${claims}.${signer.sign(sa.private_key, 'base64url')}`;
const { access_token: token } = await (await fetch(sa.token_uri, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
})).json();

const range = encodeURIComponent("'Roster'!A4:F120");
const fields = 'sheets(data(rowData(values(formattedValue,effectiveFormat(backgroundColor,textFormat(foregroundColor))))))';
const res = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}?ranges=${range}&includeGridData=true&fields=${encodeURIComponent(fields)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const data = await res.json();
if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 300));

const hex = (c) => {
  if (!c) return null;
  const v = (n) => Math.round((n || 0) * 255).toString(16).padStart(2, '0');
  return `#${v(c.red)}${v(c.green)}${v(c.blue)}`;
};

const COLS = { 0: 'UNIT', 1: 'RANK', 3: 'RACE' };
const seen = { UNIT: new Map(), RANK: new Map(), RACE: new Map() };

for (const row of data.sheets[0].data[0].rowData || []) {
  const cells = row.values || [];
  for (const [idx, kind] of Object.entries(COLS)) {
    const cell = cells[Number(idx)];
    const value = (cell?.formattedValue || '').trim();
    if (!value) continue;
    const bg = hex(cell?.effectiveFormat?.backgroundColor) || 'none';
    const fg = hex(cell?.effectiveFormat?.textFormat?.foregroundColor) || 'none';
    const key = `${value}`;
    if (!seen[kind].has(key)) seen[kind].set(key, { bg, fg, n: 0 });
    seen[kind].get(key).n++;
  }
}

// What the stylesheet declares, so the two can be lined up.
const css = fs.readFileSync(path.join(ROOT, 'web/src/styles/ledger.css'), 'utf8');
const declared = new Set(
  [...css.matchAll(/\.roster-token--(unit|rank|race)-([a-z0-9-]+)/g)].map((m) => `${m[1]}:${m[2]}`),
);

const slug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const kind of ['UNIT', 'RANK', 'RACE']) {
  console.log(`\n=== ${kind} — ${seen[kind].size} distinct values in the sheet ===`);
  const rows = [...seen[kind].entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [value, { bg, fg, n }] of rows) {
    const has = declared.has(`${kind.toLowerCase()}:${slug(value)}`);
    console.log(`  ${has ? ' ' : '!'} ${value.padEnd(26)} bg ${bg.padEnd(8)} text ${fg.padEnd(8)} x${String(n).padStart(3)}  ${has ? '' : '<-- no pill rule'}`);
  }
}

console.log('\n=== pill rules declared in CSS with no matching sheet value ===');
const live = new Set();
for (const kind of ['UNIT', 'RANK', 'RACE']) {
  for (const v of seen[kind].keys()) live.add(`${kind.toLowerCase()}:${slug(v)}`);
}
const unused = [...declared].filter((d) => !live.has(d) && !d.endsWith('-blank'));
console.log(unused.length ? unused.map((u) => `  ${u}`).join('\n') : '  (none)');

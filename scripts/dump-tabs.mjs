// Phase 0 recon: dump every tab of the archive spreadsheet to tmp/tabs/ so the
// parsers in worker/src/parsers/ can be written against real data instead of
// guesses. Read-only — this script never writes to the sheet.
//
//   node scripts/dump-tabs.mjs
//
// Reads SHEET_ID and GOOGLE_APPLICATION_CREDENTIALS from .env (see .env.example).
// Output lands in tmp/, which is git-ignored: it contains real member data.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// import.meta.dirname needs Node 20.11+; this machine is on 18.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'tabs');

/** Minimal .env reader — avoids a dependency for a two-key file. */
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const eq = line.indexOf('=');
        return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
      }),
  );
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function getAccessToken(keyPath) {
  const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8').replace(/^﻿/, ''));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    // Read-only scope: this script cannot modify the sheet even by mistake.
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(sa.private_key, 'base64url')}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data).slice(0, 300)}`);
  return { token: data.access_token, clientEmail: sa.client_email };
}

async function api(token, sheetId, pathAndQuery) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${pathAndQuery}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets GET ${pathAndQuery.split('?')[0]} -> ${res.status}: ${data.error && data.error.message}`);
  return data;
}

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const sheetId = env.SHEET_ID;
  const keyPath = path.resolve(ROOT, env.GOOGLE_APPLICATION_CREDENTIALS || '');

  if (!sheetId) throw new Error('SHEET_ID is not set (copy .env.example to .env)');
  if (!fs.existsSync(keyPath)) throw new Error(`Service-account key not found at ${keyPath}`);

  const { token, clientEmail } = await getAccessToken(keyPath);
  console.log(`Authenticated as ${clientEmail}`);

  const meta = await api(token, sheetId, '?fields=properties.title,sheets.properties');
  const tabs = meta.sheets.map((s) => s.properties);
  console.log(`Spreadsheet "${meta.properties.title}" — ${tabs.length} tabs\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const index = [];
  for (const tab of tabs) {
    // Generous window: the widest tab (Calendar) is 33 columns.
    const range = `'${tab.title}'!A1:AZ250`;
    const q = (render) => `/values/${encodeURIComponent(range)}?valueRenderOption=${render}`;

    const [formatted, formulas] = await Promise.all([
      api(token, sheetId, q('FORMATTED_VALUE')),
      api(token, sheetId, q('FORMULA')),
    ]);

    const rows = formatted.values || [];
    const dump = {
      fetchedAtUtc: new Date().toISOString(),
      spreadsheetId: sheetId,
      tab: tab.title,
      sheetId: tab.sheetId,
      gridProperties: tab.gridProperties,
      rowsReturned: rows.length,
      values: rows,
      formulas: formulas.values || [],
    };

    const file = path.join(OUT_DIR, `${slugify(tab.title)}.json`);
    fs.writeFileSync(file, JSON.stringify(dump, null, 2));

    const widest = rows.reduce((max, r) => Math.max(max, r.length), 0);
    console.log(`  ${tab.title.padEnd(16)} gid=${String(tab.sheetId).padStart(10)}  ${String(rows.length).padStart(4)} rows, ${String(widest).padStart(2)} cols  -> ${path.relative(ROOT, file)}`);
    index.push({ tab: tab.title, sheetId: tab.sheetId, rows: rows.length, cols: widest });
  }

  fs.writeFileSync(path.join(OUT_DIR, '_index.json'), JSON.stringify(index, null, 2));
  console.log(`\nDone. ${tabs.length} tabs written to ${path.relative(ROOT, OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});

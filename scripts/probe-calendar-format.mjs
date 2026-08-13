// One-off probe: does the Calendar tab carry its meaning in cell background
// colors + notes rather than values? Confirms what the calendar parser needs.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const b64url = (b) => Buffer.from(b).toString('base64url');
const sa = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
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
const tokRes = await fetch(sa.token_uri, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
});
const { access_token: token } = await tokRes.json();

const range = encodeURIComponent("'Tamrielic Calendar 4E 226'!A1:AF38");
const res = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}?ranges=${range}&includeGridData=true`
  + '&fields=sheets(data(rowData(values(formattedValue,note,effectiveFormat(backgroundColor)))))',
  { headers: { Authorization: `Bearer ${token}` } },
);
const data = await res.json();
if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 400));

const rows = data.sheets[0].data[0].rowData || [];
const hex = (c) => {
  if (!c) return null;
  const v = (n) => Math.round((n || 0) * 255).toString(16).padStart(2, '0');
  return `#${v(c.red)}${v(c.green)}${v(c.blue)}`;
};

const palette = new Map();
const notes = [];
rows.forEach((r, ri) => {
  (r.values || []).forEach((cell, ci) => {
    const val = cell.formattedValue;
    if (val && /^\d{1,2}$/.test(val)) {
      const h = hex(cell.effectiveFormat && cell.effectiveFormat.backgroundColor) || 'none';
      palette.set(h, (palette.get(h) || 0) + 1);
    }
    if (cell.note) notes.push({ row: ri + 1, col: ci + 1, value: val, note: cell.note });
  });
});

console.log('Background colors across day-number cells:');
[...palette.entries()].sort((a, b) => b[1] - a[1])
  .forEach(([h, n]) => console.log(`  ${h}  ${String(n).padStart(4)} cells`));

console.log(`\nCell notes found: ${notes.length}`);
notes.slice(0, 15).forEach((n) => console.log(`  r${n.row}c${n.col} "${n.value}" -> ${JSON.stringify(n.note).slice(0, 160)}`));

console.log('\nLegend swatches (rows 35-38, column B):');
[35, 36, 37, 38].forEach((r) => {
  const cell = ((rows[r - 1] || {}).values || [])[1];
  const label = (((rows[r - 1] || {}).values || [])[2] || {}).formattedValue;
  console.log(`  row ${r}: swatch ${hex(cell && cell.effectiveFormat && cell.effectiveFormat.backgroundColor)}  label=${JSON.stringify(label)}`);
});

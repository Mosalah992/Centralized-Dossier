// Google Sheets client for the Cloudflare runtime: service-account JWT signed
// with WebCrypto. Ported from the clock-in bot's worker/src/gsheets.js, which
// has been running this exact flow in production — same service account, same
// spreadsheet.
//
// READ-ONLY. The token is minted with the readonly scope and there is no write
// helper here, so a bug in this site cannot disturb the columns the bot owns.

import type { FormattedGrid, Grid } from '../shared/types';

export interface Env {
  SHEET_ID: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
}

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlJSON = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Isolates are reused between requests, so a module-scope cache saves a token
// exchange on most of them.
let cached: { token: string; exp: number } | null = null;

export async function getAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now < cached.exp - 300) return cached.token;

  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }

  // Strip a UTF-8 BOM picked up when the secret was pasted in.
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON.replace(/^﻿/, '').trim());

  const header = b64urlJSON({ alg: 'RS256', typ: 'JWT' });
  const claims = b64urlJSON({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  });

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`),
  );

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}`
      + `&assertion=${header}.${claims}.${b64url(signature)}`,
  });

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }

  cached = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cached.token;
}

async function api<T>(token: string, sheetId: string, pathAndQuery: string): Promise<T> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${pathAndQuery}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json() as { error?: { message?: string } };
  if (!res.ok) {
    // Google's message can echo the range; keep it short and out of the client.
    throw new Error(`Sheets ${res.status}: ${data.error?.message ?? 'unknown error'}`);
  }
  return data as T;
}

/** Every tab title in the spreadsheet, in sheet order. */
export async function listTabTitles(token: string, sheetId: string): Promise<string[]> {
  const data = await api<{ sheets: { properties: { title: string } }[] }>(
    token, sheetId, '?fields=sheets.properties.title',
  );
  return (data.sheets ?? []).map((s) => s.properties.title);
}

/** Plain values of an A1 range, tab prefix included. */
export async function readValues(
  token: string, sheetId: string, range: string,
): Promise<Grid> {
  const data = await api<{ values?: string[][] }>(
    token, sheetId, `/values/${encodeURIComponent(range)}`,
  );
  return data.values ?? [];
}

const hex = (c?: { red?: number; green?: number; blue?: number }): string | undefined => {
  if (!c) return undefined;
  const v = (n?: number) => Math.round((n ?? 0) * 255).toString(16).padStart(2, '0');
  return `#${v(c.red)}${v(c.green)}${v(c.blue)}`;
};

/**
 * Values *plus* per-cell notes and background colour. Only the calendar needs
 * this — its day cells hold bare numbers and carry their meaning in formatting.
 */
export async function readFormattedGrid(
  token: string, sheetId: string, range: string,
): Promise<FormattedGrid> {
  const fields = 'sheets(data(rowData(values(formattedValue,note,effectiveFormat(backgroundColor)))))';
  const data = await api<{
    sheets?: { data?: { rowData?: { values?: {
      formattedValue?: string;
      note?: string;
      effectiveFormat?: { backgroundColor?: { red?: number; green?: number; blue?: number } };
    }[] }[] }[] }[];
  }>(
    token, sheetId,
    `?ranges=${encodeURIComponent(range)}&includeGridData=true&fields=${encodeURIComponent(fields)}`,
  );

  const rowData = data.sheets?.[0]?.data?.[0]?.rowData ?? [];
  return rowData.map((row) => (row.values ?? []).map((cell) => {
    const background = hex(cell.effectiveFormat?.backgroundColor);
    return {
      value: cell.formattedValue ?? '',
      ...(cell.note ? { note: cell.note } : {}),
      ...(background ? { background } : {}),
    };
  }));
}

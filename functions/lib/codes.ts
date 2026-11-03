// Personal codes: the website's identity for the Scribe Table, after the
// Bruma Joint Archives' (functions/lib/crypto.ts and gate.ts there).
//
// A member asks the bot (/archives code) and is shown a code once. Only its
// HMAC under CODE_PEPPER is stored, so the codes table alone cannot be guessed
// back. Giving the code at the Scribe Table asks Discord for the member's roles
// again and, if they still hold one the Scribe maps, seals the browser with a
// short signed cookie that names the code, never the member. Every filing made
// under that seal asks Discord once more.

import type { AttemptStore } from './reports';
import type { Grant } from './discord';

const enc = new TextEncoder();
const keys = new Map<string, Promise<CryptoKey>>();

function key(secret: string): Promise<CryptoKey> {
  let k = keys.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keys.set(secret, k);
  }
  return k;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Codes ignore case, spaces and hyphens, so "thm-k3pq-7wzx" is the code shown. */
export const normalizeCode = (raw: string): string => raw.trim().toUpperCase().replace(/[\s-]+/g, '');

export const codeHash = (pepper: string, normalized: string) => hmacHex(pepper, `code:${normalized}`);

// No 0/O or 1/I/L: a code is read off a screen and typed again.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomIndex(n: number): number {
  // Rejection sampling, so every letter is equally likely.
  const limit = 256 - (256 % n);
  const b = new Uint8Array(1);
  do crypto.getRandomValues(b);
  while (b[0]! >= limit);
  return b[0]! % n;
}

/** About 40 bits: THM-XXXX-XXXX. Guessing is throttled per address besides. */
export function newCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomIndex(ALPHABET.length)];
  return `THM-${s.slice(0, 4)}-${s.slice(4)}`;
}

// ── The seal: a signed cookie naming the code ───────────────────────────────

export const SEAL_COOKIE = 'thalmor_scribe_seal';
export const SEAL_TTL_SECONDS = 2 * 60 * 60;

interface SealBody {
  /** The codes row. */
  c: number;
  exp: number;
  s: 'scribe';
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The seal is signed with a key derived from CODE_PEPPER rather than a secret
 * of its own: one secret to set, and changing it retires every code and every
 * seal together, which is what changing it is for.
 */
const sealKey = (pepper: string) => hmacHex(pepper, 'scribe-seal');

export async function issueSeal(pepper: string, codeId: number, nowMs: number = Date.now()): Promise<string> {
  const body: SealBody = { c: codeId, exp: Math.floor(nowMs / 1000) + SEAL_TTL_SECONDS, s: 'scribe' };
  const text = b64url(enc.encode(JSON.stringify(body)));
  return `${text}.${await hmacHex(await sealKey(pepper), text)}`;
}

/** The code a seal names, or null for anything unsigned, expired or minted for another use. */
export async function readSeal(pepper: string, token: string | null, nowMs: number = Date.now()): Promise<number | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const text = token.slice(0, dot);
  if (!same(await hmacHex(await sealKey(pepper), text), token.slice(dot + 1))) return null;
  try {
    const body = JSON.parse(new TextDecoder().decode(unb64url(text))) as Partial<SealBody>;
    if (body.s !== 'scribe' || typeof body.c !== 'number' || typeof body.exp !== 'number') return null;
    return body.exp > nowMs / 1000 ? body.c : null;
  } catch {
    return null;
  }
}

/**
 * SameSite=Strict and scoped to the Scribe's routes: no other site's page can
 * carry it, and no other part of the archive is sent it.
 */
export const sealCookie = (token: string) =>
  `${SEAL_COOKIE}=${token}; Path=/api/scribe; HttpOnly; Secure; SameSite=Strict; Max-Age=${SEAL_TTL_SECONDS}`;
export const clearedSealCookie = () => `${SEAL_COOKIE}=; Path=/api/scribe; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// ── Who holds a code ────────────────────────────────────────────────────────

export interface CodeHolder {
  id: number;
  discordUserId: string;
  name: string;
}

export interface CodeStore {
  /** Revoke the member's live codes and record the new one, in one batch. */
  issue(discordUserId: string, hash: string, name: string, now: string): Promise<void>;
  byHash(hash: string): Promise<CodeHolder | null>;
  byId(id: number): Promise<CodeHolder | null>;
  /** The name on the member's live code, to fill in for them on Discord too. */
  nameFor(discordUserId: string): Promise<string | null>;
  revoke(id: number, now: string): Promise<void>;
}

export type Admission =
  | { ok: true; holder: CodeHolder; grant: Grant }
  | { ok: false; reason: 'unknown-code' | 'no-role' | 'unavailable'; message: string };

/**
 * Whether a code's holder may still file as a member, asked of Discord now.
 * A holder who has left the server loses the code for good; one who merely
 * holds no mapped role is refused but keeps it, in case the role comes back.
 */
export async function admitHolder(
  holder: CodeHolder | null,
  store: CodeStore,
  ask: (userId: string) => Promise<{ kind: 'member'; roles: string[] } | { kind: 'gone' } | { kind: 'unknown' }>,
  grantOf: (roles: string[]) => Grant | null,
): Promise<Admission> {
  if (!holder) return { ok: false, reason: 'unknown-code', message: 'The Scribe does not know that code.' };
  const check = await ask(holder.discordUserId);
  if (check.kind === 'unknown') {
    return { ok: false, reason: 'unavailable', message: 'The Embassy’s roll cannot be read just now. Try again shortly.' };
  }
  if (check.kind === 'gone') {
    await store.revoke(holder.id, new Date().toISOString());
    return { ok: false, reason: 'unknown-code', message: 'The Scribe does not know that code.' };
  }
  const grant = grantOf(check.roles);
  if (!grant) {
    return { ok: false, reason: 'no-role', message: 'Your roles no longer hold a commission the Scribe files under.' };
  }
  return { ok: true, holder, grant };
}

// ── Throttles ───────────────────────────────────────────────────────────────

/**
 * A counter in the gates' attempts KV: true when `key` has already been
 * counted `max` times in its window. KV is eventually consistent, so a
 * determined client racing across edges may get a few more; acceptable here.
 * Without the store, refuse: an unthrottled door is worse than a shut one.
 */
export async function overLimit(store: AttemptStore | undefined, key: string, max: number): Promise<boolean> {
  if (!store) return true;
  return Number((await store.get(key)) ?? '0') >= max;
}

export async function count(store: AttemptStore | undefined, key: string, windowSeconds: number): Promise<void> {
  if (!store) return;
  const n = Number((await store.get(key)) ?? '0') + 1;
  await store.put(key, String(n), { expirationTtl: windowSeconds });
}

/** Wrong codes: eight in ten minutes per address, as the archive's other gates. */
export const CODE_ATTEMPTS = { max: 8, window: 600, key: (ip: string) => `scribe-code:${ip}` } as const;
/** Open filings (Applications, Public Requests) per address. */
export const OPEN_FILINGS = { max: 3, window: 3600, key: (ip: string) => `scribe-open:${ip}` } as const;

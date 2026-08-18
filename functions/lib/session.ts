// Signed-cookie session for the archive gate.
// Web Crypto only — runs unchanged on Cloudflare Pages Functions.

const enc = new TextEncoder();

export const COOKIE_NAME = "thalmor_writ";

/**
 * Thalmor Chronicles carries a second lock of its own, so it gets a
 * second cookie. Kept separate rather than adding a claim to the archive writ
 * because clearing one must not clear the other: a reader whose volume writ
 * expires should fall back to the volume's gate, not be thrown out of the
 * archive entirely.
 */
export const CHRONICLE_COOKIE_NAME = "thalmor_writ_chronicle";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // one week

/**
 * A writ issued by Discord login lives a single day, where one bought with the
 * passphrase lives a week.
 *
 * The roles on an identity writ are a SNAPSHOT taken at login — Discord is
 * asked once and never again for the life of the cookie. Nothing reads them
 * yet, but once something does, this number is exactly how long a role the
 * Embassy has taken away goes on working. A week of that is too long; a day is
 * the most staleness worth accepting for a re-login that costs one click.
 */
export const OAUTH_TTL_SECONDS = 60 * 60 * 24; // one day

/**
 * What a writ opens. Written into the signed body, so a writ minted for the
 * archive cannot be moved into the chronicle's cookie and honoured there —
 * the scope is covered by the MAC along with everything else.
 */
export type WritScope = "archive" | "chronicle";

export interface Writ {
  /** Rotation epoch. Bump GATE_EPOCH to invalidate every issued cookie at once. */
  e: number;
  /** Expiry, seconds since epoch. */
  exp: number;
  /**
   * Scope. Absent on writs issued before the chronicle existed, which are
   * archive writs by definition — so a missing value reads as "archive" and a
   * week of already-issued cookies keeps working.
   */
  s?: WritScope;

  // ── Identity ──────────────────────────────────────────────────────────────
  //
  // Present only on a writ bought with a Discord login. The passphrase issues
  // writs without them and always will: the word is the fallback door, and a
  // reader who comes through it is admitted anonymously, exactly as before.
  //
  // Every field here is covered by the MAC along with the rest of the body, so
  // none of it can be edited by the bearer. That is worth stating because it is
  // the whole reason these can be trusted later: a reader cannot award
  // themselves a role by rewriting their own cookie.

  /** Discord user id — the snowflake, which is stable across renames. */
  u?: string;
  /** Display name. For greeting the reader and nothing else. */
  n?: string;
  /**
   * Guild role ids AS THEY STOOD AT LOGIN. Not a live check — see
   * OAUTH_TTL_SECONDS for how long a stale one can survive. Nothing reads this
   * yet; it is carried now so the data can be proven correct in production
   * before anything is gated on it.
   */
  r?: string[];
}

/** What a login knows about the reader, before it becomes a writ. */
export interface Identity {
  id: string;
  name: string;
  roles: string[];
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function mac(secret: string, message: string): Promise<Uint8Array> {
  const key = await hmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Length-independent comparison. Both inputs are fixed-width MACs. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  // ?? 0 satisfies noUncheckedIndexedAccess; i is always in bounds here.
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * Compares two secrets without leaking length or content through timing.
 * Both sides are run through HMAC first, so the comparison is over
 * fixed-width digests rather than the raw passphrase.
 */
export async function secretsMatch(
  secret: string,
  offered: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([mac(secret, offered), mac(secret, expected)]);
  return constantTimeEqual(a, b);
}

/**
 * Mint a writ. With an `identity` it is a Discord login and lives a day; without
 * one it came from the passphrase and lives a week.
 */
export async function issueWrit(
  secret: string,
  epoch: number,
  scope: WritScope = "archive",
  identity?: Identity,
): Promise<string> {
  const ttl = identity ? OAUTH_TTL_SECONDS : SESSION_TTL_SECONDS;
  const writ: Writ = {
    e: epoch,
    exp: Math.floor(Date.now() / 1000) + ttl,
    s: scope,
    ...(identity && { u: identity.id, n: identity.name, r: identity.roles }),
  };
  const body = b64urlEncode(enc.encode(JSON.stringify(writ)));
  const sig = b64urlEncode(await mac(secret, body));
  return `${body}.${sig}`;
}

/**
 * Sign an arbitrary short value into a tamper-proof token, and read it back.
 *
 * Used for the OAuth `state` — the nonce that ties a callback to the login that
 * started it. It needs the same guarantee a writ does (the bearer must not be
 * able to forge one) but none of the structure, so it shares the MAC rather
 * than growing a second way to sign things.
 */
export async function sign(secret: string, value: string): Promise<string> {
  const body = b64urlEncode(enc.encode(value));
  return `${body}.${b64urlEncode(await mac(secret, body))}`;
}

export async function unsign(secret: string, token: string | null): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  let offered: Uint8Array;
  try {
    offered = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }

  if (!constantTimeEqual(offered, await mac(secret, body))) return null;
  try {
    return new TextDecoder().decode(b64urlDecode(body));
  } catch {
    return null;
  }
}

export async function readWrit(
  secret: string,
  epoch: number,
  token: string | null,
  scope: WritScope = "archive",
): Promise<Writ | null> {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let offered: Uint8Array;
  try {
    offered = b64urlDecode(sig);
  } catch {
    return null;
  }

  const expected = await mac(secret, body);
  if (!constantTimeEqual(offered, expected)) return null;

  let writ: Writ;
  try {
    writ = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }

  if (writ.e !== epoch) return null; // rotated out
  if (writ.exp < Math.floor(Date.now() / 1000)) return null;
  // A writ minted for one door does not open another.
  if ((writ.s ?? "archive") !== scope) return null;

  return writ;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/**
 * `maxAge` should match the life of the writ inside. They are separate numbers
 * — the cookie's is enforced by the browser, the writ's by us — and letting a
 * day-long writ sit in a week-long cookie only means the reader keeps handing
 * over something already refused.
 */
export function writCookie(
  token: string,
  name: string = COOKIE_NAME,
  maxAge: number = SESSION_TTL_SECONDS,
): string {
  return [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

/** The OAuth nonce, held between the redirect out and the callback back. */
export const STATE_COOKIE_NAME = "thalmor_oauth_state";
const STATE_TTL_SECONDS = 600;

/**
 * SameSite=Lax rather than Strict, and that is load-bearing: the callback
 * arrives as a top-level navigation FROM discord.com, and a Strict cookie would
 * not be sent with it — every login would fail its own state check.
 */
export function stateCookie(token: string): string {
  return [
    `${STATE_COOKIE_NAME}=${token}`,
    "Path=/api/auth",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${STATE_TTL_SECONDS}`,
  ].join("; ");
}

export function clearedStateCookie(): string {
  return `${STATE_COOKIE_NAME}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function clearedCookie(name: string = COOKIE_NAME): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

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

export async function issueWrit(
  secret: string,
  epoch: number,
  scope: WritScope = "archive",
): Promise<string> {
  const writ: Writ = {
    e: epoch,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    s: scope,
  };
  const body = b64urlEncode(enc.encode(JSON.stringify(writ)));
  const sig = b64urlEncode(await mac(secret, body));
  return `${body}.${sig}`;
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

export function writCookie(token: string, name: string = COOKIE_NAME): string {
  return [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

export function clearedCookie(name: string = COOKIE_NAME): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

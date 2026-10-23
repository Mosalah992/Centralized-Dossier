// Signed-cookie writs for the doors the archive still keeps: the Cabinet's
// (Reports) and the Solar's. Web Crypto only — runs unchanged on Cloudflare
// Pages Functions.
//
// This module used to serve the archive's own gate, a Discord login and the
// Thalmor Chronicles' lock. All three are gone: the registers are public, and
// the Chronicles were opened on 2026-10-23. Readers may still hold those old
// cookies (`thalmor_writ`, `thalmor_writ_chronicle`) until they expire. Each is
// validly signed by its own secret and a cookie's value can be moved, which is
// why every writ carries its scope inside the signed body and a writ minted for
// one door never opens another.

const enc = new TextEncoder();

/** The Cabinet's writ (the Reports gate). */
export const REPORTS_COOKIE_NAME = "thalmor_writ_reports";
/** The Solar's: High Command's room, opened at Ancarion's plate under a word of its own. */
export const SOLAR_COOKIE_NAME = "thalmor_writ_solar";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // one week

/**
 * What a writ opens, written into the signed body and therefore covered by the
 * MAC along with everything else. The comparison is exact, and there is no
 * default: old writs carry `s: "archive"` or `s: "chronicle"`, or on the
 * oldest no `s` at all, and every one of them must fail here. See readWrit.
 */
export const REPORTS_SCOPE = "reports";
export const SOLAR_SCOPE = "solar";
type WritScope = typeof REPORTS_SCOPE | typeof SOLAR_SCOPE;

export interface Writ {
  /** Rotation epoch. Bump the door's epoch (REPORTS_EPOCH, SOLAR_EPOCH) to invalidate its writs at once. */
  e: number;
  /** Expiry, seconds since epoch. */
  exp: number;
  /** Scope: the door this writ opens. */
  s?: string;
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

/** Mint a writ for a door. One week, matching the cookie it rides in. */
export async function issueWrit(
  secret: string,
  epoch: number,
  scope: WritScope,
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
  scope: WritScope,
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
  // A writ minted for another door does not open this one, and an old archive
  // or Chronicle writ moved into this cookie is exactly that. No default: `s`
  // absent is a pre-scope archive writ and must fail here too.
  if (writ.s !== scope) return null;

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
 * `maxAge` matches the life of the writ inside. They are separate numbers — the
 * cookie's is enforced by the browser, the writ's by us — and letting them
 * drift only means the reader keeps handing over something already refused.
 */
export function writCookie(
  token: string,
  name: string,
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

export function clearedCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

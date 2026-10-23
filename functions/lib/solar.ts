// The Solar's gate and the rules every Solar route keeps. Pure policy, like
// lib/reports.ts beside it, so the routes stay thin and the rules testable
// without Cloudflare's Pages types (the D1 store is in lib/solar-d1.ts).
//
// The Solar has its own word (SOLAR_PASSPHRASE), signing secret
// (SOLAR_COOKIE_SECRET), cookie and throttle namespace. It shares only the
// attempts KV with the other gates; a Reports writ does not open it, nor a
// Solar writ the Cabinet. Without its secrets it fails closed.

import { SOLAR_SCOPE, readWrit, secretsMatch } from './session';
import type { AttemptStore } from './reports';

export const SOLAR_MAX_ATTEMPTS = 8;
export const SOLAR_ATTEMPT_WINDOW_SECONDS = 600;
export const solarAttemptKey = (ip: string) => `solar:${ip}`;

export interface SolarEnv {
  SOLAR_COOKIE_SECRET?: string;
  SOLAR_PASSPHRASE?: string;
  SOLAR_EPOCH?: string;
  /** The gates' shared attempts KV, seen only as the throttle uses it. */
  GATE_ATTEMPTS?: AttemptStore;
}

export const solarEpoch = (env: SolarEnv) => Number(env.SOLAR_EPOCH ?? '1');

export async function solarThrottled(store: AttemptStore | undefined, ip: string): Promise<boolean> {
  if (!store) return false;
  return Number((await store.get(solarAttemptKey(ip))) ?? '0') >= SOLAR_MAX_ATTEMPTS;
}

export async function recordSolarFailure(store: AttemptStore | undefined, ip: string): Promise<void> {
  if (!store) return;
  const key = solarAttemptKey(ip);
  const count = Number((await store.get(key)) ?? '0') + 1;
  await store.put(key, String(count), { expirationTtl: SOLAR_ATTEMPT_WINDOW_SECONDS });
}

export const solarPassphraseMatches = (secret: string, offered: string, expected: string) =>
  secretsMatch(secret, offered, expected);

export const hasSolarWrit = (secret: string, epoch: number, token: string | null) =>
  readWrit(secret, epoch, token, SOLAR_SCOPE);

/** Every Solar response: private, never stored, varied by cookie. */
export function solarJson(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      vary: 'Cookie',
      ...extra,
    },
  });
}

export const SOLAR_SEALED = 'The Solar is sealed pending the archivist’s key.';

/**
 * The gate, as every Solar route applies it: a refusal to return, or null when
 * the request carries a valid Solar writ.
 */
export async function refuseWithoutSolarWrit(env: SolarEnv, cookie: string | null): Promise<Response | null> {
  if (!env.SOLAR_COOKIE_SECRET) return solarJson({ error: SOLAR_SEALED }, 503);
  const writ = await hasSolarWrit(env.SOLAR_COOKIE_SECRET, solarEpoch(env), cookie);
  return writ ? null : solarJson({ error: 'The Solar is closed to you.' }, 401);
}

/**
 * Whether a request came from another site. The browser says so itself in
 * Sec-Fetch-Site, which survives the development proxy (whose rewritten Host
 * would make an Origin comparison fail there); without it, Origin is compared.
 */
export function isForeign(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site) return site !== 'same-origin';
  const origin = request.headers.get('Origin');
  return Boolean(origin) && origin !== new URL(request.url).origin;
}

/**
 * A write must come from the archive's own pages. The writ's cookie is
 * SameSite=Lax already, so another site's form cannot carry it; this refuses a
 * cross-site request outright as well, and one that is not JSON (which a
 * plain form cannot send without a preflight).
 */
export function refuseForeignWrite(request: Request): Response | null {
  if (isForeign(request)) return solarJson({ error: 'Not from this archive.' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return solarJson({ error: 'Send the piece as JSON.' }, 415);
  }
  return null;
}

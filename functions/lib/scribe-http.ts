// How the Scribe's website routes answer. Everything under /api/scribe is
// private: it carries a member's seal or a filer's words, so no cache anywhere
// may keep it, and it varies by cookie like the archive's other sealed routes.

import { isForeign } from './solar';
import { readCookie } from './session';
import { SEAL_COOKIE } from './codes';

export function scribeJson(body: unknown, status = 200, extra: HeadersInit = {}): Response {
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

/** A write must be same-site JSON, as the Solar's are: no other site's form can send one. */
export function refuseForeignWrite(request: Request): Response | null {
  if (isForeign(request)) return scribeJson({ error: 'Not from this archive.' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return scribeJson({ error: 'Send the filing as JSON.' }, 415);
  }
  return null;
}

/** A JSON body of bounded size, or null for anything else. */
export async function readBody(request: Request, maxBytes = 16 * 1024): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const sealOf = (request: Request) => readCookie(request, SEAL_COOKIE);
export const addressOf = (request: Request) => request.headers.get('CF-Connecting-IP') ?? 'unknown';

export const NOT_CONSECRATED = 'The Scribe Table is not yet consecrated.';

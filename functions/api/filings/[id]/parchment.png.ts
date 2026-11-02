// GET /api/filings/:id/parchment.png: a filing's parchment, drawn on demand
// from its stored fields (with the Clerk's stamp once there is one) and kept
// in the edge cache, so the Scribe draws each version once.
//
// Who may see it follows where it was filed:
//   a Bulletin Post        anyone, as the board is public (until it is Denied)
//   a report               the Cabinet's readers (Reports writ) or High Command (Solar writ)
//   an Application or a Public Request    High Command, at the Clerk Table (Solar writ)
//
// The writ is checked before the cache is consulted, and a sealed parchment is
// answered private and uncached, so the shared cache entry is reachable only
// through this check.

import { CATEGORY_INFO } from '../../../../shared/filing';
import { hasReportsWrit } from '../../../lib/reports';
import { parchmentOf } from '../../../lib/scribe';
import { REPORTS_COOKIE_NAME, SOLAR_COOKIE_NAME, readCookie } from '../../../lib/session';
import { hasSolarWrit, solarEpoch } from '../../../lib/solar';
import { renderWith, type ScribeEnv } from '../../../lib/scribe-env';
import { d1FilingStore } from '../../../lib/scribe-d1';

interface Env extends ScribeEnv {
  REPORTS_COOKIE_SECRET?: string;
  REPORTS_EPOCH?: string;
  SOLAR_COOKIE_SECRET?: string;
  SOLAR_EPOCH?: string;
}

/** Raise when the Scribe's drawing changes, so cached parchments are drawn again. */
const DRAWING = 1;

const refuse = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', vary: 'Cookie' },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  if (!env.REPORTS) return refuse(503, 'The Scribe Table is not yet consecrated.');
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return refuse(404, 'No filing is entered under that number.');

  const found = await d1FilingStore(env.REPORTS).get(id);
  if (!found) return refuse(404, 'No filing is entered under that number.');

  const to = CATEGORY_INFO[found.filing.category].destination.kind;
  const shown = to === 'board' && found.stamp?.mark !== 'denied';
  if (!shown) {
    const solar =
      env.SOLAR_COOKIE_SECRET && (await hasSolarWrit(env.SOLAR_COOKIE_SECRET, solarEpoch(env), readCookie(request, SOLAR_COOKIE_NAME)));
    const cabinet =
      to === 'cabinet' &&
      env.REPORTS_COOKIE_SECRET &&
      (await hasReportsWrit(env.REPORTS_COOKIE_SECRET, Number(env.REPORTS_EPOCH ?? '1'), readCookie(request, REPORTS_COOKIE_NAME)));
    // Not found rather than forbidden, as the Cabinet answers: a sealed filing's number says nothing.
    if (!solar && !cabinet) return refuse(404, 'No filing is entered under that number.');
  }

  const headers = {
    'content-type': 'image/png',
    ...(shown ? { 'cache-control': 'public, max-age=3600' } : { 'cache-control': 'private, no-store', vary: 'Cookie' }),
  };

  // One cache entry per version of the parchment: a stamp is a new picture.
  const key = new Request(`https://parchment.thalmor-archives.internal/v${DRAWING}/${id}/${found.stamp?.mark ?? 'unstamped'}.png`);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, { headers });

  const png = await renderWith(env.SCRIBE, parchmentOf(found));
  if (!png) return refuse(503, 'The Scribe could not draw it just now.');
  waitUntil(cache.put(key, new Response(png.slice(), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=2592000' } })));
  return new Response(png, { headers });
};

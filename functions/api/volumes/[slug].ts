// GET /api/volumes/:slug — one volume, parsed.
//
// Read-only: no other method is routed here, and the Sheets token is minted
// with the readonly scope, so this endpoint cannot touch the columns the
// clock-in bot owns.

import type { Env } from '../../../server/gsheets';
import { loadVolume, TabMissingError } from '../../../server/archive';
import { getVolume } from '../../../shared/volumes';
import { staleWhileRevalidate } from '../../lib/swr';

/** Sheets allows 300 reads/min per project; the archive must not be the reason we hit it. */
const CACHE_SECONDS = 60;

const json = (body: unknown, status: number, cacheSeconds = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheSeconds
        ? `public, max-age=${cacheSeconds}`
        : 'no-store',
    },
  });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = String(context.params.slug ?? '');
  const volume = getVolume(slug);

  if (!volume) {
    return json({ error: 'No such volume', slug }, 404);
  }

  // Cache per volume. The key is synthetic so it never collides with a real
  // request URL, and it includes the spreadsheet id so switching sheets in
  // development does not serve stale data.
  const cacheKey = new Request(
    `https://archive.cache.internal/${context.env.SHEET_ID}/${volume.slug}`,
  );

  try {
    return await staleWhileRevalidate({
      cacheKey,
      freshSeconds: CACHE_SECONDS,
      waitUntil: (promise) => context.waitUntil(promise),
      produce: async () => json(await loadVolume(context.env, volume), 200, CACHE_SECONDS),
    });
  } catch (error) {
    if (error instanceof TabMissingError) {
      // The tab was renamed or deleted — a real, actionable state, not a crash.
      return json({
        error: 'The volume is not in the archive',
        slug: volume.slug,
        detail: 'No tab title matches this volume. It may have been renamed.',
      }, 404);
    }

    // Never surface Google's message to the client; it can echo ranges and ids.
    console.error(`volume ${volume.slug} failed:`, error);
    return json({ error: 'The archive could not be read', slug: volume.slug }, 502);
  }
};

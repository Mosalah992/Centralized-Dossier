// GET /api/volumes — the shelf: what exists, and which tab each volume is
// currently bound to. Cheap enough to answer from the registry plus one tab
// listing, so the shelf can show a volume as missing without fetching it.

import type { Env } from '../../../server/gsheets';
import { getAccessToken, listTabTitles } from '../../../server/gsheets';
import { VOLUMES, resolveTabTitle } from '../../../shared/volumes';
import { staleWhileRevalidate } from '../../lib/swr';

const CACHE_SECONDS = 60;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cacheKey = new Request(
    `https://archive.cache.internal/${context.env.SHEET_ID}/_shelf`,
  );
  const build = async () => {
    let titles: string[] = [];
    let reachable = true;
    try {
      const token = await getAccessToken(context.env);
      titles = await listTabTitles(token, context.env.SHEET_ID);
    } catch (error) {
      // The shelf still renders when the sheet is unreachable — the books are
      // simply all marked unavailable rather than the page failing outright.
      console.error('shelf listing failed:', error);
      reachable = false;
    }

    const body = {
      reachable,
      fetchedAtUtc: new Date().toISOString(),
      volumes: VOLUMES.map((volume) => ({
        slug: volume.slug,
        title: volume.title,
        category: volume.category,
        tab: reachable ? resolveTabTitle(volume, titles) : null,
      })),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': reachable ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
        // Read by the cacheable() test below: a shelf assembled while the sheet
        // was down is a valid response but a poor thing to remember.
        'X-Archive-Reachable': String(reachable),
      },
    });
  };

  return staleWhileRevalidate({
    cacheKey,
    freshSeconds: CACHE_SECONDS,
    waitUntil: (promise) => context.waitUntil(promise),
    produce: build,
    // Never cache an unreachable shelf. Doing so would pin every volume as
    // withdrawn for the retention window, long after the sheet came back.
    cacheable: (response) => response.headers.get('X-Archive-Reachable') === 'true',
  });
};

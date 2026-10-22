/**
 * A missing fingerprinted asset must fail loudly and briefly, never quietly
 * and for a year.
 *
 * Pages answers a request for a file it does not have with the SPA's
 * index.html, and public/_headers stamps everything under /assets/ as
 * `immutable` for a year. Together those turn one unlucky request into a
 * broken page that a reload cannot fix: on 2026-10-06 a deploy's new HTML
 * reached readers a moment before its new script did, the script URL was
 * answered with the previous deployment's index.html, and browsers kept that
 * HTML as the script. A CDN purge does not reach a browser's own cache.
 *
 * Nothing under /assets/ is ever HTML — Vite emits only scripts, styles,
 * fonts, images and media there — so an HTML answer is always this fallback.
 * It becomes a 404 nobody may store, and the next load asks again.
 */
export function guardAssetFallback(request: Request, response: Response): Response {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/assets/')) return response;

  const type = response.headers.get('Content-Type') ?? '';
  if (!type.startsWith('text/html')) return response;

  return new Response('Not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * An /api path with no Function behind it must answer as an API, not as the
 * app.
 *
 * Without this, a request for an endpoint that does not exist falls through to
 * the SPA's index.html with a 200, and a client asking for JSON is handed a web
 * page. The Embassy room asks /api/room/* for its board and Scribe Table before the
 * Librarian backend exists, and reads a 404 as "not yet consecrated" — which it
 * can only do if a missing endpoint says so.
 */
export function guardApiFallback(request: Request, response: Response): Response {
  const { pathname } = new URL(request.url);
  if (pathname !== '/api' && !pathname.startsWith('/api/')) return response;

  const type = response.headers.get('Content-Type') ?? '';
  if (!type.startsWith('text/html')) return response;

  return new Response(JSON.stringify({ error: 'not-found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

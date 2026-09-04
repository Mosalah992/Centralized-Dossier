// POST /api/register/entry — a reader is entered in the register.
//
// The one route on this site that writes anything. It is called once by the
// page, deduped by a cookie carrying no identifier, and it stores a country code
// and an integer.
//
// WHY THE PAGE CALLS IT RATHER THAN A ROUTE COUNTING ITSELF. The obvious place
// to count is inside /api/volumes, and it is the wrong one twice over: that
// route is `public, max-age=60` behind lib/swr.ts, so the Function usually never
// runs and most readers would go uncounted — and a Set-Cookie on a publicly
// cached response can be handed to the NEXT reader by the cache, after which
// nobody is ever counted again. Invariant 1 is about exactly this.
//
// EVERY FAILURE IS A 204. Already counted, not a browser, no database, database
// broken — all of them answer the same way. That is partly so the client has one
// simple thing to do, and partly so a prober cannot use the status code to learn
// whether they have been recorded, whether the checks caught them, or whether
// there is a database behind this at all.

import { readCookie } from '../../lib/session';
import {
  CONSULT_COOKIE_NAME,
  LIST_SQL,
  UPSERT_SQL,
  consultedCookie,
  isReaderRequest,
  normalizeCountry,
  summarize,
  type TallyRow,
} from '../../lib/register';

interface Env {
  REGISTER?: D1Database;
  /**
   * Local development only, and absent in production.
   *
   * Kept as an escape hatch rather than a necessity: `wrangler pages dev` was
   * expected not to populate `request.cf` at all, and in wrangler 3 it does —
   * a local visit is resolved to a real country. This exists for the cases
   * where it is not, and to let a specific code be forced while testing the
   * province list. Never a fallback for a real request — see below.
   */
  CF_COUNTRY_OVERRIDE?: string;
}

/** Nothing was recorded, and the caller is told nothing about why. */
const SILENT = () => new Response(null, {
  status: 204,
  headers: { 'cache-control': 'private, no-store', vary: 'Cookie' },
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isReaderRequest(request)) return SILENT();

  // Already entered today. Note this returns BEFORE touching D1 — repeat
  // traffic is the common case and it should cost the database nothing.
  if (readCookie(request, CONSULT_COOKIE_NAME)) return SILENT();

  if (!env.REGISTER) return SILENT();

  /*
   * The country, from Cloudflare's own edge resolution.
   *
   * NEVER from an inbound CF-IPCountry header. That header is trustworthy only
   * when Cloudflare set it, and the case where you would reach for it — cf
   * missing — is exactly the case where anyone could have sent it. An override
   * var covers local development instead, and does not exist in production.
   */
  const cf = request.cf as { country?: string } | undefined;
  const country = normalizeCountry(cf?.country ?? env.CF_COUNTRY_OVERRIDE);

  try {
    /*
     * One batch, so the increment and the read are one transaction and the
     * ordinal a reader is shown is the total as committed.
     *
     * The count is incremented IN SQL. It is never read into JavaScript and
     * written back — that is what makes two readers arriving together safe, and
     * it is the one thing about this route not to refactor.
     */
    const [, listed] = await env.REGISTER.batch<TallyRow>([
      env.REGISTER.prepare(UPSERT_SQL).bind(country),
      env.REGISTER.prepare(LIST_SQL),
    ]);

    const { total, countries } = summarize(listed?.results ?? []);

    return new Response(JSON.stringify({ ordinal: total, total, countries }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'private, no-store',
        // No cache stores a POST, but the dependency is real and stating it
        // costs nothing.
        vary: 'Cookie',
        'set-cookie': consultedCookie(),
      },
    });
  } catch {
    // An unapplied migration is the likeliest cause. No cookie is set, so the
    // reader is simply counted on their next visit instead.
    return SILENT();
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return new Response(JSON.stringify({ error: 'Readers are entered here, not listed.' }), {
    status: 405,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
};

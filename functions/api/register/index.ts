// GET /api/register — the register, read.
//
// Never writes, never reads a cookie, and never returns a non-2xx. That last
// part is a contract with the client rather than laziness: `get<T>()` in
// web/src/api.ts turns any non-OK response into a thrown ApiError, and the
// requirement here is that a broken or unconfigured register makes the block
// quietly not render. An error page because a vanity counter is down would be
// the tail wagging the archive.
//
// NOT WRAPPED IN staleWhileRevalidate. lib/swr.ts exists because Sheets is slow
// and its answers are worth holding across colos; this is one cheap SQL read of
// at most a couple of hundred rows, and the sixty-second edge cache below is
// already the whole win. A second stale layer over a number whose entire job is
// to move would just make it wrong for longer.

import { LIST_SQL, summarize, type TallyRow } from '../../lib/register';

interface Env {
  REGISTER?: D1Database;
}

const json = (body: unknown, status: number, cache: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
    },
  });

/**
 * What a reader is told when there is nothing to tell them.
 *
 * `available: false` rather than an error, and `no-store` rather than the usual
 * sixty seconds — an unbound binding or an unapplied migration is a state
 * somebody is presumably in the middle of fixing, and caching the emptiness for
 * a minute would make the fix look like it had not worked.
 */
const NOTHING = () => json({ available: false, total: 0, countries: [] }, 200, 'no-store');

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  // Absent binding is a supported state, exactly as it is for GATE_ATTEMPTS and
  // CHRONICLE_FILINGS: an accessory that is not configured must never take down
  // the page it decorates.
  if (!env.REGISTER) return NOTHING();

  try {
    const { results } = await env.REGISTER.prepare(LIST_SQL).all<TallyRow>();
    const { total, countries } = summarize(results ?? []);
    return json(
      { available: true, total, countries },
      200,
      // Sixty seconds, and no Vary. The cookie that dedupes writes is scoped to
      // /api/register/entry, so it never reaches this route and cannot vary it.
      'public, max-age=60',
    );
  } catch {
    // A missing table is the likeliest real cause — a migration applied locally
    // and not remotely — and it must read as "nothing yet", not as a failure.
    return NOTHING();
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next();
  return json({ error: 'The register is read here, not written.' }, 405, 'no-store');
};

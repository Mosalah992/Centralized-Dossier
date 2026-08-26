// GET /api/enforcement — the Ledger of Enforcement.
//
// Behind ONE lock, not two. api/_middleware.ts has already established that the
// caller holds an archive writ before this route runs, and that is the whole of
// the check: any member the Embassy admits may read what the Embassy did. The
// Chronicles carry a second word because they are the Embassy's own reading of
// its intelligence; this is the register of acts, and every member is entitled
// to it.
//
// Its text sits in functions/lib/enforcement.ts and never enters the browser
// bundle. That is the point of serving it rather than shipping it: static
// assets are public, so a volume compiled into the bundle is readable by anyone
// with the link whether or not they ever answered the gate.

import { ENFORCEMENTS } from '../../lib/enforcement';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The middleware rewrites these anyway; set here so the route is correct
      // on its own terms and does not depend on being wrapped.
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    },
  });
}

export const onRequestGet: PagesFunction = async () =>
  json({
    fetchedAtUtc: new Date().toISOString(),
    entries: ENFORCEMENTS,
  });

// GET /api/enforcement — the Ledger of Enforcement.
//
// BEHIND NO LOCK AT ALL, AND THAT IS DELIBERATE. This route had exactly one
// check and never its own: api/_middleware.ts established that the caller held
// an archive writ, and that was the whole of it, on the reasoning that any
// member the Embassy admits may read what the Embassy did. The archive's gate
// has been removed and the register is now served to anyone with the link.
//
// SO THE REASON ITS TEXT IS NOT IN THE BUNDLE HAS CHANGED, AND IT IS WORTH
// SAYING WHY IT STAYS THERE ANYWAY. functions/lib/enforcement.ts was kept out
// of the browser build because a static asset is readable without a writ; there
// is no writ now, so that argument is spent. What is left is the other half:
// the file is gitignored, the public GitHub repository does not carry it, and
// keeping it on the Worker's side of the build is what keeps a `git clone` from
// being a copy of it. The site publishes this ledger. The repository still
// does not, and that distinction is the only one this arrangement now buys.

import { ENFORCEMENTS } from '../../lib/enforcement';

/** The entries only change on deploy, so this is a floor, not a compromise. */
const CACHE_SECONDS = 300;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Public and static — the entries are a compiled-in constant, not a read
      // of anything — so this may be cached anywhere, by anyone, for as long as
      // a deploy lasts. `Vary: Cookie` went with the gate: there is no cookie
      // left that changes this answer.
      'cache-control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
}

export const onRequestGet: PagesFunction = async () =>
  json({
    fetchedAtUtc: new Date().toISOString(),
    entries: ENFORCEMENTS,
  });

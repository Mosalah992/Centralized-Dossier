// Runs before every /api/* route. IT IS NO LONGER A BOUNDARY.
//
// This file used to be the archive's only real gate: it refused any request
// without a signed writ, and it rewrote every response to `private, no-store`
// so a shared edge cache could not hand a cached roster to a request carrying
// no cookie. Both are gone. The archive is deliberately open — anyone with the
// link reads the registers, including the roster's Discord handles, notes,
// weekly hours and last-active stamps. That was decided knowingly; it is not an
// oversight to be repaired by putting the check back.
//
// WHAT THAT MOVED, AND WHERE IT MOVED TO. With no blanket rewrite here, every
// response now means exactly what its own route says. Two consequences worth
// stating, because neither is visible from this file:
//
//   - The volumes' `public, max-age=60` is now real. It reaches the reader and
//     Cloudflare's edge may cache on it, which is correct for public data and
//     was precisely the thing this file existed to prevent.
//   - The Chronicles are still sealed, under their own word, and nothing here
//     protects them any more. api/chronicle/*.ts set their own `private,
//     no-store` and check their own writ. Those lines are load-bearing now
//     rather than belt-and-braces — do not tidy them away as redundant.
//
// All that is left here is bookkeeping hygiene, below.

export const onRequest: PagesFunction = async (context) => {
  const upstream = await context.next();
  const response = new Response(upstream.body, upstream);

  // Bookkeeping for lib/swr.ts — when an entry was produced, and whether the
  // sheet answered when it was built. Both have to survive into the Worker's
  // own cache, so they are set upstream and stripped here rather than never
  // written: the reader has no use for either, and the second merely repeats a
  // field already in the body.
  response.headers.delete("x-archive-fetched-at");
  response.headers.delete("x-archive-reachable");

  return response;
};

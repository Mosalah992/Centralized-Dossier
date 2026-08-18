// Guards every /api/* route. This is the only real boundary — the gate page
// itself is scenery. Anything not listed in PUBLIC_PATHS requires a valid writ.

import { COOKIE_NAME, readCookie, readWrit } from "../lib/session";
// The set of routes that need no writ. Kept in its own module so the test suite
// can assert the boundary without importing this file's Workers types.
import { PUBLIC_PATHS } from "../lib/public-paths";

interface Env {
  GATE_SECRET: string;
  GATE_PASSPHRASE: string;
  GATE_EPOCH?: string;
}

function sealed(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "Cookie",
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { pathname } = new URL(context.request.url);

  if (PUBLIC_PATHS.has(pathname)) return context.next();

  // Fail closed. A missing secret must never mean an open archive.
  //
  // GATE_SECRET alone, now that Discord is the way in: it signs and verifies
  // every writ, so without it nothing can be trusted. GATE_PASSPHRASE is no
  // longer required and is deliberately not checked here — it has become an
  // optional break-glass door, and demanding it would mean an archive that
  // seals itself the moment the shared word is retired.
  if (!context.env.GATE_SECRET) {
    return sealed(503, "The archive is sealed pending the warden's key.");
  }

  const epoch = Number(context.env.GATE_EPOCH ?? "1");
  const token = readCookie(context.request, COOKIE_NAME);
  const writ = await readWrit(context.env.GATE_SECRET, epoch, token);

  if (!writ) {
    return sealed(401, "No writ of passage accompanies this request.");
  }

  const upstream = await context.next();
  const response = new Response(upstream.body, upstream);

  // Critical: the volumes currently answer with `public, max-age=60`.
  // Behind a gate, a shared edge cache would happily hand a cached roster
  // to someone with no cookie at all.
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("vary", "Cookie");

  // Bookkeeping for lib/swr.ts — when an entry was produced, and whether the
  // sheet answered when it was built. Both have to survive into the Worker's
  // own cache, so they are set upstream and stripped here rather than never
  // written: the reader has no use for either, and the second merely repeats a
  // field already in the body.
  response.headers.delete("x-archive-fetched-at");
  response.headers.delete("x-archive-reachable");

  return response;
};

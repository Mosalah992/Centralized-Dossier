// Stale-while-revalidate over the Worker's own cache.
//
// WHY NOT `s-maxage` ON THE RESPONSE: because it would unseal the archive.
// api/_middleware.ts rewrites every gated response to `private, no-store`
// precisely so a shared edge cache cannot hand a cached roster — a hundred
// real people's handles and activity — to a request carrying no writ.
// `s-maxage` is the directive that invites exactly that.
//
// So the caching happens on OUR side of the gate. The key is a synthetic URL
// no client can produce, the lookup runs only after the middleware has checked
// the cookie, and the response the reader receives is still `private,
// no-store`. What is cached is the answer from Google, not the answer to a
// reader.
//
// The win is latency. Sheets is slow — several hundred milliseconds is normal,
// and the calendar asks for grid data with formatting — while the roster
// changes a few times a day. Before this, one reader in every sixty-second
// window paid full price for everyone. Now that reader is served the previous
// answer immediately and the refresh happens behind them.

/** Records when an entry was produced, since the Cache API will not tell us. */
const STAMP = 'x-archive-fetched-at';

/**
 * How long an entry is kept at all. Longer than the freshness window on
 * purpose: an entry has to outlive its own staleness to be servable while the
 * refresh runs. If the sheet is unreachable for longer than this, the entry
 * finally expires and the caller's own error handling takes over.
 */
const RETAIN_SECONDS = 86_400;

const now = () => Math.floor(Date.now() / 1000);

/** Copy a response, stamping the moment it was produced. */
function stamped(response: Response): Response {
  const copy = new Response(response.clone().body, response);
  copy.headers.set(STAMP, String(now()));
  // Governs retention in the Worker cache only; the middleware overwrites what
  // the reader is sent. Without a cacheable directive here, cache.put drops it.
  copy.headers.set('Cache-Control', `public, max-age=${RETAIN_SECONDS}`);
  return copy;
}

/** Seconds since an entry was produced, or null if it carries no stamp. */
function ageOf(response: Response): number | null {
  const at = Number(response.headers.get(STAMP));
  return Number.isFinite(at) && at > 0 ? now() - at : null;
}

interface Options {
  /** Synthetic, unguessable, and scoped to the spreadsheet being read. */
  cacheKey: Request;
  /** Seconds an entry is considered current. */
  freshSeconds: number;
  /** Hands the background refresh to the runtime so it outlives the response. */
  waitUntil: (promise: Promise<unknown>) => void;
  /** Produces a fresh response. May throw; a throw during refresh is survivable. */
  produce: () => Promise<Response>;
  /** Decides whether a freshly produced response is worth storing. */
  cacheable?: (response: Response) => boolean;
}

export async function staleWhileRevalidate(options: Options): Promise<Response> {
  const { cacheKey, freshSeconds, waitUntil, produce } = options;
  const cacheable = options.cacheable ?? ((r: Response) => r.ok);
  const cache = caches.default;

  const refresh = async () => {
    const fresh = await produce();
    if (cacheable(fresh)) await cache.put(cacheKey, stamped(fresh));
  };

  const hit = await cache.match(cacheKey);
  if (hit) {
    const age = ageOf(hit);

    // An unstamped entry predates this code. Treat it as stale rather than
    // trusting it indefinitely.
    if (age !== null && age < freshSeconds) return hit;

    // Serve what we have and replace it behind the reader. A failed refresh
    // must not fail the request: the whole point is that the reader already
    // has a usable answer in hand.
    waitUntil(refresh().catch((error) => {
      console.error('background refresh failed; serving stale:', error);
    }));

    return hit;
  }

  // Nothing cached: the caller waits, and this is the only path that does.
  const fresh = await produce();
  if (cacheable(fresh)) waitUntil(cache.put(cacheKey, stamped(fresh)));
  return fresh;
}

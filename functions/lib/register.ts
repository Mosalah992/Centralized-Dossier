/**
 * The Register of Consultation: who has opened these volumes, by province.
 *
 * Everything here is pure — no D1, no Request handling beyond reading headers,
 * nothing that needs a Worker to run. That is the same split `lib/session.ts`
 * takes and for the same reason: this repo has no HTTP route tests and no
 * miniflare, so the only logic that can actually be covered is the logic that
 * does not need a `context`. `test/register.test.ts` covers all of it.
 *
 * WHAT IS STORED IS INTEGERS. A country code and a count, and nothing else: no
 * address, no user agent, no timestamp, no row per visitor. There is deliberately
 * nothing here that could answer "did this person come back", because the
 * archive is a `noindex` page carrying about a hundred real people's handles and
 * the last thing it should grow is a way to watch them.
 */

/* ── The cookie ───────────────────────────────────────────────────────── */

export const CONSULT_COOKIE_NAME = 'archive_consulted';

/** One day. The register records a reader once a day, not once ever. */
export const CONSULT_COOKIE_MAX_AGE = 60 * 60 * 24;

/** The one URL the browser will ever send the cookie to. */
export const ENTRY_PATH = '/api/register/entry';

/**
 * The dedupe cookie.
 *
 * THE VALUE IS THE LITERAL `1`. Not a nonce, not a hash of anything, not a
 * visitor id. Two visits from one browser are indistinguishable from two
 * browsers in everything this archive stores, and that is the point: a counter
 * that can tell readers apart is a tracker whatever it is called.
 *
 * `Path` IS LOAD-BEARING, and is the reason this feature costs the rest of the
 * site nothing. Scoped to the single entry URL, the browser never attaches it to
 * `/api/volumes`, `/api/enforcement`, the HTML or any asset — so no cached route
 * has to grow a `Vary: Cookie`, and no cache key changes. Widening it to `Path=/`
 * would quietly make every public, max-age route's caching wrong; the test pins
 * this string for that reason.
 *
 * `SameSite=Strict` because the endpoint is only ever called by our own page,
 * so Strict costs nothing and is tighter than the chronicle writ's Lax.
 */
export function consultedCookie(): string {
  return `${CONSULT_COOKIE_NAME}=1`
    + `; Path=${ENTRY_PATH}`
    + '; HttpOnly'
    + '; Secure'
    + '; SameSite=Strict'
    + `; Max-Age=${CONSULT_COOKIE_MAX_AGE}`;
}

/* ── Where a reader came from ─────────────────────────────────────────── */

/** Everything the archive could not place. */
export const UNRECORDED = 'XX';

/**
 * An ISO-3166 alpha-2 code, or `XX`.
 *
 * Cloudflare resolves this at the edge, so there is no database to license and
 * no third party to tell. It can still be absent (local development), or one of
 * Cloudflare's own non-country values — `T1` for Tor — and both of those are
 * honestly "unrecorded" rather than anything to guess at.
 */
export function normalizeCountry(raw: string | undefined | null): string {
  const code = (raw ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return UNRECORDED;
  // T1 is Cloudflare's marker for Tor, not a place.
  if (code === 'T1') return UNRECORDED;
  return code;
}

/* ── Who is asking ────────────────────────────────────────────────────── */

/**
 * Whether this looks like a reader's browser rather than a crawler.
 *
 * THIS REPLACES THE GATE. Counting used to be able to happen behind a
 * passphrase, which filtered bots for free — nothing without the word ever got
 * far enough to be counted. There is no gate any more, so the filtering has to
 * come from the shape of the request, and it is done with headers the browser
 * sets and page script cannot forge:
 *
 *   - POST. Crawlers, link unfurlers and preview fetchers issue GET or HEAD and
 *     never reach this route at all.
 *   - `Sec-Fetch-Site: same-origin` and `Sec-Fetch-Mode: cors`. Set by the
 *     browser itself; script cannot override them.
 *   - `Origin` equal to our own.
 *
 * None of these is an address or a user agent, and none is retained — they are
 * read, judged, and dropped inside one request.
 */
export function isReaderRequest(request: Request): boolean {
  if (request.method !== 'POST') return false;
  if (request.headers.get('sec-fetch-site') !== 'same-origin') return false;
  if (request.headers.get('sec-fetch-mode') !== 'cors') return false;

  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/* ── The tally ────────────────────────────────────────────────────────── */

export interface TallyRow {
  country: string;
  visits: number;
}

export interface Summary {
  total: number;
  countries: { code: string; visits: number }[];
}

/**
 * The register as a reader sees it: a total, and the provinces in order.
 *
 * The total is summed here rather than kept as its own row. A second row would
 * be a second thing to keep in step with the first, and the whole reason this
 * feature uses SQL rather than KV is to avoid having two numbers that can
 * disagree.
 */
export function summarize(rows: readonly TallyRow[]): Summary {
  const countries = rows
    .filter((r) => Number.isFinite(r.visits) && r.visits > 0)
    .map((r) => ({ code: normalizeCountry(r.country), visits: Math.trunc(r.visits) }))
    .sort((a, b) => b.visits - a.visits || a.code.localeCompare(b.code));

  return {
    total: countries.reduce((n, c) => n + c.visits, 0),
    countries,
  };
}

/* ── The statements ───────────────────────────────────────────────────── */

/**
 * THE COUNT IS NEVER READ INTO JS AND WRITTEN BACK.
 *
 * `visits = visits + 1` happens inside the database, which is the entire reason
 * two readers arriving at once cannot lose a count between them. The obvious
 * refactor — read the row, add one, write it — is how the same feature on KV
 * silently drops visits, and it must not be done here.
 */
export const UPSERT_SQL = `
  INSERT INTO tally (country, visits) VALUES (?1, 1)
  ON CONFLICT(country) DO UPDATE SET visits = visits + 1
`;

export const LIST_SQL = 'SELECT country, visits FROM tally ORDER BY visits DESC, country ASC';

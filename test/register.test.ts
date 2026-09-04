// The Register of Consultation, tested where it can be.
//
// The routes themselves are not covered: this repo has no HTTP route tests, no
// miniflare and no @cloudflare/vitest-pool-workers, and standing that up for a
// counter would be a larger change than the counter. The convention here is the
// one test/session.test.ts follows — keep the logic pure in functions/lib/ and
// test that — so everything with a decision in it lives in register.ts and is
// covered below.

import { describe, expect, it } from 'vitest';

import {
  CONSULT_COOKIE_MAX_AGE,
  CONSULT_COOKIE_NAME,
  ENTRY_PATH,
  LIST_SQL,
  UNRECORDED,
  UPSERT_SQL,
  consultedCookie,
  isReaderRequest,
  normalizeCountry,
  summarize,
} from '../functions/lib/register';

const reader = (over: Record<string, string> = {}, method = 'POST') =>
  new Request('https://thalmor-archives.pages.dev/api/register/entry', {
    method,
    headers: {
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      origin: 'https://thalmor-archives.pages.dev',
      ...over,
    },
  });

describe('the dedupe cookie', () => {
  /*
   * THE PATH IS THE WHOLE REASON THIS FEATURE IS FREE FOR THE REST OF THE SITE.
   * Scoped to the one entry URL, the cookie never rides along on /api/volumes or
   * any asset, so no cached route needs Vary: Cookie and no cache key changes.
   * Widening it to Path=/ would break the caching of every public route quietly
   * and at a distance — hence a test on the literal string.
   */
  it('is scoped to the single URL that consumes it', () => {
    expect(consultedCookie()).toContain(`Path=${ENTRY_PATH}`);
    expect(ENTRY_PATH).toBe('/api/register/entry');
    expect(consultedCookie()).not.toContain('Path=/;');
  });

  it('carries no identifier at all', () => {
    // A bare 1. Nothing here can link two visits, which is the point: a counter
    // that can tell readers apart is a tracker whatever it is called.
    expect(consultedCookie().startsWith(`${CONSULT_COOKIE_NAME}=1;`)).toBe(true);
    expect(consultedCookie()).not.toMatch(/=[0-9a-f]{8,}/i);
  });

  it('is locked down and lasts a day', () => {
    const c = consultedCookie();
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Strict');
    expect(c).toContain(`Max-Age=${CONSULT_COOKIE_MAX_AGE}`);
    expect(CONSULT_COOKIE_MAX_AGE).toBe(86_400);
  });
});

describe('where a reader came from', () => {
  it('takes a two-letter code and squares its case', () => {
    expect(normalizeCountry('gb')).toBe('GB');
    expect(normalizeCountry('EG')).toBe('EG');
    expect(normalizeCountry(' us ')).toBe('US');
  });

  it('calls anything it cannot place unrecorded', () => {
    // Absent is the case the override var exists for. It is NOT the ordinary
    // local one — wrangler 3 resolves a real country under pages dev.
    expect(normalizeCountry(undefined)).toBe(UNRECORDED);
    expect(normalizeCountry(null)).toBe(UNRECORDED);
    expect(normalizeCountry('')).toBe(UNRECORDED);
    expect(normalizeCountry('GBR')).toBe(UNRECORDED);
    expect(normalizeCountry('1')).toBe(UNRECORDED);
    expect(normalizeCountry('<script>')).toBe(UNRECORDED);
  });

  it('does not treat Tor as a country', () => {
    // T1 is Cloudflare's own marker, not a place. Recording it as one would put
    // a country on the register that does not exist.
    expect(normalizeCountry('T1')).toBe(UNRECORDED);
  });
});

describe('who is asking', () => {
  it('accepts a browser making a same-origin call', () => {
    expect(isReaderRequest(reader())).toBe(true);
  });

  it('refuses anything that is not a POST', () => {
    // Crawlers, unfurlers and preview fetchers issue GET or HEAD. This is the
    // filtering the gate used to do for free.
    expect(isReaderRequest(reader({}, 'GET'))).toBe(false);
    expect(isReaderRequest(reader({}, 'HEAD'))).toBe(false);
  });

  it('refuses a request the browser did not shape', () => {
    expect(isReaderRequest(new Request('https://thalmor-archives.pages.dev/api/register/entry', { method: 'POST' }))).toBe(false);
    expect(isReaderRequest(reader({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(isReaderRequest(reader({ 'sec-fetch-mode': 'navigate' }))).toBe(false);
  });

  it('refuses a call from somewhere else', () => {
    expect(isReaderRequest(reader({ origin: 'https://example.com' }))).toBe(false);
    expect(isReaderRequest(reader({ origin: 'not-a-url' }))).toBe(false);
  });
});

describe('the tally', () => {
  it('is empty before anyone has come', () => {
    expect(summarize([])).toEqual({ total: 0, countries: [] });
  });

  it('sums the total rather than keeping one', () => {
    // No total row: a second number is a second thing that can disagree with
    // the first, and avoiding that is why this is SQL and not KV.
    const s = summarize([
      { country: 'GB', visits: 41 },
      { country: 'US', visits: 106 },
    ]);
    expect(s.total).toBe(147);
  });

  it('orders by visits, then by code', () => {
    const s = summarize([
      { country: 'US', visits: 5 },
      { country: 'EG', visits: 9 },
      { country: 'AU', visits: 5 },
    ]);
    expect(s.countries.map((c) => c.code)).toEqual(['EG', 'AU', 'US']);
  });

  it('drops rows that cannot be a count', () => {
    const s = summarize([
      { country: 'GB', visits: 3 },
      { country: 'FR', visits: 0 },
      { country: 'DE', visits: -2 },
      { country: 'IT', visits: Number.NaN },
    ]);
    expect(s.countries.map((c) => c.code)).toEqual(['GB']);
    expect(s.total).toBe(3);
  });

  it('normalises whatever the database happens to hold', () => {
    const s = summarize([{ country: 'gb', visits: 2 }, { country: 'T1', visits: 1 }]);
    expect(s.countries.map((c) => c.code)).toEqual(['GB', UNRECORDED]);
  });
});

describe('the statements', () => {
  /*
   * The increment must happen IN THE DATABASE. Reading the count into JS and
   * writing it back is how the same feature on KV loses visits when two readers
   * arrive at once, and it is the refactor this asserts against.
   */
  it('increments in SQL rather than in JavaScript', () => {
    expect(UPSERT_SQL).toMatch(/visits\s*=\s*visits\s*\+\s*1/);
    expect(UPSERT_SQL).toMatch(/ON CONFLICT\(country\) DO UPDATE/i);
  });

  it('reads the whole tally in one ordered statement', () => {
    expect(LIST_SQL).toMatch(/SELECT country, visits FROM tally/i);
    expect(LIST_SQL).toMatch(/ORDER BY visits DESC/i);
  });
});

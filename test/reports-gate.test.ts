import { describe, expect, it } from 'vitest';

import {
  REPORTS_COOKIE_NAME,
  REPORTS_SCOPE,
  readWrit,
  issueWrit,
  writCookie,
} from '../functions/lib/session';
import {
  recordReportsFailure,
  reportsAttemptKey,
  reportsPassphraseMatches,
  reportsThrottled,
  hasReportsWrit,
} from '../functions/lib/reports';
import { escapeLike, parseReportsQuery, reportsWhere } from '../functions/lib/reports';

const SECRET = 'reports-cookie-secret';
const PASSPHRASE = 'the right report word';

class Attempts {
  private readonly values = new Map<string, string>();

  get(key: string) { return Promise.resolve(this.values.get(key) ?? null); }
  put(key: string, value: string, _options: { expirationTtl: number }) {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

describe('the Reports gate', () => {
  it('refuses a wrong passphrase', async () => {
    await expect(reportsPassphraseMatches(SECRET, 'wrong', PASSPHRASE)).resolves.toBe(false);
  });

  it('issues a Reports-only HttpOnly writ for the correct passphrase', async () => {
    await expect(reportsPassphraseMatches(SECRET, PASSPHRASE, PASSPHRASE)).resolves.toBe(true);
    const token = await issueWrit(SECRET, 1, REPORTS_SCOPE);
    expect(writCookie(token, REPORTS_COOKIE_NAME)).toContain(`${REPORTS_COOKIE_NAME}=`);
    expect(writCookie(token, REPORTS_COOKIE_NAME)).toContain('HttpOnly');
  });

  it('returns no report data without a valid Reports cookie', async () => {
    await expect(hasReportsWrit(SECRET, 1, null)).resolves.toBeNull();
  });

  it('throttles after eight failed attempts under its own KV prefix', async () => {
    const attempts = new Attempts();
    for (let i = 0; i < 8; i++) {
      await recordReportsFailure(attempts, '198.51.100.10');
    }
    await expect(reportsThrottled(attempts, '198.51.100.10')).resolves.toBe(true);
    expect(await attempts.get(reportsAttemptKey('198.51.100.10'))).toBe('8');
  });

  it('invalidates Reports writs when the Reports epoch changes', async () => {
    const token = await issueWrit(SECRET, 1, REPORTS_SCOPE);
    await expect(hasReportsWrit(SECRET, 2, token)).resolves.toBeNull();
  });
});

describe('Reports query cursor', () => {
  it('keeps category and severity, and accepts only a well-formed time-and-id cursor', () => {
    expect(parseReportsQuery(new URL('https://example.test/api/reports?category=Military&severity=high&cursor=2026-09-30T12%3A00%3A00.000Z%7C123')))
      .toMatchObject({ category: 'Military', severity: 'high', cursor: { timestamp: '2026-09-30T12:00:00.000Z', id: '123' } });
    expect(parseReportsQuery(new URL('https://example.test/api/reports?cursor=broken')))
      .toEqual({ category: null, severity: null, cursor: null, q: null, subcategory: null, from: null, to: null });
  });
});

describe('Reports search and filters', () => {
  const at = (query: string) => parseReportsQuery(new URL(`https://example.test/api/reports?${query}`));

  it('accepts search, subcategory and a date range', () => {
    expect(at('q=%20Markarth%20&subcategory=solitude%20desk&from=2026-09-01&to=2026-09-30'))
      .toMatchObject({ q: 'Markarth', subcategory: 'solitude desk', from: '2026-09-01', to: '2026-09-30' });
  });

  it('ignores what it cannot use instead of refusing', () => {
    expect(at(`q=${'x'.repeat(81)}&from=yesterday&to=2026-13-45&severity=dire`))
      .toMatchObject({ q: null, from: null, to: null, severity: null });
  });

  it('binds every value and treats wildcards literally', () => {
    expect(escapeLike('100%_off\\')).toBe('100\\%\\_off\\\\');
    const { sql, values } = reportsWhere(at('q=100%25&category=Military&to=2026-09-30'));
    expect(sql).toContain("lower(title) LIKE ? ESCAPE '\\'");
    expect(sql).not.toContain('100');
    expect(values).toEqual(['Military', '%100\\%%', '%100\\%%', '2026-10-01T00:00:00']);
  });

  it('builds no WHERE at all for an unfiltered register', () => {
    expect(reportsWhere(at(''))).toEqual({ sql: '', values: [] });
  });
});

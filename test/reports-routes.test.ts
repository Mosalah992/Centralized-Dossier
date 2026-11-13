import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { refuseWithoutReportsWrit, reportsJson } from '../functions/lib/reports';
import { REPORTS_SCOPE, SOLAR_SCOPE, issueWrit } from '../functions/lib/session';
import { isReportId } from '../shared/reports';

const SECRET = 'reports-cookie-secret';
const env = { REPORTS_COOKIE_SECRET: SECRET, REPORTS_EPOCH: '1' };

const isPrivate = (response: Response) => {
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('vary')).toBe('Cookie');
};

describe('Reports responses', () => {
  it('are private and uncached at every status', () => {
    for (const status of [200, 401, 404, 503]) isPrivate(reportsJson({}, status));
  });

  it('refuse without a writ, carry no filing data, and stay private', async () => {
    const refusal = await refuseWithoutReportsWrit(env, null);
    expect(refusal?.status).toBe(401);
    isPrivate(refusal!);
    expect(JSON.stringify(await refusal!.json())).not.toMatch(/reports|body|title/);
  });

  it('fail closed without the signing secret', async () => {
    const refusal = await refuseWithoutReportsWrit({ REPORTS_COOKIE_SECRET: '' }, null);
    expect(refusal?.status).toBe(503);
    isPrivate(refusal!);
  });

  it('admit a Reports writ and refuse a Solar one', async () => {
    expect(await refuseWithoutReportsWrit(env, await issueWrit(SECRET, 1, REPORTS_SCOPE))).toBeNull();
    expect((await refuseWithoutReportsWrit(env, await issueWrit(SECRET, 1, SOLAR_SCOPE)))?.status).toBe(401);
  });

  it('accept Discord ids and the Scribe\'s ids, and nothing else', () => {
    for (const id of ['1234567890123456789', '123', 'scribe-1', 'scribe-41', 'scribe-12345678']) {
      expect(isReportId(id), id).toBe(true);
    }
    for (const id of ['', 'abc', 'scribe-', 'scribe-0', 'scribe-041', 'scribe-41x', 'scribe-123456789', 'Scribe-41', '../41', '41/']) {
      expect(isReportId(id), id).toBe(false);
    }
  });

  it('one-filing route and browser route share the id check, and the writ still comes first', () => {
    // Pages handlers are typed against the Workers runtime and checked by
    // tsconfig.functions.json, so they are read as source here, not imported.
    const api = readFileSync('functions/api/reports/[id].ts', 'utf8');
    expect(api).toContain('isReportId(id)');
    expect(api).not.toMatch(/\\d\{1,24\}/);
    expect(api.indexOf('refuseWithoutReportsWrit(')).toBeLessThan(api.indexOf('isReportId(id)'));
    expect(readFileSync('web/src/router.ts', 'utf8')).toContain('isReportId(');
  });

  it('are produced only through the shared gate and helper on every route', () => {
    const dir = 'functions/api/reports';
    for (const file of readdirSync(dir).filter((name) => name !== 'gate.ts')) {
      const source = readFileSync(`${dir}/${file}`, 'utf8');
      expect(source, file).toContain('refuseWithoutReportsWrit(');
      expect(source, file).not.toMatch(/new Response\(/);
    }
  });
});

// Pure Reports gate policy. Keeping the decision points here makes the sealed
// route testable without pulling Cloudflare's Pages types into the browser-test
// TypeScript project.

import {
  REPORTS_SCOPE,
  readWrit,
  secretsMatch,
} from './session';
import { REPORT_SEVERITIES, type ReportSeverity } from '../../shared/reports';

export interface AttemptStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export const REPORTS_MAX_ATTEMPTS = 8;
export const REPORTS_ATTEMPT_WINDOW_SECONDS = 600;
export const reportsAttemptKey = (ip: string) => `reports:${ip}`;

export async function reportsThrottled(store: AttemptStore | undefined, ip: string): Promise<boolean> {
  if (!store) return false;
  return Number((await store.get(reportsAttemptKey(ip))) ?? '0') >= REPORTS_MAX_ATTEMPTS;
}

export async function recordReportsFailure(store: AttemptStore | undefined, ip: string): Promise<void> {
  if (!store) return;
  const key = reportsAttemptKey(ip);
  const count = Number((await store.get(key)) ?? '0') + 1;
  await store.put(key, String(count), { expirationTtl: REPORTS_ATTEMPT_WINDOW_SECONDS });
}

export const reportsPassphraseMatches = (secret: string, offered: string, expected: string) =>
  secretsMatch(secret, offered, expected);

export const hasReportsWrit = (secret: string, epoch: number, token: string | null) =>
  readWrit(secret, epoch, token, REPORTS_SCOPE);

/**
 * Every Reports response, whatever its status: private, never stored, and
 * varied by cookie, so no cache anywhere can hand one reader's register to a
 * request that never passed the gate. One helper so a new route cannot forget.
 */
export function reportsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    },
  });
}

export interface ReportsEnv {
  REPORTS_COOKIE_SECRET: string;
  REPORTS_EPOCH?: string;
}

/**
 * The gate, as every Reports route applies it: a refusal to return, or null
 * when the request carries a valid Reports writ. Fails closed without a secret.
 */
export async function refuseWithoutReportsWrit(env: ReportsEnv, cookie: string | null): Promise<Response | null> {
  if (!env.REPORTS_COOKIE_SECRET) {
    return reportsJson({ error: 'Reports are sealed pending the archivist’s key.' }, 503);
  }
  const writ = await hasReportsWrit(env.REPORTS_COOKIE_SECRET, Number(env.REPORTS_EPOCH ?? '1'), cookie);
  return writ ? null : reportsJson({ error: 'Reports are sealed under their own word.' }, 401);
}

export interface ReportsQuery {
  category: string | null;
  severity: ReportSeverity | null;
  cursor: { timestamp: string; id: string } | null;
  /** Free text, 1–80 characters after trimming. */
  q: string | null;
  subcategory: string | null;
  /** Inclusive calendar dates, YYYY-MM-DD. */
  from: string | null;
  to: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string | null): string | null =>
  value && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : null;

/**
 * Parses the reader's filters and the opaque, time-and-id cursor. Anything
 * malformed is IGNORED rather than refused: a stale or hand-edited link should
 * still open the register, only less filtered, and nothing here can widen what
 * a writ already admits.
 */
export function parseReportsQuery(url: URL): ReportsQuery {
  const params = url.searchParams;
  const category = params.get('category');
  const rawSeverity = params.get('severity');
  const severity = (REPORT_SEVERITIES as readonly string[]).includes(rawSeverity ?? '')
    ? rawSeverity as ReportSeverity
    : null;
  const q = (params.get('q') ?? '').trim();
  const subcategory = (params.get('subcategory') ?? '').trim();
  const filters = {
    category,
    severity,
    q: q.length >= 1 && q.length <= 80 ? q : null,
    subcategory: subcategory && subcategory.length <= 80 ? subcategory : null,
    from: validDate(params.get('from')),
    to: validDate(params.get('to')),
  };

  const raw = params.get('cursor');
  if (!raw) return { ...filters, cursor: null };
  const at = raw.lastIndexOf('|');
  const timestamp = raw.slice(0, at);
  const id = raw.slice(at + 1);
  if (at < 1 || !timestamp || !/^\d+$/.test(id)) return { ...filters, cursor: null };
  return { ...filters, cursor: { timestamp, id } };
}

/** LIKE treats % and _ as wildcards; a reader searching "100%" means the text. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * The WHERE clause for a query, as SQL text and bound values. Every value is a
 * bound parameter; the only text spliced into the SQL is fixed here.
 */
export function reportsWhere(query: ReportsQuery): { sql: string; values: string[] } {
  const clauses: string[] = [];
  const values: string[] = [];
  if (query.category) { clauses.push('category = ?'); values.push(query.category); }
  if (query.subcategory) { clauses.push('subcategory = ?'); values.push(query.subcategory); }
  if (query.severity) { clauses.push('severity = ?'); values.push(query.severity); }
  if (query.q) {
    const term = `%${escapeLike(query.q.toLowerCase())}%`;
    clauses.push("(lower(title) LIKE ? ESCAPE '\\' OR lower(body) LIKE ? ESCAPE '\\')");
    values.push(term, term);
  }
  // Timestamps are ISO strings, so dates compare as prefixes. The upper bound
  // is the start of the following day, which is what keeps `to` inclusive.
  if (query.from) { clauses.push('timestamp >= ?'); values.push(`${query.from}T00:00:00`); }
  if (query.to) {
    const next = new Date(Date.parse(`${query.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    clauses.push('timestamp < ?');
    values.push(`${next}T00:00:00`);
  }
  if (query.cursor) {
    clauses.push('(timestamp < ? OR (timestamp = ? AND id < ?))');
    values.push(query.cursor.timestamp, query.cursor.timestamp, query.cursor.id);
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values };
}

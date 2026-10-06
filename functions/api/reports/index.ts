// GET /api/reports — one page of the sealed register, filtered. Behind the
// Reports writ, private and never stored; see functions/lib/reports.ts.

import { REPORTS_COOKIE_NAME, readCookie } from '../../lib/session';
import {
  parseReportsQuery,
  refuseWithoutReportsWrit,
  reportsJson,
  reportsWhere,
  type ReportsEnv,
} from '../../lib/reports';

interface Env extends ReportsEnv {
  REPORTS?: D1Database;
}

export const REPORT_COLUMNS = 'id, category, subcategory, severity, title, body, timestamp, author_name';

export const toReport = (row: Record<string, unknown>) => ({
  id: String(row.id),
  category: row.category,
  subcategory: row.subcategory,
  severity: row.severity,
  title: row.title,
  body: row.body,
  timestamp: row.timestamp,
  authorName: row.author_name,
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const refusal = await refuseWithoutReportsWrit(env, readCookie(request, REPORTS_COOKIE_NAME));
  if (refusal) return refusal;

  const limit = 30;
  try {
    const { sql, values } = reportsWhere(parseReportsQuery(new URL(request.url)));
    const statement = env.REPORTS?.prepare(
      `SELECT ${REPORT_COLUMNS} FROM reports${sql} ORDER BY timestamp DESC, id DESC LIMIT ${limit}`,
    ).bind(...values);
    const { results = [] } = await statement?.all<Record<string, unknown>>() ?? {};
    const reports = results.map(toReport);
    const last = reports[reports.length - 1];
    return reportsJson({ reports, nextCursor: reports.length === limit && last ? `${last.timestamp}|${last.id}` : null });
  } catch {
    // Optional infrastructure must not turn a sealed, authenticated route into
    // an error page while D1 is being migrated or restored.
    return reportsJson({ reports: [], nextCursor: null });
  }
};

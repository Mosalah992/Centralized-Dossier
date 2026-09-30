// The Reports reader is deliberately data-empty during the gate-only feature.
// Keeping the real endpoint server-side now proves that no data will be added
// to the browser bundle when D1 ingestion and the book UI arrive later.

import { REPORTS_COOKIE_NAME, readCookie } from '../../lib/session';
import { hasReportsWrit } from '../../lib/reports';
import { parseReportsQuery } from '../../lib/reports';

interface Env {
  REPORTS_COOKIE_SECRET: string;
  REPORTS_EPOCH?: string;
  REPORTS?: D1Database;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.REPORTS_COOKIE_SECRET) {
    return json({ error: 'Reports are sealed pending the archivist’s key.' }, 503);
  }

  const writ = await hasReportsWrit(
    env.REPORTS_COOKIE_SECRET,
    Number(env.REPORTS_EPOCH ?? '1'),
    readCookie(request, REPORTS_COOKIE_NAME),
  );
  if (!writ) return json({ error: 'Reports are sealed under their own word.' }, 401);

  const { category, severity, cursor } = parseReportsQuery(new URL(request.url));
  const limit = 30;
  try {
    const clauses: string[] = [];
    const values: string[] = [];
    if (category) { clauses.push('category = ?'); values.push(category); }
    if (severity) { clauses.push('severity = ?'); values.push(severity); }
    if (cursor) {
      clauses.push('(timestamp < ? OR (timestamp = ? AND id < ?))');
      values.push(cursor.timestamp, cursor.timestamp, cursor.id);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const statement = env.REPORTS?.prepare(
      `SELECT id, category, subcategory, severity, title, body, timestamp, author_name FROM reports${where} ORDER BY timestamp DESC, id DESC LIMIT ${limit}`,
    ).bind(...values);
    const { results = [] } = await statement?.all<Record<string, unknown>>() ?? {};
    const reports = results.map((row) => ({
      id: String(row.id),
      category: row.category,
      subcategory: row.subcategory,
      severity: row.severity,
      title: row.title,
      body: row.body,
      timestamp: row.timestamp,
      authorName: row.author_name,
    }));
    const last = reports[reports.length - 1];
    return json({ reports, nextCursor: reports.length === limit && last ? `${last.timestamp}|${last.id}` : null });
  } catch {
    // Optional infrastructure must not turn a sealed, authenticated route into
    // an error page while D1 is being migrated or restored.
    return json({ reports: [], nextCursor: null });
  }
};

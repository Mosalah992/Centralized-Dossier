// The Reports reader is deliberately data-empty during the gate-only feature.
// Keeping the real endpoint server-side now proves that no data will be added
// to the browser bundle when D1 ingestion and the book UI arrive later.

import { REPORTS_COOKIE_NAME, readCookie } from '../../lib/session';
import { hasReportsWrit } from '../../lib/reports';

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

  const category = new URL(request.url).searchParams.get('category');
  try {
    const statement = category
      ? env.REPORTS?.prepare(`SELECT id, category, subcategory, title, body, timestamp, author_name FROM reports WHERE category = ? ORDER BY timestamp DESC, id DESC LIMIT 100`).bind(category)
      : env.REPORTS?.prepare(`SELECT id, category, subcategory, title, body, timestamp, author_name FROM reports ORDER BY timestamp DESC, id DESC LIMIT 100`);
    const { results = [] } = await statement?.all<Record<string, unknown>>() ?? {};
    return json({ reports: results.map((row) => ({
      id: row.id,
      category: row.category,
      subcategory: row.subcategory,
      title: row.title,
      body: row.body,
      timestamp: row.timestamp,
      authorName: row.author_name,
    })) });
  } catch {
    // Optional infrastructure must not turn a sealed, authenticated route into
    // an error page while D1 is being migrated or restored.
    return json({ reports: [] });
  }
};

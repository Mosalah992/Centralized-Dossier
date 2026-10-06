// GET /api/reports/summary — counts only, for the head of the dossier: filings
// by desk and classification, all time and this week, and which desks have
// filed without a classification in the last thirty days. No filing text.
//
// Computed per request. At this volume three GROUP BYs are cheap, and keeping
// no shared cache means nothing behind the gate is ever held at an edge.

import { REPORTS_COOKIE_NAME, readCookie } from '../../lib/session';
import { refuseWithoutReportsWrit, reportsJson, type ReportsEnv } from '../../lib/reports';

interface Env extends ReportsEnv {
  REPORTS?: D1Database;
}

const DAY_MS = 86_400_000;
const since = (days: number, now = Date.now()) => new Date(now - days * DAY_MS).toISOString();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const refusal = await refuseWithoutReportsWrit(env, readCookie(request, REPORTS_COOKIE_NAME));
  if (refusal) return refusal;

  const empty = { total: [], week: [], desks: [] };
  const database = env.REPORTS;
  if (!database) return reportsJson(empty);

  try {
    const [total, week, desks] = await database.batch<Record<string, unknown>>([
      database.prepare('SELECT category, severity, COUNT(*) AS count FROM reports GROUP BY category, severity'),
      database.prepare('SELECT category, severity, COUNT(*) AS count FROM reports WHERE timestamp >= ? GROUP BY category, severity')
        .bind(since(7)),
      database.prepare(`SELECT category, subcategory, COUNT(*) AS filed,
          SUM(CASE WHEN severity = 'unassessed' THEN 1 ELSE 0 END) AS unassessed
        FROM reports WHERE timestamp >= ? GROUP BY category, subcategory
        ORDER BY unassessed DESC, filed DESC`).bind(since(30)),
    ]);
    const counts = (rows: Record<string, unknown>[] = []) => rows.map((row) => ({
      category: String(row.category),
      severity: String(row.severity),
      count: Number(row.count),
    }));
    return reportsJson({
      total: counts(total?.results),
      week: counts(week?.results),
      desks: (desks?.results ?? []).map((row) => ({
        category: String(row.category),
        subcategory: row.subcategory === null ? null : String(row.subcategory),
        filed: Number(row.filed),
        unassessed: Number(row.unassessed),
      })),
    });
  } catch {
    return reportsJson(empty);
  }
};

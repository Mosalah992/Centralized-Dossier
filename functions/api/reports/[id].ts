// GET /api/reports/:id — one filing, so a reader can be sent straight to it.
// Same writ, same private/no-store contract as the register itself.

import { REPORTS_COOKIE_NAME, readCookie } from '../../lib/session';
import { refuseWithoutReportsWrit, reportsJson, type ReportsEnv } from '../../lib/reports';
import { REPORT_COLUMNS, toReport } from './index';

interface Env extends ReportsEnv {
  REPORTS?: D1Database;
}

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const refusal = await refuseWithoutReportsWrit(env, readCookie(request, REPORTS_COOKIE_NAME));
  if (refusal) return refusal;

  const id = String(params.id ?? '');
  // Filing ids are Discord message ids. Anything else cannot exist, and is
  // refused before it reaches the database.
  if (!/^\d{1,24}$/.test(id)) return reportsJson({ error: 'No such filing.' }, 404);

  try {
    const row = await env.REPORTS?.prepare(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? reportsJson({ report: toReport(row) }) : reportsJson({ error: 'No such filing.' }, 404);
  } catch {
    return reportsJson({ error: 'No such filing.' }, 404);
  }
};

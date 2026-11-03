// GET /api/filings/:id: one filing's fields, for the reader's browser to draw
// as its parchment (web/src/views/Filing.tsx, the page the bot's posts link
// to). Nothing is drawn here: the drawing is the browser's.
//
// Who may read it follows where it was filed:
//   a Bulletin Post        anyone, as the board is public (until it is Denied)
//   a report               the Cabinet's readers (Reports writ) or High Command (Solar writ)
//   an Application or a Public Request    High Command, at the Clerk Table (Solar writ)
//
// A sealed filing the reader may not see is answered exactly as a number that
// was never filed, and privately: a sealed answer is never cached.

import { CATEGORY_INFO, type FilingView } from '../../../shared/filing';
import { hasReportsWrit } from '../../lib/reports';
import { parchmentOf } from '../../lib/scribe';
import { REPORTS_COOKIE_NAME, SOLAR_COOKIE_NAME, readCookie } from '../../lib/session';
import { hasSolarWrit, solarEpoch } from '../../lib/solar';
import type { ScribeEnv } from '../../lib/scribe-env';
import { d1FilingStore } from '../../lib/scribe-d1';

interface Env extends ScribeEnv {
  REPORTS_COOKIE_SECRET?: string;
  REPORTS_EPOCH?: string;
  SOLAR_COOKIE_SECRET?: string;
  SOLAR_EPOCH?: string;
}

const PRIVATE = { 'cache-control': 'private, no-store', vary: 'Cookie' };

const refuse = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { 'content-type': 'application/json; charset=utf-8', ...PRIVATE } });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.REPORTS) return refuse(503, 'The Scribe Table is not yet consecrated.');
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return refuse(404, 'No filing is entered under that number.');

  const found = await d1FilingStore(env.REPORTS).get(id);
  if (!found) return refuse(404, 'No filing is entered under that number.');

  const to = CATEGORY_INFO[found.filing.category].destination.kind;
  const shown = to === 'board' && found.stamp?.mark !== 'denied';
  if (!shown) {
    const solar =
      env.SOLAR_COOKIE_SECRET && (await hasSolarWrit(env.SOLAR_COOKIE_SECRET, solarEpoch(env), readCookie(request, SOLAR_COOKIE_NAME)));
    const cabinet =
      to === 'cabinet' &&
      env.REPORTS_COOKIE_SECRET &&
      (await hasReportsWrit(env.REPORTS_COOKIE_SECRET, Number(env.REPORTS_EPOCH ?? '1'), readCookie(request, REPORTS_COOKIE_NAME)));
    // Not found rather than forbidden, as the Cabinet answers: a sealed filing's number says nothing.
    if (!solar && !cabinet) return refuse(404, 'No filing is entered under that number.');
  }

  const view: FilingView = { id, destination: to, filedAt: found.filedAt, parchment: parchmentOf(found) };
  // A public notice may be cached briefly; a Denial takes it down within the minute.
  return Response.json(view, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(shown ? { 'cache-control': 'public, max-age=60' } : PRIVATE),
    },
  });
};

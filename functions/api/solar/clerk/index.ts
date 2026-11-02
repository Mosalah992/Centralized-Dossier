// GET /api/solar/clerk: the Clerk Table's filings, waiting and lately stamped.
// Behind the Solar writ, private and uncached like every Solar answer.

import { clerkTable } from '../../../lib/clerk';
import { d1FilingStore } from '../../../lib/scribe-d1';
import { SOLAR_COOKIE_NAME, readCookie } from '../../../lib/session';
import { refuseWithoutSolarWrit, solarJson, type SolarEnv } from '../../../lib/solar';

interface Env extends SolarEnv {
  REPORTS?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const refusal = await refuseWithoutSolarWrit(env, readCookie(request, SOLAR_COOKIE_NAME));
  if (refusal) return refusal;
  if (!env.REPORTS) return solarJson({ error: 'The Clerk Table is not yet consecrated.' }, 503);
  return solarJson(await clerkTable(d1FilingStore(env.REPORTS)));
};

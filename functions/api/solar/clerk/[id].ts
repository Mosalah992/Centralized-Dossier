// POST /api/solar/clerk/:id { mark: 'approved' | 'denied' }: press the stamp.
// The parchment bears it whenever it is next drawn, and the bot posts the
// verdict to the filing's channel, linking to the stamped parchment.
// Behind the Solar writ; same-site JSON only, as every Solar write.

import { STAMP_MARKS, type StampMark } from '../../../../shared/filing';
import { clerkFiling } from '../../../lib/clerk';
import { announceStamp, stampFiling } from '../../../lib/scribe';
import { scribeDeps, type ScribeEnv } from '../../../lib/scribe-env';
import { SOLAR_COOKIE_NAME, readCookie } from '../../../lib/session';
import { refuseForeignWrite, refuseWithoutSolarWrit, solarJson, type SolarEnv } from '../../../lib/solar';

type Env = SolarEnv & ScribeEnv;

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  const refusal = (await refuseWithoutSolarWrit(env, readCookie(request, SOLAR_COOKIE_NAME))) ?? refuseForeignWrite(request);
  if (refusal) return refusal;
  if (!env.REPORTS) return solarJson({ error: 'The Clerk Table is not yet consecrated.' }, 503);

  const id = Number(params.id);
  let mark: unknown;
  try {
    mark = ((await request.json()) as { mark?: unknown }).mark;
  } catch {
    // Unreadable is simply no stamp.
  }
  if (!Number.isInteger(id) || id < 1) return solarJson({ error: 'No filing is entered under that number.' }, 404);
  if (!(STAMP_MARKS as readonly unknown[]).includes(mark)) return solarJson({ error: 'Approved or Denied: no other stamp is kept.' }, 422);

  const deps = scribeDeps({ ...env, REPORTS: env.REPORTS }, new URL(request.url).origin);
  const stamped = await stampFiling(deps, id, mark as StampMark);
  if (!stamped.ok) return solarJson({ error: stamped.error }, stamped.status);
  waitUntil(announceStamp(deps, stamped.record).catch((error) => console.warn('scribe: verdict not posted', id, error)));
  return solarJson(clerkFiling(stamped.record));
};

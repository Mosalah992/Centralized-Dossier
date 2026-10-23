// The Solar's gate, at Ancarion's plate: GET says whether the reader holds the
// Solar writ, POST tries a word, DELETE gives the writ back. The same shape as
// the Reports gate, under the Solar's own word, secret, cookie and throttle.

import { SOLAR_COOKIE_NAME, SOLAR_SCOPE, clearedCookie, issueWrit, readCookie, writCookie } from '../../lib/session';
import {
  SOLAR_SEALED,
  hasSolarWrit,
  recordSolarFailure,
  solarEpoch,
  solarJson,
  solarPassphraseMatches,
  solarThrottled,
  type SolarEnv,
} from '../../lib/solar';

export const onRequest: PagesFunction<SolarEnv> = async ({ request, env }) => {
  if (!env.SOLAR_COOKIE_SECRET || !env.SOLAR_PASSPHRASE) return solarJson({ error: SOLAR_SEALED }, 503);
  const epoch = solarEpoch(env);

  if (request.method === 'GET') {
    const writ = await hasSolarWrit(env.SOLAR_COOKIE_SECRET, epoch, readCookie(request, SOLAR_COOKIE_NAME));
    return solarJson({ open: Boolean(writ) });
  }

  if (request.method === 'DELETE') {
    return solarJson({ open: false }, 200, { 'set-cookie': clearedCookie(SOLAR_COOKIE_NAME) });
  }

  if (request.method !== 'POST') return solarJson({ error: 'Method not permitted.' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await solarThrottled(env.GATE_ATTEMPTS, ip)) {
    return solarJson({ error: 'Ancarion will hear no further words for a time.' }, 429);
  }

  let offered = '';
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    if (typeof body.passphrase === 'string') offered = body.passphrase;
  } catch {
    // Malformed is simply incorrect.
  }

  if (!(await solarPassphraseMatches(env.SOLAR_COOKIE_SECRET, offered, env.SOLAR_PASSPHRASE))) {
    await recordSolarFailure(env.GATE_ATTEMPTS, ip);
    return solarJson({ error: 'The Solar stays shut. That word is not recorded.' }, 401);
  }

  const token = await issueWrit(env.SOLAR_COOKIE_SECRET, epoch, SOLAR_SCOPE);
  return solarJson({ open: true }, 200, { 'set-cookie': writCookie(token, SOLAR_COOKIE_NAME) });
};

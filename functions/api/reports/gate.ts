// Reports has its own word, signing secret, cookie and throttle namespace. It
// shares only the KV binding with the Chronicle gate; a successful writ for
// either volume is useless at the other door.

import {
  REPORTS_COOKIE_NAME,
  REPORTS_SCOPE,
  clearedCookie,
  issueWrit,
  readCookie,
  readWrit,
  secretsMatch,
  writCookie,
} from '../../lib/session';
import {
  recordReportsFailure,
  reportsPassphraseMatches,
  reportsThrottled,
} from '../../lib/reports';

interface Env {
  REPORTS_COOKIE_SECRET: string;
  REPORTS_PASSPHRASE: string;
  REPORTS_EPOCH?: string;
  GATE_ATTEMPTS?: KVNamespace;
}


function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      vary: 'Cookie',
      ...extra,
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const epoch = Number(env.REPORTS_EPOCH ?? '1');

  if (!env.REPORTS_COOKIE_SECRET || !env.REPORTS_PASSPHRASE) {
    return json({ error: 'Reports are sealed pending the archivist’s key.' }, 503);
  }

  if (request.method === 'GET') {
    const writ = await readWrit(
      env.REPORTS_COOKIE_SECRET,
      epoch,
      readCookie(request, REPORTS_COOKIE_NAME),
      REPORTS_SCOPE,
    );
    return json({ open: Boolean(writ) });
  }

  if (request.method === 'DELETE') {
    return json({ open: false }, 200, { 'set-cookie': clearedCookie(REPORTS_COOKIE_NAME) });
  }

  if (request.method !== 'POST') return json({ error: 'Method not permitted.' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await reportsThrottled(env.GATE_ATTEMPTS, ip)) {
    return json({ error: 'Reports will hear no further attempts for a time.' }, 429);
  }

  let offered = '';
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    if (typeof body.passphrase === 'string') offered = body.passphrase;
  } catch {
    // Malformed is simply incorrect.
  }

  if (!(await reportsPassphraseMatches(env.REPORTS_COOKIE_SECRET, offered, env.REPORTS_PASSPHRASE))) {
    await recordReportsFailure(env.GATE_ATTEMPTS, ip);
    return json({ error: 'The seal holds. That word is not recorded.' }, 401);
  }

  const token = await issueWrit(env.REPORTS_COOKIE_SECRET, epoch, REPORTS_SCOPE);
  return json({ open: true }, 200, {
    'set-cookie': writCookie(token, REPORTS_COOKIE_NAME),
  });
};

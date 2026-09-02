// Thalmor Chronicles keeps its own door, and it is now the only door in the
// archive.
//
//   POST   /api/chronicle/gate  { passphrase }  -> sets the volume writ
//   GET    /api/chronicle/gate                  -> { open: boolean }
//   DELETE /api/chronicle/gate                  -> closes the volume again
//
// THIS USED TO BE THE SECOND OF TWO LOCKS IN SERIES. The archive's own gate ran
// in api/_middleware.ts and had already established that the caller was a
// member before this route would so much as consider a word. That gate is gone
// — the registers are public — so this word is no longer the inner of two but
// the whole of the check, standing on its own in front of the open internet.
//
// Two things follow, and both are why the throttle below is not optional
// decoration any more. Every guess now comes from anyone at all rather than
// from someone already admitted, and there is nothing in front of this route to
// slow them down. GATE_ATTEMPTS still fails open when unbound (see
// wrangler.toml), which was a defensible trade behind a gate and is a weaker
// one here.

import {
  CHRONICLE_COOKIE_NAME,
  clearedCookie,
  issueWrit,
  readCookie,
  readWrit,
  secretsMatch,
  writCookie,
} from '../../lib/session';

interface Env {
  GATE_SECRET: string;
  /** The volume's own word. Distinct from GATE_PASSPHRASE. */
  CHRONICLE_PASSPHRASE: string;
  GATE_EPOCH?: string;
  /** Optional. Bound in wrangler.toml; absent means no throttling. */
  GATE_ATTEMPTS?: KVNamespace;
}

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 600;

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

// Keyed `chronicle:` rather than bare, which is a leftover from when the
// archive gate counted its own attempts under `gate:` in the same namespace.
// Kept as it is: the prefix costs nothing and old keys age out on their own.
async function throttled(env: Env, ip: string): Promise<boolean> {
  if (!env.GATE_ATTEMPTS) return false;
  const count = Number((await env.GATE_ATTEMPTS.get(`chronicle:${ip}`)) ?? '0');
  return count >= MAX_ATTEMPTS;
}

async function recordFailure(env: Env, ip: string): Promise<void> {
  if (!env.GATE_ATTEMPTS) return;
  const key = `chronicle:${ip}`;
  const count = Number((await env.GATE_ATTEMPTS.get(key)) ?? '0') + 1;
  await env.GATE_ATTEMPTS.put(key, String(count), { expirationTtl: WINDOW_SECONDS });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const epoch = Number(env.GATE_EPOCH ?? '1');

  if (!env.GATE_SECRET || !env.CHRONICLE_PASSPHRASE) {
    return json({ error: 'The volume is sealed pending the warden’s key.' }, 503);
  }

  if (request.method === 'GET') {
    const writ = await readWrit(
      env.GATE_SECRET,
      epoch,
      readCookie(request, CHRONICLE_COOKIE_NAME),
    );
    return json({ open: Boolean(writ) });
  }

  if (request.method === 'DELETE') {
    return json({ open: false }, 200, { 'set-cookie': clearedCookie(CHRONICLE_COOKIE_NAME) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not permitted.' }, 405);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await throttled(env, ip)) {
    return json({ error: 'The volume will hear no further attempts for a time.' }, 429);
  }

  let offered = '';
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    if (typeof body.passphrase === 'string') offered = body.passphrase;
  } catch {
    // A malformed body is simply a wrong word.
  }

  if (!(await secretsMatch(env.GATE_SECRET, offered, env.CHRONICLE_PASSPHRASE))) {
    await recordFailure(env, ip);
    return json({ error: 'The wax holds. That word is not recorded.' }, 401);
  }

  const token = await issueWrit(env.GATE_SECRET, epoch);
  return json({ open: true }, 200, {
    'set-cookie': writCookie(token, CHRONICLE_COOKIE_NAME),
  });
};

// Thalmor Chronicles keeps its own door.
//
//   POST   /api/chronicle/gate  { passphrase }  -> sets the volume writ
//   GET    /api/chronicle/gate                  -> { open: boolean }
//   DELETE /api/chronicle/gate                  -> closes the volume again
//
// This route is NOT in the middleware's PUBLIC_PATHS, and that is the point:
// unlike /api/gate, a caller must already hold an archive writ before the
// volume will so much as consider a word. Two locks in series, not in parallel.
//
// The writ it issues is scoped to 'chronicle' and lives in its own cookie, so
// closing this volume does not put the reader back out on the street, and
// holding a writ for the archive does not open the volume.

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

// Counted separately from the archive gate's attempts, so guessing at the
// volume cannot lock a member out of the archive itself, nor the reverse.
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
      'chronicle',
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

  const token = await issueWrit(env.GATE_SECRET, epoch, 'chronicle');
  return json({ open: true }, 200, {
    'set-cookie': writCookie(token, CHRONICLE_COOKIE_NAME),
  });
};

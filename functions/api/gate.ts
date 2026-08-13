// POST   /api/gate  { passphrase }  -> sets the writ cookie
// GET    /api/gate                  -> { open: boolean }, so the SPA can skip the gate
// DELETE /api/gate                  -> clears the writ

import {
  COOKIE_NAME,
  clearedCookie,
  issueWrit,
  readCookie,
  readWrit,
  secretsMatch,
  writCookie,
} from "../lib/session";

interface Env {
  GATE_SECRET: string;
  GATE_PASSPHRASE: string;
  GATE_EPOCH?: string;
  /** Optional KV namespace. Bind one to get attempt throttling. */
  GATE_ATTEMPTS?: KVNamespace;
}

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 600;

function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "Cookie",
      ...extra,
    },
  });
}

async function throttled(env: Env, ip: string): Promise<boolean> {
  if (!env.GATE_ATTEMPTS) return false;
  const count = Number((await env.GATE_ATTEMPTS.get(`gate:${ip}`)) ?? "0");
  return count >= MAX_ATTEMPTS;
}

async function recordFailure(env: Env, ip: string): Promise<void> {
  if (!env.GATE_ATTEMPTS) return;
  const key = `gate:${ip}`;
  const count = Number((await env.GATE_ATTEMPTS.get(key)) ?? "0") + 1;
  await env.GATE_ATTEMPTS.put(key, String(count), { expirationTtl: WINDOW_SECONDS });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const epoch = Number(env.GATE_EPOCH ?? "1");

  if (!env.GATE_SECRET || !env.GATE_PASSPHRASE) {
    return json({ error: "The archive is sealed pending the warden's key." }, 503);
  }

  if (request.method === "GET") {
    const writ = await readWrit(env.GATE_SECRET, epoch, readCookie(request, COOKIE_NAME));
    return json({ open: Boolean(writ) });
  }

  if (request.method === "DELETE") {
    return json({ open: false }, 200, { "set-cookie": clearedCookie() });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not permitted." }, 405);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await throttled(env, ip)) {
    return json({ error: "The archive will hear no further attempts for a time." }, 429);
  }

  let offered = "";
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    if (typeof body.passphrase === "string") offered = body.passphrase;
  } catch {
    // fall through to the same generic refusal
  }

  // Cap before hashing so a multi-megabyte body can't be used as a workload.
  const ok =
    offered.length > 0 &&
    offered.length <= 256 &&
    (await secretsMatch(env.GATE_SECRET, offered, env.GATE_PASSPHRASE));

  if (!ok) {
    await recordFailure(env, ip);
    // One refusal for every failure mode — no hints about length or format.
    return json({ error: "The seal holds. That word is not recorded." }, 401);
  }

  const token = await issueWrit(env.GATE_SECRET, epoch);
  return json({ open: true }, 200, { "set-cookie": writCookie(token) });
};

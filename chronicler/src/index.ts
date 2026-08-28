// The chronicler — a Worker that reads the Informants channels once a night.
//
// WHY THIS IS A SEPARATE WORKER AND NOT PART OF THE ARCHIVE. Cron Triggers need
// a `scheduled()` handler, and Pages Functions have no such handler: they are
// request-only, `onRequest*` and nothing else. There is no arrangement of
// functions/ that gets a nightly job, so the job lives here and hands its work
// to the archive through KV, which both projects bind.
//
// WHAT IT DOES NOT DO. It does not write the Chronicles. That volume is
// composed prose — a month's entries are read out of the reports and rewritten,
// not copied from them — and no cron can do that. What this produces is the
// LATEST FILINGS: the raw reports, redacted, dated, and clearly marked as
// unchronicled. They sit after the written months as a holding area, so a
// report filed tonight is readable tomorrow instead of waiting on a human, and
// so the difference between a filing and a chronicle entry stays visible.
//
// IT ONLY EVER READS DISCORD. There is no write path here and there should not
// be one — the same reasoning as the archive's readonly Sheets scope. A bug in
// an unattended nightly job must not be able to post to a channel a hundred
// people are in.

import {
  type Filing,
  type RawMessage,
  identifiersIn,
  toFilings,
} from '../../shared/filings';

interface Env {
  /** Shared with the Pages project, which reads what this writes. */
  CHRONICLE_FILINGS: KVNamespace;
  /** Set with `wrangler secret put DISCORD_BOT_TOKEN`. */
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID: string;
  INFORMANTS_CATEGORY_ID: string;
}

/** How many filings the volume holds. Older ones fall off the end. */
const KEEP = 60;

const CURSOR = 'cursor';
const FILINGS = 'filings';

/**
 * The cursor is per channel, and it is the whole reason this stays cheap.
 *
 * Discord's `after` takes a message id, so each nightly run asks a channel only
 * for what arrived since the last one. Without it every run would walk fifty
 * channels back to April — about 2700 messages — to find the six that are new,
 * every night, forever.
 */
type Cursor = Record<string, string>;

async function api<T>(token: string, pathname: string, attempt = 0): Promise<T | null> {
  const res = await fetch(`https://discord.com/api/v10${pathname}`, {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': 'ThalmorArchives/1.0' },
  });

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
    const wait = body.retry_after ?? 1;
    // A nightly job can afford to wait; it cannot afford to hammer.
    await new Promise((r) => setTimeout(r, Math.min(wait + 0.2, 30) * 1000));
    return attempt < 3 ? api<T>(token, pathname, attempt + 1) : null;
  }

  // 403/404 is expected and survivable — the bot may sit in the category
  // without read access to every channel under it. A gap is not a failure.
  if (res.status === 403 || res.status === 404) return null;

  if (!res.ok) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return api<T>(token, pathname, attempt + 1);
    }
    return null;
  }

  return (await res.json()) as T;
}

/**
 * Everything filed in one channel since we last looked.
 *
 * A FIRST RUN TAKES ONLY THE MOST RECENT PAGE, deliberately. With no cursor
 * there is nothing to page forward from, and walking the whole history would
 * import four months of back catalogue into a list whose entire purpose is to
 * be the tail. That back catalogue is already in docs/informant-reports.md.
 */
async function since(
  token: string,
  channelId: string,
  after: string | undefined,
): Promise<RawMessage[] | null> {
  if (!after) {
    return api<RawMessage[]>(token, `/channels/${channelId}/messages?limit=50`);
  }

  const out: RawMessage[] = [];
  let cursor = after;

  for (let page = 0; page < 10; page++) {
    const batch = await api<RawMessage[]>(
      token,
      `/channels/${channelId}/messages?limit=100&after=${cursor}`,
    );
    if (batch === null) return out.length ? out : null;
    if (batch.length === 0) break;

    out.push(...batch);
    // `after` returns NEWEST first, so the next step forward is the newest of
    // this batch — element 0, not the last one.
    const newest = batch[0];
    if (!newest) break;
    cursor = newest.id;
    if (batch.length < 100) break;
  }

  return out;
}

export interface RunResult {
  added: number;
  dropped: number;
  scanned: number;
  skipped: number;
}

export async function collect(env: Env): Promise<RunResult> {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    // Fails quiet, like the archive's optional Discord door. A missing token
    // means the list stops growing; it must not mean the volume breaks.
    console.warn('chronicler: no DISCORD_BOT_TOKEN — nothing collected');
    return { added: 0, dropped: 0, scanned: 0, skipped: 0 };
  }

  const channels = await api<
    { id: string; name: string; type: number; parent_id: string | null }[]
  >(token, `/guilds/${env.DISCORD_GUILD_ID}/channels`);
  if (!channels) return { added: 0, dropped: 0, scanned: 0, skipped: 0 };

  const reportChannels = channels.filter(
    (c) => c.parent_id === env.INFORMANTS_CATEGORY_ID && (c.type === 0 || c.type === 5),
  );

  const cursor = ((await env.CHRONICLE_FILINGS.get(CURSOR, 'json')) as Cursor | null) ?? {};
  const held = ((await env.CHRONICLE_FILINGS.get(FILINGS, 'json')) as Filing[] | null) ?? [];
  const known = new Set(held.map((f) => f.id));

  const fresh: Filing[] = [];
  let dropped = 0;
  let scanned = 0;
  let skipped = 0;

  for (const channel of reportChannels) {
    const messages = await since(token, channel.id, cursor[channel.id]);
    if (messages === null) {
      skipped++;
      continue;
    }
    if (messages.length === 0) continue;

    scanned += messages.length;

    // The identifier set is built from THIS batch — the people who wrote and
    // were mentioned in exactly the messages about to be redacted.
    const secrets = identifiersIn(messages);
    const agent = channel.name.replace(/-reports?$/, '');
    const { filings, dropped: lost } = toFilings(messages, agent, secrets);

    dropped += lost;
    for (const f of filings) if (!known.has(f.id)) fresh.push(f);

    // Advance to the newest message SEEN, not the newest published. A report
    // dropped for failing redaction must not be re-fetched every night forever.
    const newest = messages.reduce((a, b) => (BigInt(a.id) > BigInt(b.id) ? a : b));
    cursor[channel.id] = newest.id;
  }

  if (fresh.length) {
    const merged = [...fresh, ...held]
      // Snowflakes sort chronologically, and they are the only ordering here
      // that does not depend on a timestamp a client could have set.
      .sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1))
      .slice(0, KEEP);
    await env.CHRONICLE_FILINGS.put(FILINGS, JSON.stringify(merged));
  }

  await env.CHRONICLE_FILINGS.put(CURSOR, JSON.stringify(cursor));
  await env.CHRONICLE_FILINGS.put(
    'last-run',
    JSON.stringify({ at: new Date().toISOString(), added: fresh.length, dropped, skipped }),
  );

  return { added: fresh.length, dropped, scanned, skipped };
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      collect(env).then((r) => {
        console.log(
          `chronicler: ${r.added} new filing(s) from ${r.scanned} message(s); `
          + `${r.dropped} dropped in redaction, ${r.skipped} channel(s) unreadable`,
        );
      }),
    );
  },

  /*
   * A fetch handler so the job can be run on demand and its state read.
   *
   * This Worker has NO ROUTE, so it is reachable only at its workers.dev
   * address, and it answers nothing but a summary — counts and a timestamp.
   * The filings themselves are never served from here: they are served by the
   * archive, behind two writs. Adding a route or returning KV contents from
   * this handler would publish, without a gate, the thing the gate exists for.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/run' && request.method === 'POST') {
      return Response.json(await collect(env));
    }

    return Response.json({
      ok: true,
      lastRun: await env.CHRONICLE_FILINGS.get('last-run', 'json'),
    });
  },
};

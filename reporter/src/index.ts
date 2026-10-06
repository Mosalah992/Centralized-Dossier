// Scheduled collector for Reports. It can read Discord and write the dedicated
// Reports D1 database; it has no route, never posts to Discord, and never serves
// report text. Pages is the only reader-facing boundary.

import {
  buildFilerIndex,
  filterReportMessage,
  resolveFiler,
  type DiscordReportMessage,
  type FilerIndex,
  type StoredReport,
} from '../../shared/reports';
import { REPORT_CATEGORIES } from './config';
import {
  DISCORD_FORUM_CHANNEL_TYPE,
  DISCORD_TEXT_CHANNEL_TYPES,
  resolveReportSources,
  type DiscordChannel,
} from './sources';

interface Env {
  REPORTS: D1Database;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID: string;
  /** The archive's own public roster endpoint; overridable for a preview. */
  ROSTER_URL?: string;
}

const DEFAULT_ROSTER_URL = 'https://thalmor-archives.com/api/volumes/roster';

/**
 * Handles → in-world names, read once per run from the archive's public roster
 * endpoint: the same data any reader of the site already sees, so the
 * collector needs no Sheets credentials of its own. Null when it cannot be
 * read, which the upsert treats as "keep the names already on record".
 */
async function filerIndex(env: Env): Promise<FilerIndex | null> {
  try {
    const response = await fetch(env.ROSTER_URL ?? DEFAULT_ROSTER_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'ThalmorReports/1.0' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: { members?: { name: string; discord: string[] }[] } };
    const members = body.data?.members;
    return Array.isArray(members) ? buildFilerIndex(members) : null;
  } catch {
    return null;
  }
}

async function discord<T>(token: string, path: string): Promise<T | null> {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': 'ThalmorReports/1.0' },
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

const subcategory = (channel: DiscordChannel, parent: DiscordChannel | undefined): string | null =>
  parent?.id === channel.parent_id ? channel.name.replace(/[-_]+/g, ' ') : null;

async function messagesFor(token: string, channel: DiscordChannel): Promise<DiscordReportMessage[]> {
  if (DISCORD_TEXT_CHANNEL_TYPES.has(channel.type)) {
    return (await discord<DiscordReportMessage[]>(token, `/channels/${channel.id}/messages?limit=100`)) ?? [];
  }
  if (channel.type !== DISCORD_FORUM_CHANNEL_TYPE) return [];

  // Forum reports live in threads. Active threads are the bounded, reliable
  // v1 source; archived-thread pagination can be added without changing D1.
  const active = await discord<{ threads?: DiscordChannel[] }>(token, `/channels/${channel.id}/threads/active`);
  const threads = active?.threads ?? [];
  const pages = await Promise.all(threads.map((thread) =>
    discord<DiscordReportMessage[]>(token, `/channels/${thread.id}/messages?limit=100`),
  ));
  return pages.flatMap((page) => page ?? []);
}

// With the roster read, its answer is the record: a member who has left the
// roster stops signing their filings on the next run. Without it, a run must
// not erase names it simply could not check.
function upsert(database: D1Database, report: StoredReport, rosterRead: boolean): D1PreparedStatement {
  const author = rosterRead ? 'excluded.author_name' : 'COALESCE(excluded.author_name, reports.author_name)';
  return database.prepare(`
    INSERT INTO reports (
      id, category, subcategory, severity, title, body, timestamp,
      source_message_id, source_channel_id, author_name, edited_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      subcategory = excluded.subcategory,
      severity = excluded.severity,
      title = excluded.title,
      body = excluded.body,
      timestamp = excluded.timestamp,
      source_channel_id = excluded.source_channel_id,
      author_name = ${author},
      edited_at = excluded.edited_at
  `).bind(
    report.id, report.category, report.subcategory, report.severity, report.title, report.body,
    report.timestamp, report.sourceMessageId, report.sourceChannelId,
    report.authorName, null,
  );
}

export interface CollectResult {
  scanned: number;
  stored: number;
  dropped: number;
  unavailable: boolean;
  /** Counts only: how many filings were signed, never by whom. */
  attributed?: number;
  rosterRead?: boolean;
}

export async function collectReports(env: Env): Promise<CollectResult> {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) return { scanned: 0, stored: 0, dropped: 0, unavailable: true };

  const channels = await discord<DiscordChannel[]>(token, `/guilds/${env.DISCORD_GUILD_ID}/channels`);
  if (!channels) return { scanned: 0, stored: 0, dropped: 0, unavailable: true };
  const filers = await filerIndex(env);
  const pending: StoredReport[] = [];
  let scanned = 0;
  let dropped = 0;

  for (const category of REPORT_CATEGORIES) {
    const { root, sources } = resolveReportSources(channels, category);
    if (!root) continue;

    for (const source of sources) {
      const messages = await messagesFor(token, source);
      scanned += messages.length;
      for (const message of messages) {
        const filtered = filterReportMessage(message);
        if (!filtered.included) { dropped++; continue; }
        pending.push({
          id: message.id,
          category: category.name,
          subcategory: subcategory(source, source.parent_id === root.id ? root : undefined),
          severity: filtered.severity,
          title: filtered.title,
          body: filtered.text,
          timestamp: message.timestamp,
          sourceMessageId: message.id,
          sourceChannelId: source.id,
          // Only the in-world name the roster gives for this filer leaves
          // memory. The handle it was matched on is never stored.
          authorName: filers ? resolveFiler(message.author, filers) : null,
        });
      }
    }
  }

  if (pending.length) {
    await env.REPORTS.batch(pending.map((report) => upsert(env.REPORTS, report, filers !== null)));
  }
  return {
    scanned,
    stored: pending.length,
    dropped,
    unavailable: false,
    attributed: pending.filter((report) => report.authorName).length,
    rosterRead: filers !== null,
  };
}

export default {
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(collectReports(env).then((result) => console.log('reports collector', result)));
  },
};

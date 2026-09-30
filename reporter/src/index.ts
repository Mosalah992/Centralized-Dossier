// Scheduled collector for Reports. It can read Discord and write the dedicated
// Reports D1 database; it has no route, never posts to Discord, and never serves
// report text. Pages is the only reader-facing boundary.

import { filterReportMessage, type DiscordReportMessage, type StoredReport } from '../../shared/reports';
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

function upsert(database: D1Database, report: StoredReport): D1PreparedStatement {
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
      author_name = excluded.author_name,
      edited_at = excluded.edited_at
  `).bind(
    report.id, report.category, report.subcategory, report.severity, report.title, report.body,
    report.timestamp, report.sourceMessageId, report.sourceChannelId,
    report.authorName, null,
  );
}

export interface CollectResult { scanned: number; stored: number; dropped: number; unavailable: boolean; }

export async function collectReports(env: Env): Promise<CollectResult> {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) return { scanned: 0, stored: 0, dropped: 0, unavailable: true };

  const channels = await discord<DiscordChannel[]>(token, `/guilds/${env.DISCORD_GUILD_ID}/channels`);
  if (!channels) return { scanned: 0, stored: 0, dropped: 0, unavailable: true };
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
          // Discord handles are intentionally neither stored nor exposed.
          authorName: null,
        });
      }
    }
  }

  if (pending.length) await env.REPORTS.batch(pending.map((report) => upsert(env.REPORTS, report)));
  return { scanned, stored: pending.length, dropped, unavailable: false };
}

export default {
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(collectReports(env).then((result) => console.log('reports collector', result)));
  },
};

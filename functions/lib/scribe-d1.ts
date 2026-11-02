// The Scribe's tables in D1 (migrations/0006_scribe.sql), in the
// thalmor-reports database the Cabinet reads, through the REPORTS binding.
// Only routes import this; the policy in codes.ts and scribe.ts sees the
// stores as interfaces, so it is tested without D1.

import { checkIncidentTime, type Filing, type FilingStamp, type IncidentTime } from '../../shared/filing';
import type { CodeHolder, CodeStore } from './codes';
import type { CabinetEntry, Draft, DraftStore, FilingRecord, FilingStore } from './scribe';

export function d1CodeStore(db: D1Database): CodeStore {
  const holder = (row: Record<string, unknown> | null): CodeHolder | null =>
    row ? { id: Number(row.id), discordUserId: String(row.discord_user_id), name: String(row.name ?? '') } : null;
  return {
    async issue(discordUserId, hash, name, now) {
      await db.batch([
        db.prepare('UPDATE codes SET revoked_at = ? WHERE discord_user_id = ? AND revoked_at IS NULL').bind(now, discordUserId),
        db.prepare('INSERT INTO codes (hash, discord_user_id, name, created_at) VALUES (?, ?, ?, ?)').bind(hash, discordUserId, name, now),
      ]);
    },
    async byHash(hash) {
      return holder(await db.prepare('SELECT id, discord_user_id, name FROM codes WHERE hash = ? AND revoked_at IS NULL').bind(hash).first());
    },
    async byId(id) {
      return holder(await db.prepare('SELECT id, discord_user_id, name FROM codes WHERE id = ? AND revoked_at IS NULL').bind(id).first());
    },
    async nameFor(discordUserId) {
      const row = await db
        .prepare('SELECT name FROM codes WHERE discord_user_id = ? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1')
        .bind(discordUserId)
        .first<{ name: string }>();
      return row?.name ?? null;
    },
    async revoke(id, now) {
      await db.prepare('UPDATE codes SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').bind(now, id).run();
    },
  };
}

const COLUMNS =
  'id, category, importance, section, rank, name, superior, title, incident, body, door, filer_discord_id, stamp, stamp_incident, stamped_at, filed_at, discord_channel_id, discord_message_id, report_id';

const parseTime = (text: unknown): IncidentTime | null => {
  try {
    return checkIncidentTime(JSON.parse(String(text)));
  } catch {
    return null;
  }
};

function toRecord(row: Record<string, unknown>): FilingRecord | null {
  const time = parseTime(row.incident);
  if (!time) return null;
  const at = row.stamp ? parseTime(row.stamp_incident) : null;
  const stamp: FilingStamp | null = row.stamp && at ? { mark: row.stamp === 'denied' ? 'denied' : 'approved', at } : null;
  const text = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    id: Number(row.id),
    filing: {
      category: row.category as Filing['category'],
      importance: row.importance as Filing['importance'],
      section: text(row.section) as Filing['section'],
      rank: String(row.rank ?? ''),
      name: String(row.name ?? ''),
      superior: text(row.superior),
      title: String(row.title ?? ''),
      time,
      body: String(row.body ?? ''),
    },
    door: row.door === 'discord' ? 'discord' : 'web',
    filerDiscordId: text(row.filer_discord_id),
    stamp,
    stampedAt: text(row.stamped_at),
    filedAt: String(row.filed_at),
    discordChannelId: text(row.discord_channel_id),
    discordMessageId: text(row.discord_message_id),
    reportId: text(row.report_id),
  };
}

const records = (rows: Record<string, unknown>[] | undefined) =>
  (rows ?? []).map(toRecord).filter((r): r is FilingRecord => r !== null);

export function d1FilingStore(db: D1Database): FilingStore {
  return {
    async insert(filing, door, filerDiscordId, filedAt) {
      const row = await db
        .prepare(
          `INSERT INTO filings (category, importance, section, rank, name, superior, title, incident, body, door, filer_discord_id, filed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        )
        .bind(
          filing.category, filing.importance, filing.section, filing.rank, filing.name, filing.superior,
          filing.title, JSON.stringify(filing.time), filing.body, door, filerDiscordId, filedAt,
        )
        .first<{ id: number }>();
      return Number(row?.id);
    },
    async get(id) {
      const row = await db.prepare(`SELECT ${COLUMNS} FROM filings WHERE id = ?`).bind(id).first<Record<string, unknown>>();
      return row ? toRecord(row) : null;
    },
    async posted(id, channelId, messageId) {
      await db.prepare('UPDATE filings SET discord_channel_id = ?, discord_message_id = ? WHERE id = ?').bind(channelId, messageId, id).run();
    },
    async enter(id, entry: CabinetEntry) {
      await db.batch([
        db
          .prepare(
            `INSERT INTO reports (id, category, subcategory, severity, title, body, timestamp, source_message_id, source_channel_id, author_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(entry.id, entry.category, entry.subcategory, entry.severity, entry.title, entry.body, entry.timestamp, entry.sourceMessageId, entry.sourceChannelId, entry.authorName),
        db.prepare('UPDATE filings SET report_id = ? WHERE id = ?').bind(entry.id, id),
      ]);
    },
    async stamp(id, stamp, stampedAt) {
      const result = await db
        .prepare('UPDATE filings SET stamp = ?, stamp_incident = ?, stamped_at = ? WHERE id = ? AND stamp IS NULL')
        .bind(stamp.mark, JSON.stringify(stamp.at), stampedAt, id)
        .run();
      return (result.meta?.changes ?? 0) > 0;
    },
    async unstamped(categories, levels, limit) {
      const marks = (n: number) => Array.from({ length: n }, () => '?').join(', ');
      const { results } = await db
        .prepare(
          `SELECT ${COLUMNS} FROM filings WHERE stamp IS NULL AND (category IN (${marks(categories.length)}) OR importance IN (${marks(levels.length)}))
           ORDER BY filed_at DESC, id DESC LIMIT ?`,
        )
        .bind(...categories, ...levels, limit)
        .all<Record<string, unknown>>();
      return records(results);
    },
    async recentlyStamped(limit) {
      const { results } = await db
        .prepare(`SELECT ${COLUMNS} FROM filings WHERE stamp IS NOT NULL ORDER BY stamped_at DESC, id DESC LIMIT ?`)
        .bind(limit)
        .all<Record<string, unknown>>();
      return records(results);
    },
    async boardCounts() {
      const { results } = await db
        .prepare("SELECT section, COUNT(*) AS n, MAX(filed_at) AS latest FROM filings WHERE category = 'bulletin' AND (stamp IS NULL OR stamp = 'approved') GROUP BY section")
        .all<{ section: string; n: number; latest: string }>();
      return (results ?? []).map((r) => ({ section: r.section, count: Number(r.n), latestAt: r.latest }));
    },
    async board(section, limit) {
      const { results } = await db
        .prepare(
          `SELECT ${COLUMNS} FROM filings WHERE category = 'bulletin' AND section = ? AND (stamp IS NULL OR stamp = 'approved')
           ORDER BY filed_at DESC, id DESC LIMIT ?`,
        )
        .bind(section, limit)
        .all<Record<string, unknown>>();
      return records(results);
    },
  };
}

export function d1DraftStore(db: D1Database): DraftStore {
  return {
    async get(id, userId, now) {
      const row = await db
        .prepare('SELECT data FROM filing_drafts WHERE id = ? AND discord_user_id = ? AND expires_at > ?')
        .bind(id, userId, now)
        .first<{ data: string }>();
      if (!row) return null;
      try {
        return JSON.parse(row.data) as Draft;
      } catch {
        return null;
      }
    },
    async put(draft, userId, expiresAt, now) {
      await db.batch([
        db.prepare('DELETE FROM filing_drafts WHERE expires_at <= ? OR (discord_user_id = ? AND id != ?)').bind(now, userId, draft.id),
        db
          .prepare(
            `INSERT INTO filing_drafts (id, discord_user_id, data, expires_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
          )
          .bind(draft.id, userId, JSON.stringify(draft), expiresAt),
      ]);
    },
    async remove(id) {
      await db.prepare('DELETE FROM filing_drafts WHERE id = ?').bind(id).run();
    },
  };
}

// Filing: what happens to a checked filing from either door. It is recorded,
// entered in the Cabinet if it is a report, drawn by the Scribe (scribe/) and
// posted by the bot to its category's archive channel, pinging by level.
//
// The steps that can fail without losing the filing (drawing, posting) come
// after the ones that cannot (the row, the Cabinet entry), so a Discord outage
// leaves a filed report that simply was not announced.
//
// Pure policy over store interfaces, like lib/solar-pins.ts: no Cloudflare
// types here, so the tests run it in Node. The bindings are in scribe-env.ts.

import {
  CATEGORY_INFO,
  IMPORTANCE_INFO,
  incidentClock,
  incidentDate,
  incidentNow,
  type Filing,
  type FilingCategory,
  type FilingStamp,
  type Importance,
  type ParchmentRequest,
} from '../../shared/filing';
import type { ReportSeverity } from '../../shared/reports';
import type { Attachment, ScribeConfig } from './discord';
import { summonsFor } from './discord';

export type Door = 'discord' | 'web';

export interface FilingRecord {
  /** The entry number. */
  id: number;
  filing: Filing;
  door: Door;
  filerDiscordId: string | null;
  stamp: FilingStamp | null;
  stampedAt: string | null;
  filedAt: string;
  discordChannelId: string | null;
  discordMessageId: string | null;
  reportId: string | null;
}

/** A row for the Cabinet's reports table (migrations/0002, 0003). */
export interface CabinetEntry {
  id: string;
  category: string;
  subcategory: string;
  severity: ReportSeverity;
  title: string;
  body: string;
  timestamp: string;
  sourceMessageId: string;
  sourceChannelId: string;
  authorName: string;
}

export interface FilingStore {
  insert(filing: Filing, door: Door, filerDiscordId: string | null, filedAt: string): Promise<number>;
  get(id: number): Promise<FilingRecord | null>;
  posted(id: number, channelId: string, messageId: string): Promise<void>;
  enter(id: number, entry: CabinetEntry): Promise<void>;
  /** False when it was already stamped: a stamp is pressed once. */
  stamp(id: number, stamp: FilingStamp, stampedAt: string): Promise<boolean>;
  unstamped(categories: readonly FilingCategory[], levels: readonly Importance[], limit: number): Promise<FilingRecord[]>;
  recentlyStamped(limit: number): Promise<FilingRecord[]>;
  boardCounts(): Promise<{ section: string; count: number; latestAt: string }[]>;
  board(section: string, limit: number): Promise<FilingRecord[]>;
}

/** The /report wizard's work in progress: whatever the member has given so far. */
export type Draft = Partial<Filing> & { id: string };

export interface DraftStore {
  get(id: string, userId: string, now: string): Promise<Draft | null>;
  put(draft: Draft, userId: string, expiresAt: string, now: string): Promise<void>;
  remove(id: string): Promise<void>;
}

export const DRAFT_LIFETIME_MS = 60 * 60 * 1000;

// ── What the Clerk Table stamps ─────────────────────────────────────────────

/** Applications and Public Requests wait at the Clerk Table... */
export const CLERK_CATEGORIES: readonly FilingCategory[] = ['application', 'public-request'];
/** ...and so does any report High Command was summoned for, until it is seen. */
export const CLERK_LEVELS: readonly Importance[] = ['strategic', 'cataclysm'];

// ── The Cabinet entry ───────────────────────────────────────────────────────

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A report as the Cabinet keeps it, or null for a filing that is not a report.
 * The category is the wing's own name ("Military"), which the Cabinet's
 * `wingOf` reads directly; the Scribe's category becomes the subcategory. The
 * filing's own fields lead the body as `Label: value` lines, which the Cabinet
 * lays out as a record (shared/reports.ts parseReportRecord).
 */
export function cabinetEntry(id: number, filing: Filing, filedAt: string, channelId: string | null): CabinetEntry | null {
  const to = CATEGORY_INFO[filing.category].destination;
  if (to.kind !== 'cabinet') return null;
  const level = IMPORTANCE_INFO[filing.importance];
  const fields = [
    `Entry: No. ${id}`,
    filing.rank ? `Rank: ${filing.rank}` : null,
    `Incident: ${incidentDate(filing.time)}, ${incidentClock(filing.time)}`,
    `Answering to: ${filing.superior ?? 'No superior'}`,
    `Importance: ${level.name}`,
  ].filter(Boolean);
  return {
    id: `scribe-${id}`,
    category: capital(to.wing),
    subcategory: CATEGORY_INFO[filing.category].name,
    severity: level.severity,
    title: filing.title,
    body: `${fields.join('\n')}\n\n${filing.body}`,
    timestamp: filedAt,
    sourceMessageId: `scribe-${id}`,
    sourceChannelId: channelId ?? 'scribe',
    authorName: filing.name,
  };
}

// ── What the bot says ───────────────────────────────────────────────────────

/** A filer's words in a bot message: no markdown, no mentions, one line. */
export const plain = (text: string) => text.replace(/[\\*_~`|>#]/g, (c) => `\\${c}`).replace(/@/g, '@​').replace(/\s+/g, ' ');

/**
 * The bot's post for a new filing. Only the summoned roles may ping (never a
 * mention a filer typed); the filer is named, so a filing is never anonymous
 * on Discord, but not pinged.
 */
export function announcement(record: FilingRecord, config: ScribeConfig): Record<string, unknown> {
  const { filing } = record;
  const summons = summonsFor(IMPORTANCE_INFO[filing.importance].summons, config);
  const by = record.filerDiscordId ? `Filed by <@${record.filerDiscordId}>` : 'Filed at the Scribe Table';
  const where = record.door === 'web' ? ' at the Scribe Table' : '';
  const lines = [
    summons.line,
    filing.importance === 'cataclysm' ? '**CATACLYSM · ALL HANDS ON DECK**' : null,
    `**${CATEGORY_INFO[filing.category].name} · Entry No. ${record.id}** · ${IMPORTANCE_INFO[filing.importance].name}`,
    plain(filing.title),
    record.filerDiscordId ? `${by}${where}.` : `${by}.`,
  ].filter(Boolean);
  return { content: lines.join('\n'), allowed_mentions: { parse: [], roles: summons.roles } };
}

/** The bot's post for the Clerk's verdict, as a reply to the filing's own post where there is one. */
export function verdict(record: FilingRecord): Record<string, unknown> {
  const mark = record.stamp?.mark === 'denied' ? 'Denied' : 'Approved';
  return {
    content: `**${CATEGORY_INFO[record.filing.category].name} · Entry No. ${record.id}** · ${mark} by High Command.\n${plain(record.filing.title)}`,
    ...(record.discordMessageId ? { message_reference: { message_id: record.discordMessageId, fail_if_not_exists: false } } : {}),
  };
}

// ── Doing it ────────────────────────────────────────────────────────────────

export interface ScribeDeps {
  filings: FilingStore;
  config: ScribeConfig;
  render(request: ParchmentRequest): Promise<Uint8Array | null>;
  post(channelId: string, payload: Record<string, unknown>, file?: Attachment): Promise<string | null>;
}

export const parchmentOf = (record: FilingRecord): ParchmentRequest => ({
  filing: record.filing,
  serial: record.id,
  stamp: record.stamp,
});

export const parchmentFile = (bytes: Uint8Array, id: number): Attachment => ({
  name: `thalmor-entry-${id}.png`,
  type: 'image/png',
  bytes,
});

/**
 * Record a filing and enter it in the Cabinet. Quick and certain: what is left
 * (drawing and posting, `publish`) can run after the answer is sent.
 */
export async function record(
  deps: Pick<ScribeDeps, 'filings' | 'config'>,
  filing: Filing,
  door: Door,
  filerDiscordId: string | null,
  now: Date = new Date(),
): Promise<number> {
  const filedAt = now.toISOString();
  const id = await deps.filings.insert(filing, door, filerDiscordId, filedAt);
  const entry = cabinetEntry(id, filing, filedAt, deps.config.channels[filing.category] ?? null);
  if (entry) await deps.filings.enter(id, entry);
  return id;
}

/** Draw a recorded filing and post it to its channel. True when it was posted. */
export async function publish(deps: ScribeDeps, id: number): Promise<boolean> {
  const found = await deps.filings.get(id);
  if (!found) return false;
  const channel = deps.config.channels[found.filing.category];
  if (!channel) return false;
  const png = await deps.render(parchmentOf(found));
  const messageId = await deps.post(channel, announcement(found, deps.config), png ? parchmentFile(png, id) : undefined);
  if (messageId) await deps.filings.posted(id, channel, messageId);
  return Boolean(messageId);
}

export type StampResult = { ok: true; record: FilingRecord } | { ok: false; status: 404 | 409; error: string };

/** Press the Clerk's stamp. The parchment is re-drawn with it whenever it is next asked for. */
export async function stampFiling(
  deps: Pick<ScribeDeps, 'filings'>,
  id: number,
  mark: FilingStamp['mark'],
  now: Date = new Date(),
): Promise<StampResult> {
  const found = await deps.filings.get(id);
  if (!found) return { ok: false, status: 404, error: 'No filing is entered under that number.' };
  const stamp: FilingStamp = { mark, at: incidentNow(now.getTime()) };
  if (!(await deps.filings.stamp(id, stamp, now.toISOString()))) {
    return { ok: false, status: 409, error: 'That filing has already been stamped.' };
  }
  return { ok: true, record: { ...found, stamp, stampedAt: now.toISOString() } };
}

/** Post the Clerk's verdict with the re-drawn parchment, to the filing's channel. */
export async function announceStamp(deps: ScribeDeps, stamped: FilingRecord): Promise<boolean> {
  const channel = stamped.discordChannelId ?? deps.config.channels[stamped.filing.category];
  if (!channel) return false;
  const png = await deps.render(parchmentOf(stamped));
  return Boolean(await deps.post(channel, verdict(stamped), png ? parchmentFile(png, stamped.id) : undefined));
}

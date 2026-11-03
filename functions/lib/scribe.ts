// Filing: what happens to a checked filing from either door. It is recorded,
// entered in the Cabinet if it is a report, and posted by the bot to its
// category's archive channel, pinging by level. The post is the filing in
// Discord's own embed, with a link to its parchment, which the reader's
// browser draws on the site (web/src/views/Filing.tsx): nothing is drawn here.
//
// The step that can fail without losing the filing (posting) comes after the
// ones that cannot (the row, the Cabinet entry), so a Discord outage leaves a
// filed report that simply was not announced.
//
// Pure policy over store interfaces, like lib/solar-pins.ts: no Cloudflare
// types here, so the tests run it in Node. The bindings are in scribe-env.ts.

import {
  IMPORTANCE_INFO,
  destinationLabel,
  destinationOf,
  filingName,
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
import type { ScribeConfig } from './discord';
import { channelFor, summonsFor } from './discord';

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
 * `wingOf` reads directly; the kind of report ("Incident Report") becomes the
 * subcategory. The filing's own fields lead the body as `Label: value` lines,
 * which the Cabinet lays out as a record (shared/reports.ts parseReportRecord).
 */
export function cabinetEntry(id: number, filing: Filing, filedAt: string, channelId: string | null): CabinetEntry | null {
  const to = destinationOf(filing);
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
    subcategory: filingName(filing),
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

/** A filer's prose in a bot message: as `plain`, and no masked links, but its paragraphs kept. */
export const prose = (text: string) =>
  text.replace(/[\\*_~`|>#[\]]/g, (c) => `\\${c}`).replace(/@/g, '@​').replace(/\n{3,}/g, '\n\n');

export const parchmentOf = (record: FilingRecord): ParchmentRequest => ({
  filing: record.filing,
  serial: record.id,
  stamp: record.stamp,
});

/** The page a filing's parchment is drawn on, which the bot's posts link to. */
export const filingLink = (origin: string, id: number) => `${origin}/filings/${id}`;

/** A row with one link button, to the parchment. */
const readIt = (link: string) => ({ type: 1, components: [{ type: 2, style: 5, label: 'Read the parchment', url: link }] });

/**
 * A filing as the bot shows it: Discord's embed with the parchment's own parts
 * (the house and entry, the title, the body, what it is, who signed it and
 * when), edged in its level's ink, and titled with a link to the parchment
 * once there is one. The /report wizard previews the same embed before filing.
 */
export function filingEmbed(request: ParchmentRequest, link: string | null, filedAt?: string): Record<string, unknown> {
  const { filing, serial, stamp } = request;
  const level = IMPORTANCE_INFO[filing.importance];
  const signed = [filing.rank, filing.name].filter(Boolean).join(' ');
  return {
    author: { name: serial === null ? 'Thalmor Embassy · Draft' : `Thalmor Embassy · Entry No. ${serial}` },
    title: plain(filing.title),
    ...(link ? { url: link } : {}),
    description: prose(filing.body),
    color: Number.parseInt(level.ink.slice(1), 16),
    fields: [
      { name: filingName(filing), value: destinationLabel(filing), inline: true },
      { name: 'Importance', value: level.name, inline: true },
      { name: 'When', value: `${incidentDate(filing.time)}, ${incidentClock(filing.time)}`, inline: true },
      { name: 'Signed', value: plain(signed), inline: true },
      { name: 'Answering to', value: filing.superior ? plain(filing.superior) : 'No superior', inline: true },
      ...(stamp
        ? [{ name: 'The Clerk’s seal', value: `${stamp.mark === 'denied' ? 'Denied' : 'Approved'}, ${incidentDate(stamp.at)}`, inline: true }]
        : []),
    ],
    ...(filedAt ? { timestamp: filedAt } : {}),
  };
}

/**
 * The bot's post for a new filing. Only the summoned roles may ping (never a
 * mention a filer typed); the filer is named, so a filing is never anonymous
 * on Discord, but not pinged.
 */
export function announcement(record: FilingRecord, config: ScribeConfig, origin: string): Record<string, unknown> {
  const { filing } = record;
  const summons = summonsFor(IMPORTANCE_INFO[filing.importance].summons, config);
  const by = record.filerDiscordId ? `Filed by <@${record.filerDiscordId}>` : 'Filed at the Scribe Table';
  const where = record.door === 'web' ? ' at the Scribe Table' : '';
  const link = filingLink(origin, record.id);
  const lines = [
    summons.line,
    filing.importance === 'cataclysm' ? '**CATACLYSM · ALL HANDS ON DECK**' : null,
    record.filerDiscordId ? `${by}${where}.` : `${by}.`,
  ].filter(Boolean);
  return {
    content: lines.join('\n'),
    embeds: [filingEmbed(parchmentOf(record), link, record.filedAt)],
    components: [readIt(link)],
    allowed_mentions: { parse: [], roles: summons.roles },
  };
}

/** The bot's post for the Clerk's verdict, as a reply to the filing's own post where there is one. */
export function verdict(record: FilingRecord, origin: string): Record<string, unknown> {
  const mark = record.stamp?.mark === 'denied' ? 'Denied' : 'Approved';
  return {
    content: `**${filingName(record.filing)} · Entry No. ${record.id}** · ${mark} by High Command.\n${plain(record.filing.title)}`,
    components: [readIt(filingLink(origin, record.id))],
    ...(record.discordMessageId ? { message_reference: { message_id: record.discordMessageId, fail_if_not_exists: false } } : {}),
  };
}

// ── Doing it ────────────────────────────────────────────────────────────────

export interface ScribeDeps {
  filings: FilingStore;
  config: ScribeConfig;
  /** The site's own address, for the links to each parchment. */
  origin: string;
  post(channelId: string, payload: Record<string, unknown>): Promise<string | null>;
}

/**
 * Record a filing and enter it in the Cabinet. Quick and certain: what is left
 * (posting, `publish`) can run after the answer is sent.
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
  const entry = cabinetEntry(id, filing, filedAt, channelFor(filing, deps.config));
  if (entry) await deps.filings.enter(id, entry);
  return id;
}

/** Post a recorded filing to its channel. True when it was posted. */
export async function publish(deps: ScribeDeps, id: number): Promise<boolean> {
  const found = await deps.filings.get(id);
  if (!found) return false;
  const channel = channelFor(found.filing, deps.config);
  if (!channel) return false;
  const messageId = await deps.post(channel, announcement(found, deps.config, deps.origin));
  if (messageId) await deps.filings.posted(id, channel, messageId);
  return Boolean(messageId);
}

export type StampResult = { ok: true; record: FilingRecord } | { ok: false; status: 404 | 409; error: string };

/** Press the Clerk's stamp. The parchment bears it whenever it is next drawn. */
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

/** Post the Clerk's verdict to the filing's channel, linking to the stamped parchment. */
export async function announceStamp(deps: ScribeDeps, stamped: FilingRecord): Promise<boolean> {
  const channel = stamped.discordChannelId ?? channelFor(stamped.filing, deps.config);
  if (!channel) return false;
  return Boolean(await deps.post(channel, verdict(stamped, deps.origin)));
}

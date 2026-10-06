// Shared, runtime-neutral contract for Discord Reports ingestion. Nothing here
// knows about D1 or the Discord API transport, so the privacy rules are tested
// once and applied identically by every scheduled run.

export const REPORT_MINIMUM_LENGTH = 300;
export const REPORT_SEVERITIES = [
  'informational', 'low', 'medium', 'high', 'critical', 'unassessed',
] as const;
export type ReportSeverity = typeof REPORT_SEVERITIES[number];
/** Public labels only; Discord IDs remain server-side collector configuration. */
export const REPORT_CATEGORY_NAMES = [
  'Logistics', 'Administration', 'Mining', 'Supply', 'Military', 'Informants',
] as const;

export interface DiscordReportMessage {
  id: string;
  content?: string;
  timestamp: string;
  edited_timestamp?: string | null;
  type?: number;
  author: { id: string; bot?: boolean; username?: string; global_name?: string | null };
  attachments?: unknown[];
  embeds?: unknown[];
}

export type ReportDropReason = 'bot' | 'system' | 'attachment' | 'embed' | 'url' | 'short' | 'empty';

export type ReportFilterResult =
  | { included: true; text: string; title: string; severity: ReportSeverity }
  | { included: false; reason: ReportDropReason };

// URLs are excluded before cleaning, rather than redacted, because a linked
// report is a different privacy promise from a text-only report. The final arm
// intentionally catches ordinary bare domains, including `example.org/path`.
const URL = /https?:\/\/|discord\.gg(?:\/|\b)|(?:^|[\s(])(?:[a-z0-9-]+\.)+(?:com|net|org|gg|io|co|dev|app|info|me|tv|uk|de|fr|ca|au)(?=$|[\s/:?#])/i;

export const containsReportUrl = (text: string): boolean => URL.test(text);

const normalizedSeverityField = (line: string): RegExpExecArray | null =>
  /^severity\s*:\s*(.*?)\s*$/i.exec(line.replace(/\*\*/g, '').trim());

const isReportSeverity = (value: string): value is ReportSeverity =>
  (REPORT_SEVERITIES as readonly string[]).includes(value);

/** Reads an explicit standalone field anywhere in an official report template.
 * The anchored field syntax avoids interpreting narrative uses of "severity". */
export function extractReportSeverity(value: string): { severity: ReportSeverity; body: string } {
  const lines = value.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const match = normalizedSeverityField(lines[index] ?? '');
    if (!match) continue;

    let offered = (match[1] ?? '').trim().toLowerCase();
    let valueIndex = -1;
    if (!offered) {
      valueIndex = lines.findIndex((line, candidate) =>
        candidate > index && line.trim().length > 0,
      );
      const following = (lines[valueIndex] ?? '').replace(/\*\*/g, '').trim().toLowerCase();
      if (isReportSeverity(following)) offered = following;
      else valueIndex = -1;
    }

    if (valueIndex >= 0) lines.splice(valueIndex, 1);
    lines.splice(index, 1);
    return {
      severity: isReportSeverity(offered) ? offered : 'unassessed',
      body: lines.join('\n').trim(),
    };
  }

  return { severity: 'unassessed', body: value };
}

/** Converts Discord-only markup to readable, identity-safe plain text. */
export function cleanReportText(value: string): string {
  return value
    .replace(/<@!?\d{17,20}>/g, 'an agent')
    .replace(/<@&\d{17,20}>/g, 'a rank')
    .replace(/<#\d{17,20}>/g, 'a channel')
    .replace(/<a?:(\w+):\d{17,20}>/g, '$1')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function titleFor(text: string): string {
  const first = text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? '';
  if (!first) return 'Filed report';
  return first.slice(0, 120).replace(/[.:;\-–—]+$/, '') || 'Filed report';
}

export function filterReportMessage(
  message: DiscordReportMessage,
  minimumLength = REPORT_MINIMUM_LENGTH,
): ReportFilterResult {
  if (message.author.bot) return { included: false, reason: 'bot' };
  // Discord's ordinary user message is type 0. System messages are never reports.
  if (message.type !== undefined && message.type !== 0) return { included: false, reason: 'system' };
  if ((message.attachments?.length ?? 0) > 0 && !(message.content ?? '').trim()) {
    return { included: false, reason: 'attachment' };
  }
  if ((message.embeds?.length ?? 0) > 0) return { included: false, reason: 'embed' };

  const classified = extractReportSeverity(message.content?.trim() ?? '');
  const source = classified.body;
  if (!source) return { included: false, reason: 'empty' };
  if (containsReportUrl(source)) return { included: false, reason: 'url' };
  if (source.length < minimumLength) return { included: false, reason: 'short' };

  const text = cleanReportText(source);
  if (!text) return { included: false, reason: 'empty' };
  return { included: true, text, title: titleFor(text), severity: classified.severity };
}

export interface StoredReport {
  id: string;
  category: string;
  subcategory: string | null;
  severity: ReportSeverity;
  title: string;
  body: string;
  timestamp: string;
  sourceMessageId: string;
  sourceChannelId: string;
  authorName: string | null;
}

/**
 * A filing's body as the template it was written in: `Label: value` lines as
 * fields, everything else as prose, in the order they were filed.
 *
 * PRESENTATIONAL ONLY. Nothing is dropped, merged across a field, or reordered —
 * a block that is not a field stays exactly as written — so the reader can lay
 * out an official template as a record without ever hiding a line of it. The
 * label shape is narrow on purpose (a capitalised label of at most 32
 * characters, then a colon and a value on the same line) so narrative prose
 * that happens to contain a colon is left as prose.
 */
export type ReportBlock =
  | { kind: 'field'; label: string; value: string }
  | { kind: 'prose'; text: string };

const FIELD = /^([A-Z][\w /&'()-]{0,31}):\s+(\S.*)$/;

export function parseReportRecord(body: string): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  let prose: string[] = [];
  const flush = () => {
    const text = prose.join('\n').replace(/^\n+|\n+$/g, '');
    if (text) blocks.push({ kind: 'prose', text });
    prose = [];
  };

  for (const line of body.split(/\r?\n/)) {
    const match = FIELD.exec(line.trim());
    if (match) {
      flush();
      blocks.push({ kind: 'field', label: match[1]!.trim(), value: match[2]!.trim() });
    } else {
      prose.push(line);
    }
  }
  flush();
  return blocks;
}

// ── Attribution ─────────────────────────────────────────────────────────────
//
// A filing is signed with its filer's in-world name, never their Discord
// identity. The roster already records each member's handles beside their
// character name, so the collector resolves the one to the other in memory
// and stores only the name. A handle two members both claim resolves to no
// one: an archive that guesses a signature is worse than one that leaves the
// line blank.

/** Handle → in-world name, or null where the handle is claimed twice. */
export type FilerIndex = ReadonlyMap<string, string | null>;

export function buildFilerIndex(members: readonly { name: string; discord: readonly string[] }[]): FilerIndex {
  const index = new Map<string, string | null>();
  for (const member of members) {
    const name = member.name.trim();
    if (!name) continue;
    for (const raw of member.discord) {
      const handle = raw.trim().replace(/^@+/, '').toLowerCase();
      if (!handle) continue;
      const known = index.get(handle);
      index.set(handle, known === undefined || known === name ? name : null);
    }
  }
  return index;
}

/** The filer's in-world name, or null when no single member matches. */
export function resolveFiler(
  author: Pick<DiscordReportMessage['author'], 'username' | 'global_name'>,
  index: FilerIndex,
): string | null {
  for (const candidate of [author.username, author.global_name]) {
    const handle = candidate?.trim().replace(/^@+/, '').toLowerCase();
    if (!handle) continue;
    const name = index.get(handle);
    if (name) return name;
  }
  return null;
}

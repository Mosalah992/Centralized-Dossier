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

/** Reads the report-format header only when it opens the report. This avoids
 * mistaking a quoted or narrative "Severity:" line for a classification. */
export function extractReportSeverity(value: string): { severity: ReportSeverity; body: string } {
  const lines = value.split(/\r?\n/);
  const first = lines.findIndex((line) => line.trim().length > 0);
  if (first < 0) return { severity: 'unassessed', body: value };
  const match = /^\s*severity\s*:\s*(.*?)\s*$/i.exec(lines[first] ?? '');
  if (!match) return { severity: 'unassessed', body: value };
  lines.splice(first, 1);
  const offered = (match[1] ?? '').toLowerCase();
  const severity = (REPORT_SEVERITIES as readonly string[]).includes(offered)
    ? offered as ReportSeverity
    : 'unassessed';
  return { severity, body: lines.join('\n').trim() };
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

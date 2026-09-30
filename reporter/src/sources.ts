import { REPORT_CATEGORIES, type ReportCategory } from './config';

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
}

export const DISCORD_TEXT_CHANNEL_TYPES = new Set([0, 5]);
export const DISCORD_FORUM_CHANNEL_TYPE = 15;

export const isReadableReportChannel = (channel: DiscordChannel): boolean =>
  DISCORD_TEXT_CHANNEL_TYPES.has(channel.type) || channel.type === DISCORD_FORUM_CHANNEL_TYPE;

const hasReportName = (channel: DiscordChannel): boolean =>
  channel.type === DISCORD_FORUM_CHANNEL_TYPE || /(?:^|-)reports?$/.test(channel.name);

/** Resolves a configured Discord root without requiring every child channel ID.
 * Named dossiers are allowed only where the category configuration opts in. */
export function resolveReportSources(
  channels: DiscordChannel[],
  category: ReportCategory,
): { root?: DiscordChannel; sources: DiscordChannel[] } {
  const root = channels.find((channel) => channel.id === category.id);
  if (!root) return { sources: [] };

  const children = channels.filter((channel) =>
    channel.parent_id === root.id
    && isReadableReportChannel(channel)
    // A direct mapping owns its category even when it sits inside another
    // configured category. This prevents implementation order from refiling it.
    && !REPORT_CATEGORIES.some((configured) => configured.id === channel.id)
    && (category.childChannels === 'all' || hasReportName(channel)),
  );

  return { root, sources: children.length ? children : [root] };
}

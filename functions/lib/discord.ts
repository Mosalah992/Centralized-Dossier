// Discord, as the Scribe meets it: the signed interactions it answers, the
// roles that decide who may file what, and the messages the bot posts.
// Ported from the Bruma Joint Archives (functions/lib/discord.ts there), with
// the role map reduced to what the Embassy needs: a rank and an office.
//
// Roles stay the authority. A code records who holds it, never what they may
// do; every use asks Discord again (memberRoles), so a member who loses the
// role or leaves the server loses the code with it.

import bundled from '../../config/scribe.json';
import { FILING_CATEGORIES, type FilingCategory, type Summons } from '../../shared/filing';

export const SNOWFLAKE = /^\d{17,20}$/;

export interface Grant {
  rank: string;
  office: string;
  /** The highest among a member's mapped roles is the one their code fills in. */
  precedence: number;
}

export interface ScribeConfig {
  roles: Map<string, Grant>;
  /** Role ids pinged for a Strategic (`command`) and a Cataclysm (`all`) filing. */
  summons: Record<Exclude<Summons, 'none'>, string[]>;
  channels: Partial<Record<FilingCategory, string>>;
}

/**
 * config/scribe.json, checked. Anything that is not a Discord id is dropped
 * rather than trusted, which is also how its REPLACE_WITH_ placeholders read:
 * as nothing configured yet.
 */
export function scribeConfig(raw: unknown = bundled): ScribeConfig {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const roles = new Map<string, Grant>();
  for (const [id, value] of Object.entries((source.roles ?? {}) as Record<string, unknown>)) {
    const g = value as Partial<Grant> | null;
    if (!SNOWFLAKE.test(id) || !g || typeof g.rank !== 'string' || !g.rank.trim()) continue;
    roles.set(id, {
      rank: g.rank.trim().slice(0, 40),
      office: typeof g.office === 'string' ? g.office.trim().slice(0, 60) : '',
      precedence: typeof g.precedence === 'number' && Number.isFinite(g.precedence) ? g.precedence : 0,
    });
  }

  const ids = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && SNOWFLAKE.test(v)) : []);
  const summons = (source.summons ?? {}) as Record<string, unknown>;

  const channels: ScribeConfig['channels'] = {};
  const rawChannels = (source.channels ?? {}) as Record<string, unknown>;
  for (const category of FILING_CATEGORIES) {
    const id = rawChannels[category];
    if (typeof id === 'string' && SNOWFLAKE.test(id)) channels[category] = id;
  }

  return { roles, summons: { command: ids(summons.command), all: ids(summons.all) }, channels };
}

/** The grant a member's roles earn: highest precedence wins, ties to the first listed role. */
export function grantFor(roles: readonly string[], map: ReadonlyMap<string, Grant>): Grant | null {
  let best: Grant | null = null;
  for (const role of roles) {
    const grant = map.get(role);
    if (grant && (!best || grant.precedence > best.precedence)) best = grant;
  }
  return best;
}

/** The roles a filing of this level pings, and the line that pings them. */
export function summonsFor(level: Summons, config: ScribeConfig): { roles: string[]; line: string } {
  const roles = level === 'none' ? [] : config.summons[level];
  return { roles, line: roles.map((id) => `<@&${id}>`).join(' ') };
}

// ── Request signatures ──────────────────────────────────────────────────────

const hex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

/** Discord signs every interaction with Ed25519; anything unsigned or stale is refused. */
export async function verifyDiscord(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(publicKey) || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hex(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hex(signature), new TextEncoder().encode(timestamp + body));
  } catch {
    return false;
  }
}

// ── The bot's side of the API ───────────────────────────────────────────────

export interface DiscordEnv {
  /** The application, for answering a deferred interaction. */
  DISCORD_APP_ID?: string;
  /** The application's public key (hex), for checking interaction signatures. */
  DISCORD_PUBLIC_KEY?: string;
  /** Archivist Ancarion's bot token, for re-checking roles and posting filings. Secret. */
  DISCORD_BOT_TOKEN?: string;
  /** The Embassy's server, whose roles grant codes. */
  DISCORD_GUILD_ID?: string;
}

const API = 'https://discord.com/api/v10';

export type MemberCheck = { kind: 'member'; roles: string[] } | { kind: 'gone' } | { kind: 'unknown' };

/** A member's roles as Discord has them now. `unknown` when Discord cannot be asked. */
export async function memberRoles(env: DiscordEnv, userId: string): Promise<MemberCheck> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID || !SNOWFLAKE.test(userId)) return { kind: 'unknown' };
  try {
    const res = await fetch(`${API}/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    });
    if (res.status === 404) return { kind: 'gone' };
    if (!res.ok) return { kind: 'unknown' };
    const member = (await res.json()) as { roles?: string[] };
    return { kind: 'member', roles: member.roles ?? [] };
  } catch {
    return { kind: 'unknown' };
  }
}

/**
 * A message body. Mentions are never parsed from the text: only the roles in
 * `allowed_mentions` can ping, whatever a filer typed.
 */
const messageBody = (payload: Record<string, unknown>): string => JSON.stringify({ allowed_mentions: { parse: [] }, ...payload });

/** Post to a channel as the bot. Returns the message id, or null when it could not. */
export async function postMessage(env: DiscordEnv, channelId: string, payload: Record<string, unknown>): Promise<string | null> {
  if (!env.DISCORD_BOT_TOKEN || !SNOWFLAKE.test(channelId)) return null;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
      body: messageBody(payload),
    });
    if (!res.ok) {
      console.warn('scribe: post refused', res.status, await res.text().catch(() => ''));
      return null;
    }
    return ((await res.json()) as { id?: string }).id ?? null;
  } catch (error) {
    console.warn('scribe: post failed', error);
    return null;
  }
}

/** Replace the answer to an interaction (after a deferred reply, or a step of the wizard). */
export async function editOriginal(env: DiscordEnv, token: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!env.DISCORD_APP_ID || !SNOWFLAKE.test(env.DISCORD_APP_ID)) return false;
  try {
    const res = await fetch(`${API}/webhooks/${env.DISCORD_APP_ID}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: messageBody({ embeds: [], ...payload }),
    });
    if (!res.ok) console.warn('scribe: answer refused', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (error) {
    console.warn('scribe: answer failed', error);
    return false;
  }
}

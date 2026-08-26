// Which Discord servers the gate will admit a reader from, and how it decides.
//
// Both halves live here rather than in api/auth/callback.ts, for the same
// reason PUBLIC_PATHS lives outside the middleware that reads it: this is the
// boundary, and a boundary that can only be exercised by completing a real
// OAuth round trip is a boundary nobody tests. Neither function here touches
// the network or the Workers types, so test/guilds.test.ts can hold them to
// account from the browser project.

/**
 * Parse `DISCORD_GUILD_ID` into the list of servers that admit a reader.
 *
 * ONE VARIABLE, A COMMA-SEPARATED LIST. It stayed singular in name because a
 * lone id is still a valid value and every existing deployment holds one —
 * renaming it would mean a window where the variable the code reads is not the
 * variable Cloudflare has set, and that window seals the Discord door for
 * everybody. A single id parses to a single-element list and nothing changes.
 *
 * ORDER IS PRECEDENCE, not decoration. A reader in more than one of these is
 * admitted under the FIRST they belong to, and it is that server's roles the
 * writ carries — so the Embassy's own guild belongs at the head of the list,
 * where its roles win over any other server's.
 */
export function parseGuildIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    // Snowflakes only. A stray comma, a trailing separator or a pasted quote
    // would otherwise become a guild id that can never match, and the reader
    // would be told they are not on the rolls when the truth is a typo in a
    // config variable — which is exactly how one wrong id spent its life
    // looking like a hundred separate account problems. See wrangler.toml.
    .filter((id) => /^\d{17,20}$/.test(id));
}

/** What Discord answered when asked whether the reader is in one guild. */
export interface GuildLookup {
  guildId: string;
  /** HTTP status from `/users/@me/guilds/{id}/member`. */
  status: number;
  /** Parsed body, present only when the lookup succeeded. */
  member?: { roles?: string[]; nick?: string };
}

export type Admission =
  | { admitted: true; guildId: string; roles: string[]; nick?: string }
  | { admitted: false; reason: 'not-a-member' | 'unverified' | 'unreachable' };

/**
 * Decide admission from what every configured guild answered.
 *
 * 404 IS THE ONLY STATUS THAT IS ABOUT THE READER. It is the ordinary answer
 * for "not in that guild". Everything else is our fault — a wrong guild id, a
 * dropped `guilds.members.read` scope, a rate-limited Worker — and reporting
 * any of them as a missing name is how one bad number reads as a hundred
 * broken accounts rather than one broken config.
 *
 * That distinction gets HARDER with more than one guild, not easier, which is
 * the whole reason this is a function and not three lines in the callback. A
 * reader who is genuinely not in guild A and hits a 403 on guild B has not been
 * shown to be a stranger: B never answered the question. So a refusal is only
 * 'not-a-member' when EVERY guild said 404, and any other failure among them
 * outranks it.
 */
export function decideAdmission(lookups: readonly GuildLookup[]): Admission {
  if (lookups.length === 0) return { admitted: false, reason: 'unreachable' };

  // First match wins, and the list arrives in precedence order.
  for (const lookup of lookups) {
    if (lookup.status === 200 && lookup.member) {
      return {
        admitted: true,
        guildId: lookup.guildId,
        roles: lookup.member.roles ?? [],
        nick: lookup.member.nick,
      };
    }
  }

  if (lookups.some((l) => l.status === 401 || l.status === 403)) {
    return { admitted: false, reason: 'unverified' };
  }
  if (lookups.every((l) => l.status === 404)) {
    return { admitted: false, reason: 'not-a-member' };
  }
  return { admitted: false, reason: 'unreachable' };
}

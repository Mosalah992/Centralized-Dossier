import { describe, expect, it } from 'vitest';

import { decideAdmission, parseGuildIds, type GuildLookup } from '../functions/lib/guilds';

/**
 * The gate's other boundary. PUBLIC_PATHS says which routes need no writ; this
 * says who may be issued one — and unlike that set, it cannot be read off a
 * single line. A reader is admitted on the strength of several servers'
 * answers, and the interesting cases are the MIXTURES: one 404 beside one 403
 * is not a stranger, it is a question that never got asked.
 *
 * None of this can be exercised in production without a real Discord account in
 * a real server, so if it is not tested here it is not tested.
 */

const EMBASSY = '1498139135758831749';
const KEIZAAL = '1350193670254497853';

const member = (guildId: string, roles: string[] = [], nick?: string): GuildLookup =>
  ({ guildId, status: 200, member: { roles, nick } });
const absent = (guildId: string): GuildLookup => ({ guildId, status: 404 });

describe('parseGuildIds', () => {
  it('reads a single id, which is what every deployment held before', () => {
    expect(parseGuildIds(EMBASSY)).toEqual([EMBASSY]);
  });

  it('reads a comma-separated list, keeping the order given', () => {
    expect(parseGuildIds(`${EMBASSY},${KEIZAAL}`)).toEqual([EMBASSY, KEIZAAL]);
  });

  it('tolerates the whitespace a human leaves after a comma', () => {
    expect(parseGuildIds(` ${EMBASSY} , ${KEIZAAL} `)).toEqual([EMBASSY, KEIZAAL]);
  });

  /* A stray separator must not become a guild nobody can be in. Left in, it
     would answer 404 for every reader forever and drag every refusal toward
     'not-a-member' — a config typo wearing the face of an account problem. */
  it('drops empty fragments from a trailing or doubled comma', () => {
    expect(parseGuildIds(`${EMBASSY},,${KEIZAAL},`)).toEqual([EMBASSY, KEIZAAL]);
  });

  it('drops anything that is not a snowflake', () => {
    expect(parseGuildIds(`"${EMBASSY}", not-an-id, 42`)).toEqual([]);
    expect(parseGuildIds(`${EMBASSY}, oops`)).toEqual([EMBASSY]);
  });

  /* login.ts turns an empty list into its own 503 rather than sealing the
     archive, so this returning [] is load-bearing: see invariant 4. */
  it('is empty when unset, so the door can report itself unconfigured', () => {
    expect(parseGuildIds(undefined)).toEqual([]);
    expect(parseGuildIds('')).toEqual([]);
    expect(parseGuildIds(' , , ')).toEqual([]);
  });
});

describe('decideAdmission', () => {
  it('admits a reader in the only server configured', () => {
    expect(decideAdmission([member(EMBASSY, ['r1'])])).toEqual({
      admitted: true, guildId: EMBASSY, roles: ['r1'], nick: undefined,
    });
  });

  it('admits a reader who is only in the second server', () => {
    const got = decideAdmission([absent(EMBASSY), member(KEIZAAL, ['k1'], 'Cat')]);
    expect(got).toEqual({ admitted: true, guildId: KEIZAAL, roles: ['k1'], nick: 'Cat' });
  });

  /* Order is precedence. Someone in both is admitted under the Embassy's own
     guild, because that is the server whose roles the Embassy can act on. */
  it('prefers the earlier server when the reader is in both', () => {
    const got = decideAdmission([member(EMBASSY, ['r1']), member(KEIZAAL, ['k1'])]);
    expect(got).toMatchObject({ admitted: true, guildId: EMBASSY, roles: ['r1'] });
  });

  it('refuses a reader in none of them, and says so plainly', () => {
    expect(decideAdmission([absent(EMBASSY), absent(KEIZAAL)]))
      .toEqual({ admitted: false, reason: 'not-a-member' });
  });

  /* THE CASE THIS FILE EXISTS FOR. A 403 on one server means that server never
     answered the question; the reader has not been shown to be a stranger, and
     telling them they are not on the rolls sends them away over our fault. */
  it('does not call a reader a stranger when a server refused to answer', () => {
    expect(decideAdmission([absent(EMBASSY), { guildId: KEIZAAL, status: 403 }]))
      .toEqual({ admitted: false, reason: 'unverified' });
  });

  it('reports a rate-limited or broken lookup as unreachable, not as absence', () => {
    expect(decideAdmission([absent(EMBASSY), { guildId: KEIZAAL, status: 429 }]))
      .toEqual({ admitted: false, reason: 'unreachable' });
    expect(decideAdmission([{ guildId: EMBASSY, status: 500 }]))
      .toEqual({ admitted: false, reason: 'unreachable' });
  });

  it('lets a scope failure outrank a plain absence in either order', () => {
    const reason = { admitted: false, reason: 'unverified' };
    expect(decideAdmission([{ guildId: EMBASSY, status: 401 }, absent(KEIZAAL)])).toEqual(reason);
    expect(decideAdmission([absent(EMBASSY), { guildId: KEIZAAL, status: 401 }])).toEqual(reason);
  });

  /* A 200 with no body cannot be trusted as membership — it is the one shape
     that would admit a reader on an empty answer. */
  it('does not admit on a success carrying no member object', () => {
    expect(decideAdmission([{ guildId: EMBASSY, status: 200 }]))
      .toEqual({ admitted: false, reason: 'unreachable' });
  });

  it('refuses when there is nothing configured to ask', () => {
    expect(decideAdmission([])).toEqual({ admitted: false, reason: 'unreachable' });
  });
});

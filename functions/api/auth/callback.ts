// GET /api/auth/callback — Discord returns the reader here with a code.
//
// Exchange it, ask who they are and whether they are in ANY of the servers the
// Embassy admits from, and if so issue a writ carrying their identity. A reader
// in none of them is refused: holding a Discord account is not membership.
//
// Which servers those are, and how a mixture of answers is read, is in
// lib/guilds.ts — deliberately out of this file, because the decision is the
// boundary and this file cannot be tested without a live OAuth round trip.
//
// NOTHING IS GATED ON THE ROLES THIS COLLECTS. They are written into the writ
// so the data can be proven right against real accounts in production before
// anything is moved behind them. Phase 2 reads `writ.r`; this phase only
// records it.

import {
  STATE_COOKIE_NAME,
  clearedStateCookie,
  issueWrit,
  readCookie,
  unsign,
  writCookie,
  OAUTH_TTL_SECONDS,
  type Identity,
} from '../../lib/session';
import { callbackUrl } from './login';
import { decideAdmission, parseGuildIds, type GuildLookup } from '../../lib/guilds';

interface Env {
  GATE_SECRET: string;
  GATE_EPOCH?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_GUILD_ID?: string;
}

/**
 * Refusals land the reader back on the gate with a reason in the URL rather
 * than on a JSON error page. They arrived here by clicking a button, and a wall
 * of JSON is not an answer to that — the gate can say what happened and offer
 * the passphrase, which still works.
 */
function refuse(request: Request, reason: string): Response {
  const back = new URL('/', request.url);
  back.searchParams.set('login', reason);
  return new Response(null, {
    status: 302,
    headers: {
      location: back.toString(),
      'set-cookie': clearedStateCookie(),
      'cache-control': 'private, no-store',
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);

  const guildIds = parseGuildIds(env.DISCORD_GUILD_ID);
  if (!env.GATE_SECRET || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET
      || guildIds.length === 0) {
    return refuse(request, 'unconfigured');
  }

  // The reader declined at Discord's own consent screen.
  if (url.searchParams.get('error')) return refuse(request, 'declined');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return refuse(request, 'incomplete');

  // The nonce must match the one signed into the cookie at the start of this
  // login. Without it, an attacker could hand a victim a callback URL carrying
  // the attacker's own code and log them into the wrong identity.
  const expected = await unsign(env.GATE_SECRET, readCookie(request, STATE_COOKIE_NAME));
  if (!expected || expected !== state) return refuse(request, 'stale');

  let identity: Identity;
  try {
    const token = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl(request),
      }),
    });
    if (!token.ok) return refuse(request, 'exchange');
    const { access_token: accessToken } = await token.json() as { access_token?: string };
    if (!accessToken) return refuse(request, 'exchange');

    const auth = { authorization: `Bearer ${accessToken}` };

    // Every admitting server is asked, in parallel and in precedence order.
    // The reader's own token answers for all of them, so adding a server costs
    // one more request and no new permission — and still no bot token anywhere
    // in this project.
    const [me, ...lookups] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: auth }),
      ...guildIds.map(async (guildId): Promise<GuildLookup> => {
        const res = await fetch(
          `https://discord.com/api/users/@me/guilds/${guildId}/member`, { headers: auth });
        return {
          guildId,
          status: res.status,
          member: res.ok
            ? await res.json() as { roles?: string[]; nick?: string }
            : undefined,
        };
      }),
    ]);

    const admission = decideAdmission(lookups);
    if (!admission.admitted) {
      // The reader gets a sentence; the Worker log gets every status, which is
      // the difference between 'their scope', 'our guild id' and 'they are in
      // neither server'. With more than one guild in play, the interesting
      // failure is a MIXTURE — and only the log can show that.
      if (admission.reason !== 'not-a-member') {
        console.warn(`guild lookups failed: ${lookups.map((l) => `${l.guildId}=${l.status}`).join(' ')}`);
      }
      return refuse(request, admission.reason);
    }
    if (!me.ok) return refuse(request, 'exchange');

    const user = await me.json() as { id: string; username: string; global_name?: string };

    identity = {
      id: user.id,
      // What the Embassy calls them, preferring the name they chose in the
      // server that admitted them over the one they chose for Discord.
      name: admission.nick || user.global_name || user.username,
      roles: admission.roles,
      // Which server let them in. Role ids mean nothing without it — the same
      // snowflake is a different role in a different server — so a writ that
      // carried roles and not this would be carrying numbers nobody could
      // safely read. See the note on `g` in lib/session.ts.
      guild: admission.guildId,
    };
  } catch {
    // Discord being unreachable must not look like a refusal of the reader.
    return refuse(request, 'unreachable');
  }

  const epoch = Number(env.GATE_EPOCH ?? '1');
  const writ = await issueWrit(env.GATE_SECRET, epoch, 'archive', identity);

  // Straight to the archive. The seal was already broken on the way out — see
  // the note in web/src/components/Gate.tsx — so there is no ceremony owed here
  // and nothing for the gate to do but get out of the way.
  const home = new URL('/', request.url);
  const headers = new Headers({ location: home.toString(), 'cache-control': 'private, no-store' });
  headers.append('set-cookie', writCookie(writ, undefined, OAUTH_TTL_SECONDS));
  headers.append('set-cookie', clearedStateCookie());

  return new Response(null, { status: 302, headers });
};

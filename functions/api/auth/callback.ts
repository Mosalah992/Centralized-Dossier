// GET /api/auth/callback — Discord returns the reader here with a code.
//
// Exchange it, ask who they are and whether they are in the Embassy's guild,
// and if so issue a writ carrying their identity. A reader who is not in the
// guild is refused: holding a Discord account is not membership.
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

  if (!env.GATE_SECRET || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET
      || !env.DISCORD_GUILD_ID) {
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
    const [me, member] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: auth }),
      fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
        { headers: auth }),
    ]);

    // 404 here is the ordinary answer for "not in that guild", not a fault.
    if (!member.ok) return refuse(request, 'not-a-member');
    if (!me.ok) return refuse(request, 'exchange');

    const user = await me.json() as { id: string; username: string; global_name?: string };
    const membership = await member.json() as { roles?: string[]; nick?: string };

    identity = {
      id: user.id,
      // What the Embassy calls them, preferring the name they chose for the
      // guild over the one they chose for Discord.
      name: membership.nick || user.global_name || user.username,
      roles: membership.roles ?? [],
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

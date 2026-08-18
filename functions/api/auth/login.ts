// GET /api/auth/login — send the reader to Discord to be identified.
//
// This is the second door. The passphrase gate is the first and is untouched:
// a reader who never uses Discord is admitted exactly as before, and nothing in
// this file can lock them out.
//
// WHY THIS FAILS OPEN, WHERE THE GATE FAILS CLOSED. A missing GATE_SECRET seals
// the archive (invariant 4), because a gate that cannot check a word must not
// admit anyone. Missing DISCORD_* configuration is the opposite case: the door
// is optional, the passphrase still works, and sealing the archive over an
// unset variable would turn a config mistake into an outage for a hundred
// people. So this route answers 503 for itself and leaves the rest alone.

import { sign, stateCookie } from '../../lib/session';

interface Env {
  GATE_SECRET: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_GUILD_ID?: string;
}

/** Where Discord sends the reader back. Derived, so it is right per environment. */
export const callbackUrl = (request: Request): string =>
  new URL('/api/auth/callback', request.url).toString();

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID) {
    return new Response(
      JSON.stringify({ error: 'The Embassy keeps no register of Discord names yet.' }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
    );
  }
  if (!env.GATE_SECRET) {
    return new Response(JSON.stringify({ error: 'The archive is sealed pending the warden\'s key.' }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  // The nonce ties this callback to this login. Signed rather than stored: the
  // cookie is the only place it lives, so there is no state to expire server-
  // side and nothing to clean up.
  const nonce = crypto.randomUUID();
  const state = await sign(env.GATE_SECRET, nonce);

  const authorize = new URL('https://discord.com/api/oauth2/authorize');
  authorize.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callbackUrl(request));
  authorize.searchParams.set('response_type', 'code');
  // `identify` for the name, `guilds.members.read` for the roles. Asking the
  // reader's own token for their membership is what keeps a bot token — and the
  // permissions that come with one — out of this project entirely.
  authorize.searchParams.set('scope', 'identify guilds.members.read');
  authorize.searchParams.set('state', nonce);

  // `prompt` is deliberately left at Discord's default, which always shows the
  // consent screen. `prompt=none` skips it for a reader who has authorised
  // these scopes before and would be the nicer daily experience — identity
  // writs last a day, so people re-login often — but it is only documented for
  // the case where the authorisation already exists, and what it does on a
  // FIRST login is not something to discover in production. Worth revisiting
  // once a login is known to work end to end.

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': stateCookie(state),
      'cache-control': 'private, no-store',
    },
  });
};

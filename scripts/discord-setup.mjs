#!/usr/bin/env node
// One-time Discord setup for the Scribe, after the Bruma Joint Archives'
// script. Run by the maintainer, not by members.
//
//   node scripts/discord-setup.mjs app        the application's id and public key (DISCORD_APP_ID, DISCORD_PUBLIC_KEY)
//   node scripts/discord-setup.mjs invite     the link that adds the bot to the Embassy's server, with its permissions
//   node scripts/discord-setup.mjs roles      the server's roles and their ids, for config/scribe.json
//   node scripts/discord-setup.mjs channels   the server's text channels and their ids
//   node scripts/discord-setup.mjs register   add /archives code and /report to the Embassy's server
//   node scripts/discord-setup.mjs endpoint   point the application at https://thalmor-archives.com/api/discord/interactions
//
// `app`, `invite`, `roles` and `channels` only read. `register` and `endpoint`
// change the application; run them when the site that answers is deployed
// (Discord tests the endpoint with a signed PING before it accepts it).
//
// THE SCRIBE IS AN APPLICATION OF ITS OWN (2026-11-02): Archivist Ancarion's
// interactions go to the quartermaster Worker, and an application has only one
// endpoint. So this reads SCRIBE_BOT_TOKEN, from the environment or from .env
// (pass --env <path> to read another checkout's), and never the collectors'
// DISCORD_BOT_TOKEN. The application id is asked of Discord rather than
// configured. The token is read, used, and never printed.

import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const at = args.indexOf('--env');
const envFile = at >= 0 ? args[at + 1] : '.env';
const fileEnv = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    )
  : {};
const token = process.env.SCRIBE_BOT_TOKEN ?? fileEnv.SCRIBE_BOT_TOKEN;
const guild = process.env.DISCORD_GUILD_ID ?? '1498139135758831749';
const ENDPOINT = 'https://thalmor-archives.com/api/discord/interactions';
if (!token) {
  console.error(`No SCRIBE_BOT_TOKEN in the environment or ${envFile}.`);
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// Guild commands, so they appear at once and only in the Embassy's server,
// where a member's roles can be read. contexts [0]: servers only.
const COMMANDS = [
  {
    name: 'archives',
    description: 'The Thalmor Embassy Archives',
    contexts: [0],
    options: [{ type: 1, name: 'code', description: 'Your personal code for the Scribe Table (only you will see it)' }],
  },
  {
    name: 'report',
    description: 'Write a report, a log, a board post, an application or a public request',
    contexts: [0],
  },
];

/**
 * What the bot needs in the archive channels: to see them (View Channel), post
 * (Send Messages) the parchment (Attach Files), reply to a filing with the
 * Clerk's verdict (Read Message History), and ping the summoned roles, which
 * the Embassy keeps unmentionable (Mention Everyone, Here and All Roles).
 */
const PERMISSIONS = (1n << 10n) | (1n << 11n) | (1n << 15n) | (1n << 16n) | (1n << 17n);

const which = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--env');
if (which === 'app') {
  const app = await api('GET', '/applications/@me');
  console.log(`DISCORD_APP_ID     = "${app.id}"   (${app.name})`);
  console.log(`DISCORD_PUBLIC_KEY = "${app.verify_key}"`);
  console.log(`Interactions Endpoint URL now: ${app.interactions_endpoint_url ?? '(none)'}`);
} else if (which === 'invite') {
  const app = await api('GET', '/applications/@me');
  const query = new URLSearchParams({
    client_id: app.id,
    scope: 'bot applications.commands',
    permissions: String(PERMISSIONS),
    guild_id: guild,
    disable_guild_select: 'true',
  });
  console.log(`https://discord.com/oauth2/authorize?${query}`);
} else if (which === 'roles') {
  const roles = await api('GET', `/guilds/${guild}/roles`);
  for (const r of roles.sort((a, b) => b.position - a.position)) console.log(`${r.id}  ${r.name}${r.mentionable ? '' : '  (not mentionable)'}`);
} else if (which === 'channels') {
  const channels = await api('GET', `/guilds/${guild}/channels`);
  const parents = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  for (const c of channels.filter((c) => c.type === 0 || c.type === 5 || c.type === 15)) {
    console.log(`${c.id}  ${parents.get(c.parent_id) ?? '—'} / #${c.name}`);
  }
} else if (which === 'register') {
  const app = await api('GET', '/applications/@me');
  for (const command of COMMANDS) {
    // POST creates the command, or overwrites the one of the same name; others are untouched.
    const done = await api('POST', `/applications/${app.id}/guilds/${guild}/commands`, command);
    console.log(`Registered /${done.name} in ${guild}.`);
  }
} else if (which === 'endpoint') {
  const app = await api('PATCH', '/applications/@me', { interactions_endpoint_url: ENDPOINT });
  console.log(`${app.name} now sends its interactions to ${app.interactions_endpoint_url}.`);
} else {
  console.error('usage: node scripts/discord-setup.mjs app | invite | roles | channels | register | endpoint [--env <path to .env>]');
  process.exit(1);
}

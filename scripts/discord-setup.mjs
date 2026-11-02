#!/usr/bin/env node
// One-time Discord setup for the Scribe, after the Bruma Joint Archives'
// script. Run by the maintainer, not by members. Read-only except `register`.
//
//   node scripts/discord-setup.mjs app        the application's id and public key (DISCORD_APP_ID, DISCORD_PUBLIC_KEY)
//   node scripts/discord-setup.mjs roles      the server's roles and their ids, for config/scribe.json
//   node scripts/discord-setup.mjs channels   the server's text channels and their ids
//   node scripts/discord-setup.mjs register   add /archives code and /report to the Embassy's server
//
// THE SCRIBE SHARES THE COLLECTOR'S APPLICATION (2026-11-02), so this reads the
// same bot token the export scripts do: DISCORD_BOT_TOKEN from the environment
// or from .env (pass --env <path> to read another checkout's). The application
// id is asked of Discord rather than configured. The token is read, used, and
// never printed.
//
// `register` creates or updates only its own two commands, one at a time. It
// never replaces the application's command list, so anything else the
// collector's application has registered stays as it is.

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
const token = process.env.DISCORD_BOT_TOKEN ?? fileEnv.DISCORD_BOT_TOKEN;
const guild = process.env.DISCORD_GUILD_ID ?? '1498139135758831749';
if (!token) {
  console.error(`No DISCORD_BOT_TOKEN in the environment or ${envFile}.`);
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

const which = args.find((a) => !a.startsWith('--') && a !== envFile);
if (which === 'app') {
  const app = await api('GET', '/applications/@me');
  console.log(`DISCORD_APP_ID     = "${app.id}"   (${app.name})`);
  console.log(`DISCORD_PUBLIC_KEY = "${app.verify_key}"`);
  console.log(`Interactions Endpoint URL now: ${app.interactions_endpoint_url ?? '(none)'}`);
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
} else {
  console.error('usage: node scripts/discord-setup.mjs app | roles | channels | register [--env <path to .env>]');
  process.exit(1);
}

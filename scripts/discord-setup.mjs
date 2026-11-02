#!/usr/bin/env node
// One-time Discord setup for the Scribe's commands, after the Bruma Joint
// Archives' script. Run by the maintainer, not by members.
//
//   node scripts/discord-setup.mjs roles      list the server's roles and their ids, for config/scribe.json
//   node scripts/discord-setup.mjs channels   list the server's text channels and their ids
//   node scripts/discord-setup.mjs register   register /archives code and /report in the Embassy's server
//                                             (this REPLACES the application's other commands in that server)
//
// Needs (environment, or credentials/discord.json, which is git-ignored):
//   DISCORD_APP_ID     Application ID  (Developer Portal → General Information)
//   DISCORD_BOT_TOKEN  Bot token       (Developer Portal → Bot → Reset Token)
//   DISCORD_GUILD_ID   The Embassy's server (1498139135758831749)
// The token is read, used, and never printed.

import { existsSync, readFileSync } from 'node:fs';

const file = existsSync('credentials/discord.json') ? JSON.parse(readFileSync('credentials/discord.json', 'utf8')) : {};
const conf = (k) => process.env[k] ?? file[k];
const app = conf('DISCORD_APP_ID');
const token = conf('DISCORD_BOT_TOKEN');
const guild = conf('DISCORD_GUILD_ID') ?? '1498139135758831749';
if (!app || !token) {
  console.error('Set DISCORD_APP_ID and DISCORD_BOT_TOKEN (environment or credentials/discord.json).');
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

const which = process.argv[2];
if (which === 'roles') {
  const roles = await api('GET', `/guilds/${guild}/roles`);
  for (const r of roles.sort((a, b) => b.position - a.position)) console.log(`${r.id}  ${r.name}`);
} else if (which === 'channels') {
  const channels = await api('GET', `/guilds/${guild}/channels`);
  const parents = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  for (const c of channels.filter((c) => c.type === 0 || c.type === 5 || c.type === 15)) {
    console.log(`${c.id}  ${parents.get(c.parent_id) ?? '—'} / #${c.name}`);
  }
} else if (which === 'register') {
  const done = await api('PUT', `/applications/${app}/guilds/${guild}/commands`, COMMANDS);
  console.log(`Registered ${done.map((c) => `/${c.name}`).join(', ')} in ${guild}.`);
} else {
  console.error('usage: node scripts/discord-setup.mjs roles | channels | register');
  process.exit(1);
}

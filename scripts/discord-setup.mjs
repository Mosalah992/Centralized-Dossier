#!/usr/bin/env node
// One-time Discord setup for the Scribe, after the Bruma Joint Archives'
// script. Run by the maintainer, not by members.
//
//   node scripts/discord-setup.mjs app          Ancarion's application id and public key (DISCORD_APP_ID, DISCORD_PUBLIC_KEY)
//   node scripts/discord-setup.mjs permissions  what the bot may do in each channel config/scribe.json posts to
//   node scripts/discord-setup.mjs roles        the server's roles and their ids, for config/scribe.json
//   node scripts/discord-setup.mjs channels     the server's text channels and their ids
//   node scripts/discord-setup.mjs archive-channels
//                                               one reports channel per wing in the Archive category,
//                                               made where missing; prints their ids for config/scribe.json
//   node scripts/discord-setup.mjs register     add /archives code and /report to the Embassy's server
//   node scripts/discord-setup.mjs endpoint     MOVE ANCARION'S INTERACTIONS ENDPOINT OFF THE QUARTERMASTER
//                                               onto https://thalmor-archives.com/api/discord/interactions
//
// The first four only read. `archive-channels` makes channels (2026-11-03, at
// the team's word), and only those it finds missing. `register` and `endpoint` change the application:
// run them at deploy, with the team's leave, once the site that answers is up.
// `endpoint` is the one that matters: from then on /clockin, /stock and every
// other quartermaster command reach the quartermaster only through the archive
// (functions/lib/interactions-relay.ts), and Discord tests the new address with
// a signed PING before it accepts it.
//
// THE SCRIBE RUNS ON ARCHIVIST ANCARION (2026-11-03), the Embassy's established
// bot. Its token is read from the environment or from .env (pass --env <path>
// to read another checkout's), under either name the repository has used,
// DISCORD_BOT_TOKEN or DISCORD_TOKEN: whichever Discord accepts, and the script
// says which. The application id is asked of Discord rather than configured.
// The token is read, used, and never printed.

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
const guild = process.env.DISCORD_GUILD_ID ?? '1498139135758831749';
const ENDPOINT = 'https://thalmor-archives.com/api/discord/interactions';

const candidates = ['DISCORD_BOT_TOKEN', 'DISCORD_TOKEN']
  .flatMap((key) => [
    [`${key} (environment)`, process.env[key]],
    [`${key} (${envFile})`, fileEnv[key]],
  ])
  .filter(([, value]) => value);

let token = null;
for (const [where, value] of candidates) {
  const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${value}` } });
  if (res.ok) {
    token = value;
    console.error(`Using the token in ${where}.`);
    break;
  }
  console.error(`The token in ${where} is refused (${res.status}).`);
}
if (!token) {
  console.error(`No working DISCORD_BOT_TOKEN or DISCORD_TOKEN in the environment or ${envFile}.`);
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
    description: 'Write a report, a board post, an application or a public request',
    contexts: [0],
  },
];

/**
 * The Archive category, and a channel in it for each wing the Scribe files
 * reports under (shared/filing.ts REPORT_WINGS), keyed as config/scribe.json
 * keys them. Each takes the category's own permissions, so it is as private.
 */
const ARCHIVE_CATEGORY = '1565081105462202500';
const WING_CHANNELS = [
  ['diplomatic', 'embassy-reports', 'Embassy reports, filed through the Scribe'],
  ['intelligence', 'intelligence-reports', 'Intelligence reports, filed through the Scribe'],
  ['military', 'military-reports', 'Military reports, filed through the Scribe'],
  ['logistics', 'logistics-reports', 'Logistics reports, filed through the Scribe'],
  ['auxiliary', 'auxiliary-reports', 'Auxiliary reports, filed through the Scribe'],
];

/**
 * What the bot needs in each archive channel: to see it, post the parchment,
 * reply to a filing with the Clerk's verdict, and ping the summoned roles,
 * which the Embassy keeps unmentionable.
 */
const NEEDS = {
  'View Channel': 1n << 10n,
  'Send Messages': 1n << 11n,
  'Attach Files': 1n << 15n,
  'Read Message History': 1n << 16n,
  'Mention All Roles': 1n << 17n,
};
const ADMINISTRATOR = 1n << 3n;

/** The bot's permissions in a channel, by Discord's own rules: roles, then @everyone, role and member overwrites. */
function effective(base, overwrites, roleIds, userId) {
  if (base & ADMINISTRATOR) return ~0n;
  let p = base;
  const everyone = overwrites.find((o) => o.id === guild);
  if (everyone) p = (p & ~BigInt(everyone.deny)) | BigInt(everyone.allow);
  let allow = 0n;
  let deny = 0n;
  for (const o of overwrites) {
    if (o.type === 0 && roleIds.includes(o.id)) {
      allow |= BigInt(o.allow);
      deny |= BigInt(o.deny);
    }
  }
  p = (p & ~deny) | allow;
  const member = overwrites.find((o) => o.type === 1 && o.id === userId);
  if (member) p = (p & ~BigInt(member.deny)) | BigInt(member.allow);
  return p;
}

const which = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--env');
if (which === 'app') {
  const app = await api('GET', '/applications/@me');
  console.log(`DISCORD_APP_ID     = "${app.id}"   (${app.name})`);
  console.log(`DISCORD_PUBLIC_KEY = "${app.verify_key}"`);
  console.log(`Interactions Endpoint URL now: ${app.interactions_endpoint_url ?? '(none)'}`);
} else if (which === 'permissions') {
  const config = JSON.parse(readFileSync(new URL('../config/scribe.json', import.meta.url), 'utf8'));
  const me = await api('GET', '/users/@me');
  const [roles, member] = await Promise.all([api('GET', `/guilds/${guild}/roles`), api('GET', `/guilds/${guild}/members/${me.id}`)]);
  const perms = new Map(roles.map((r) => [r.id, BigInt(r.permissions)]));
  const base = [guild, ...member.roles].reduce((p, id) => p | (perms.get(id) ?? 0n), 0n);
  let short = 0;
  for (const [category, id] of Object.entries(config.channels)) {
    if (!/^\d{17,20}$/.test(id)) continue;
    const channel = await api('GET', `/channels/${id}`);
    const p = effective(base, channel.permission_overwrites ?? [], member.roles, me.id);
    const missing = Object.entries(NEEDS).filter(([, bit]) => !(p & bit)).map(([name]) => name);
    if (missing.length) short++;
    console.log(`${missing.length ? 'MISSING' : 'ok     '}  ${category.padEnd(16)} #${channel.name}${missing.length ? `  (${missing.join(', ')})` : ''}`);
  }
  console.log(short ? `\n${me.username} lacks permissions in ${short} channel(s).` : `\n${me.username} may post in every channel.`);
} else if (which === 'roles') {
  const roles = await api('GET', `/guilds/${guild}/roles`);
  for (const r of roles.sort((a, b) => b.position - a.position)) console.log(`${r.id}  ${r.name}${r.mentionable ? '' : '  (not mentionable)'}`);
} else if (which === 'channels') {
  const channels = await api('GET', `/guilds/${guild}/channels`);
  const parents = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  for (const c of channels.filter((c) => c.type === 0 || c.type === 5 || c.type === 15)) {
    console.log(`${c.id}  ${parents.get(c.parent_id) ?? '—'} / #${c.name}`);
  }
} else if (which === 'archive-channels') {
  const channels = await api('GET', `/guilds/${guild}/channels`);
  const category = channels.find((c) => c.id === ARCHIVE_CATEGORY && c.type === 4);
  if (!category) throw new Error(`No category ${ARCHIVE_CATEGORY} in the server.`);
  for (const [wing, name, topic] of WING_CHANNELS) {
    const kept = channels.find((c) => c.parent_id === ARCHIVE_CATEGORY && c.name === name);
    const channel =
      kept ??
      (await api('POST', `/guilds/${guild}/channels`, {
        name,
        type: 0,
        topic,
        parent_id: ARCHIVE_CATEGORY,
        permission_overwrites: category.permission_overwrites ?? [],
      }));
    console.log(`${kept ? 'kept   ' : 'created'}  "${wing}": "${channel.id}"   ${category.name} / #${channel.name}`);
  }
} else if (which === 'register') {
  const app = await api('GET', '/applications/@me');
  for (const command of COMMANDS) {
    // POST creates the command, or overwrites the one of the same name. The
    // application's list is never replaced, so /clockin, /stock and the
    // quartermaster's other commands stay registered as they are.
    const done = await api('POST', `/applications/${app.id}/guilds/${guild}/commands`, command);
    console.log(`Registered /${done.name} in ${guild}.`);
  }
} else if (which === 'endpoint') {
  const app = await api('PATCH', '/applications/@me', { interactions_endpoint_url: ENDPOINT });
  console.log(`${app.name} now sends its interactions to ${app.interactions_endpoint_url}; the archive hands the quartermaster its own.`);
} else {
  console.error('usage: node scripts/discord-setup.mjs app | permissions | roles | channels | archive-channels | register | endpoint [--env <path to .env>]');
  process.exit(1);
}

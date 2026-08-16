// Grants — and revokes — the archivist bot read access to the Informants
// report channels.
//
//   node scripts/informant-access.mjs --grant
//   node scripts/informant-access.mjs --revoke
//
// Why this exists at all: the Informants *category* carries a member overwrite
// for the bot with View Channel + Read Message History, but every report
// channel under it has its own overwrites, and a channel with its own
// overwrites stops inheriting from its category. So the category grant is
// real and also inert, and each channel answers 403 Missing Access.
//
// The narrow fix is a per-channel member overwrite carrying those same two
// bits and nothing else. Deliberately *not* done by adding the bot to
// Inquisitor or Thalmor Agency: those roles are allowed on these channels but
// carry broad staff permissions, and a read-only export has no business
// holding them.
//
// --grant records every overwrite it creates in tmp/informants/_granted.json,
// and --revoke deletes only those. A channel that already had a bot overwrite
// before we arrived is left alone in both directions — this script must not be
// able to remove access it did not add.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'tmp', 'informants', '_granted.json');

const GUILD = '1498139135758831749';
const CATEGORY = '1498207051762106438';

// VIEW_CHANNEL (1 << 10) | READ_MESSAGE_HISTORY (1 << 16). Read, and only read.
const ALLOW = String((1 << 10) | (1 << 16));

const mode = process.argv.includes('--revoke')
  ? 'revoke'
  : process.argv.includes('--grant')
    ? 'grant'
    : null;

if (!mode) {
  console.error('Pass --grant or --revoke.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const TOKEN = env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('No DISCORD_TOKEN in .env.');
  process.exit(1);
}

async function api(pathname, init = {}) {
  for (;;) {
    const res = await fetch(`https://discord.com/api/v10${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
        'X-Audit-Log-Reason': 'Thalmor Archives: read-only report export',
        ...(init.headers || {}),
      },
    });

    if (res.status === 429) {
      const { retry_after: wait = 1 } = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, (wait + 0.2) * 1000));
      continue;
    }
    if (res.status === 204) return true;
    if (!res.ok) throw new Error(`${pathname} -> ${res.status} ${await res.text()}`);
    return res.json();
  }
}

const me = await api('/users/@me');
const channels = await api(`/guilds/${GUILD}/channels`);
const reports = channels
  .filter((c) => c.parent_id === CATEGORY && (c.type === 0 || c.type === 5))
  .sort((a, b) => a.position - b.position);

if (mode === 'grant') {
  const created = [];
  let preexisting = 0;

  for (const c of reports) {
    // Read the channel's own overwrites from the guild listing, which the bot
    // can see even where the channel itself is unreadable.
    const already = (c.permission_overwrites || []).some((o) => o.id === me.id && o.type === 1);
    if (already) {
      preexisting++;
      console.log(`  ${c.name.padEnd(24)} already had an overwrite — left alone`);
      continue;
    }

    await api(`/channels/${c.id}/permissions/${me.id}`, {
      method: 'PUT',
      body: JSON.stringify({ type: 1, allow: ALLOW, deny: '0' }),
    });
    created.push({ id: c.id, name: c.name });
    console.log(`  ${c.name.padEnd(24)} granted view + read history`);
  }

  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(created, null, 2));
  console.log(
    `\nGranted on ${created.length} channels` +
      `${preexisting ? `, ${preexisting} already had one` : ''}.` +
      `\nRevoke with: node scripts/informant-access.mjs --revoke`,
  );
} else {
  if (!fs.existsSync(LEDGER)) {
    console.error('No tmp/informants/_granted.json — nothing this script created to revoke.');
    process.exit(1);
  }
  const created = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));

  for (const c of created) {
    await api(`/channels/${c.id}/permissions/${me.id}`, { method: 'DELETE' });
    console.log(`  ${c.name.padEnd(24)} overwrite removed`);
  }

  fs.rmSync(LEDGER);
  console.log(`\nRevoked on ${created.length} channels.`);
}

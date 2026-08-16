// Dumps every message under the Informants category to tmp/informants/ as raw
// JSON, one file per channel, plus a manifest.
//
// This is the *unredacted* half of the pipeline and its output is deliberately
// gitignored (tmp/ already carries member data from the sheet dumps). The raw
// payloads hold Discord IDs, handles, global names and signed CDN attachment
// URLs — none of which may reach a committed file. Redaction happens in
// build-informant-history.mjs, which reads only from here.
//
// Split in two so the rewrite can be iterated on without re-fetching ~50
// channels each time.
//
//   node scripts/dump-informant-reports.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tmp', 'informants');

// The category the bot was granted, and the guild the archive already sources
// its press history from.
const CATEGORY = '1498207051762106438';

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const TOKEN = env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('No DISCORD_TOKEN in .env — cannot reach Discord.');
  process.exit(1);
}

// Discord's per-route buckets are not worth modelling for a one-shot dump; we
// just honour retry_after when it tells us we were too eager.
async function api(pathname) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://discord.com/api/v10${pathname}`, {
      headers: { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'ThalmorArchives/1.0' },
    });

    if (res.status === 429) {
      const { retry_after: wait = 1 } = await res.json().catch(() => ({}));
      console.warn(`  rate limited, waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, (wait + 0.2) * 1000));
      continue;
    }

    // 403 is expected and survivable: the bot may sit in the category without
    // read access to every channel in it. Record the gap, keep going.
    if (res.status === 403 || res.status === 404) return null;

    if (!res.ok) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(`${pathname} -> ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// Messages come newest-first in pages of 100; `before` walks backwards through
// the channel until a short page ends it.
//
// Returns null — distinct from [] — when the channel is unreadable. A denied
// channel and an empty one are the same zero on a summary line, and conflating
// them is how a partial export gets mistaken for a complete one.
async function allMessages(channelId) {
  const out = [];
  let before = null;

  for (;;) {
    const page = await api(
      `/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ''}`,
    );
    if (page === null) return before === null ? null : out.reverse();
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].id;
  }

  // Oldest first — the history reads forward.
  return out.reverse();
}

async function threadsOf(channelId) {
  const found = [];

  const active = await api(`/guilds/${GUILD}/threads/active`);
  if (active) found.push(...active.threads.filter((t) => t.parent_id === channelId));

  for (const kind of ['public', 'private']) {
    const archived = await api(`/channels/${channelId}/threads/archived/${kind}`);
    if (archived) found.push(...archived.threads);
  }

  // Active and archived listings can overlap.
  return [...new Map(found.map((t) => [t.id, t])).values()];
}

const GUILD = '1498139135758831749';

const channels = await api(`/guilds/${GUILD}/channels`);
if (!channels) {
  console.error('Cannot list guild channels — is the bot still in the guild?');
  process.exit(1);
}

const category = channels.find((c) => c.id === CATEGORY);
const kids = channels
  .filter((c) => c.parent_id === CATEGORY && (c.type === 0 || c.type === 5))
  .sort((a, b) => a.position - b.position);

console.log(`Category "${category?.name ?? CATEGORY}" — ${kids.length} channels\n`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const manifest = [];

for (const channel of kids) {
  const threads = await threadsOf(channel.id);
  const sources = [
    { id: channel.id, name: channel.name, thread: false },
    ...threads.map((t) => ({ id: t.id, name: t.name, thread: true })),
  ];

  const messages = [];
  let denied = false;

  for (const source of sources) {
    const got = await allMessages(source.id);
    if (got === null) {
      denied = true;
      continue;
    }
    for (const m of got) messages.push({ ...m, _source: source.name, _thread: source.thread });
  }

  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const file = `${channel.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(messages, null, 2));

  manifest.push({
    id: channel.id,
    name: channel.name,
    file,
    threads: threads.length,
    messages: messages.length,
    denied,
    first: messages[0]?.timestamp ?? null,
    last: messages[messages.length - 1]?.timestamp ?? null,
  });

  console.log(
    `  ${channel.name.padEnd(24)} ${String(messages.length).padStart(5)} msgs` +
      `${threads.length ? ` (+${threads.length} threads)` : ''}${denied ? '  [PARTIAL: access denied]' : ''}`,
  );
}

fs.writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 2));

const total = manifest.reduce((n, c) => n + c.messages, 0);
console.log(`\n${total} messages across ${manifest.length} channels -> tmp/informants/`);

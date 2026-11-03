// The Scribe's server side, without Cloudflare: Discord's signatures and role
// map, codes and the seal, the /report wizard's steps, and filing.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { incidentNow, type Filing, type FilingStamp } from '../shared/filing';
import { parseReportRecord } from '../shared/reports';
import { wingOf } from '../shared/wings';
import { channelFor, grantFor, scribeConfig, summonsFor, verifyDiscord } from '../functions/lib/discord';
import {
  CODE_ATTEMPTS,
  admitHolder,
  codeHash,
  count,
  issueSeal,
  newCode,
  normalizeCode,
  overLimit,
  readSeal,
  type CodeHolder,
  type CodeStore,
} from '../functions/lib/codes';
import {
  categoriesFor,
  checkSoFar,
  choose,
  modalValues,
  modalWho,
  readCustomId,
  readHour,
  stepPreview,
  stepWhat,
  stepWhen,
} from '../functions/lib/report-wizard';
import {
  announceStamp,
  announcement,
  cabinetEntry,
  filingEmbed,
  plain,
  prose,
  publish,
  record,
  stampFiling,
  verdict,
  type CabinetEntry,
  type FilingRecord,
  type FilingStore,
} from '../functions/lib/scribe';
import type { AttemptStore } from '../functions/lib/reports';
import { boardSummary, noticeOf } from '../functions/lib/board';
import { clerkTable } from '../functions/lib/clerk';
import { QUARTERMASTER_DOWN, RELAY_TIMEOUT_MS, forwardInteraction, isScribeInteraction } from '../functions/lib/interactions-relay';
import { SAMPLES } from './scribe-samples';

const ROLE = { justiciar: '111111111111111111', agent: '222222222222222222', command: '333333333333333333', all: '444444444444444444' };
const CHANNEL = '555555555555555555';
const ORIGIN = 'https://thalmor-archives.com';
const config = scribeConfig({
  roles: {
    [ROLE.justiciar]: { rank: 'Justiciar', office: 'Thalmor Embassy', precedence: 50 },
    [ROLE.agent]: { rank: 'Agent', office: 'Thalmor Embassy', precedence: 10 },
    REPLACE_WITH_ROLE_ID: { rank: 'Nobody', office: '', precedence: 99 },
  },
  summons: { command: [ROLE.command, 'REPLACE_WITH_DEPARTMENT_HEADS_ROLE_ID'], all: [ROLE.all] },
  channels: { military: CHANNEL, application: CHANNEL, bulletin: 'REPLACE_WITH_BULLETIN_CHANNEL_ID', troops: '777777777777777777' },
});

const troops = SAMPLES[0]!.request.filing;

describe('the role map', () => {
  it('keeps only real Discord ids, so placeholders read as nothing configured', () => {
    expect([...config.roles.keys()]).toEqual([ROLE.justiciar, ROLE.agent]);
    expect(config.summons.command).toEqual([ROLE.command]);
    // A key the Scribe does not post under (an old kind's) is dropped too.
    expect(config.channels).toEqual({ military: CHANNEL, application: CHANNEL });
    expect(Object.keys(scribeConfig().channels).sort()).toEqual(
      ['application', 'auxiliary', 'bulletin', 'diplomatic', 'intelligence', 'logistics', 'military', 'public-request'],
    );
    expect(channelFor({ category: 'report', wing: 'military' }, config)).toBe(CHANNEL);
    expect(channelFor({ category: 'report', wing: 'auxiliary' }, config)).toBeNull();
    expect(channelFor({ category: 'application', wing: null }, config)).toBe(CHANNEL);
  });

  it('commits only Discord ids or REPLACE_WITH_ placeholders, so nothing is dropped by mistake', () => {
    const raw = JSON.parse(readFileSync('config/scribe.json', 'utf8')) as {
      roles: Record<string, unknown>;
      summons: Record<string, string[]>;
      channels: Record<string, string>;
    };
    const ids = [...Object.keys(raw.roles), ...Object.values(raw.summons).flat(), ...Object.values(raw.channels)];
    for (const id of ids) expect(id).toMatch(/^(\d{17,20}|REPLACE_WITH_[A-Z_]+)$/);
    const parsed = scribeConfig();
    expect(parsed.roles.size).toBe(Object.keys(raw.roles).filter((id) => /^\d+$/.test(id)).length);
    for (const role of parsed.roles.values()) expect(role.rank.length).toBeGreaterThan(0);
  });

  it('gives a member the rank of their highest role, and none without a mapped role', () => {
    expect(grantFor([ROLE.agent, ROLE.justiciar], config.roles)?.rank).toBe('Justiciar');
    expect(grantFor(['999999999999999999'], config.roles)).toBeNull();
  });

  it('pings by level, and only the configured roles', () => {
    expect(summonsFor('none', config)).toEqual({ roles: [], line: '' });
    expect(summonsFor('command', config)).toEqual({ roles: [ROLE.command], line: `<@&${ROLE.command}>` });
    expect(summonsFor('all', config).roles).toEqual([ROLE.all]);
  });
});

describe('Discord’s signature', () => {
  const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

  it('admits a signed interaction and refuses a tampered, stale or unsigned one', async () => {
    const keys = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const publicKey = hex(await crypto.subtle.exportKey('raw', keys.publicKey));
    const body = '{"type":1}';
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1000));
    const signature = hex(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(timestamp + body)));

    expect(await verifyDiscord(publicKey, signature, timestamp, body, now)).toBe(true);
    expect(await verifyDiscord(publicKey, signature, timestamp, '{"type":2}', now)).toBe(false);
    expect(await verifyDiscord(publicKey, signature, timestamp, body, now + 10 * 60_000)).toBe(false);
    expect(await verifyDiscord('REPLACE_WITH_DISCORD_PUBLIC_KEY', signature, timestamp, body, now)).toBe(false);
  });
});

describe('codes and the seal', () => {
  it('issues codes that are easy to copy and stored only as an HMAC', async () => {
    const code = newCode();
    expect(code).toMatch(/^THM-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);
    expect(normalizeCode(` ${code.toLowerCase().replace(/-/g, ' ')} `)).toBe(code.replace(/-/g, ''));
    const hash = await codeHash('pepper', normalizeCode(code));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(normalizeCode(code));
    expect(await codeHash('other pepper', normalizeCode(code))).not.toBe(hash);
  });

  it('seals a browser to a code, and nothing forged, expired or re-peppered opens it', async () => {
    const now = Date.now();
    const token = await issueSeal('pepper', 42, now);
    expect(await readSeal('pepper', token, now)).toBe(42);
    expect(await readSeal('pepper', token, now + 3 * 60 * 60_000)).toBeNull();
    expect(await readSeal('another pepper', token, now)).toBeNull();
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ c: 1, exp: Math.floor(now / 1000) + 600, s: 'scribe' })).replace(/=+$/, '');
    expect(await readSeal('pepper', `${forged}.${sig}`, now)).toBeNull();
    expect(await readSeal('pepper', `${body}.${sig!.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'))}`, now)).toBeNull();
    expect(await readSeal('pepper', null, now)).toBeNull();
  });

  function codeStore(): CodeStore & { revoked: number[] } {
    const revoked: number[] = [];
    return {
      revoked,
      issue: async () => {},
      byHash: async () => null,
      byId: async () => null,
      nameFor: async () => null,
      revoke: async (id) => {
        revoked.push(id);
      },
    };
  }
  const holder: CodeHolder = { id: 7, discordUserId: '666666666666666666', name: 'Celarwen' };
  const grantOf = (roles: string[]) => grantFor(roles, config.roles);

  it('asks Discord on every use: a member keeps it, one who left loses it, one without a role is refused', async () => {
    const store = codeStore();
    expect(await admitHolder(holder, store, async () => ({ kind: 'member', roles: [ROLE.agent] }), grantOf)).toMatchObject({
      ok: true,
      grant: { rank: 'Agent' },
    });
    expect(await admitHolder(holder, store, async () => ({ kind: 'member', roles: [] }), grantOf)).toMatchObject({ ok: false, reason: 'no-role' });
    expect(store.revoked).toEqual([]);
    expect(await admitHolder(holder, store, async () => ({ kind: 'gone' }), grantOf)).toMatchObject({ ok: false, reason: 'unknown-code' });
    expect(store.revoked).toEqual([7]);
    expect(await admitHolder(holder, store, async () => ({ kind: 'unknown' }), grantOf)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(await admitHolder(null, store, async () => ({ kind: 'member', roles: [ROLE.agent] }), grantOf)).toMatchObject({
      ok: false,
      reason: 'unknown-code',
    });
  });

  it('counts wrong codes per address, and refuses without the store', async () => {
    const kv = new Map<string, string>();
    const store: AttemptStore = { get: async (k) => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v) };
    const key = CODE_ATTEMPTS.key('203.0.113.9');
    for (let i = 0; i < CODE_ATTEMPTS.max; i++) {
      expect(await overLimit(store, key, CODE_ATTEMPTS.max)).toBe(false);
      await count(store, key, CODE_ATTEMPTS.window);
    }
    expect(await overLimit(store, key, CODE_ATTEMPTS.max)).toBe(true);
    expect(await overLimit(undefined, key, CODE_ATTEMPTS.max)).toBe(true);
  });
});

describe('the /report wizard', () => {
  const draft = { id: 'd1a2f3e4-5678-90ab-cdef-1234567890ab' };
  const next = (d: Parameters<typeof stepWhat>[0]) => JSON.stringify(stepWhat(d, true)).match(/"label":"Next","custom_id":"[^"]+","disabled":(true|false)/)?.[1];

  it('reads only its own custom ids', () => {
    expect(readCustomId(`scribe:cat:${draft.id}`)).toEqual({ step: 'cat', draftId: draft.id });
    expect(readCustomId('scribe:cat:x')).toBeNull();
    expect(readCustomId('other:cat:abcdefgh12')).toBeNull();
  });

  it('offers someone without a commission only the open kinds, at the open levels', () => {
    expect(categoriesFor(false)).toEqual(['application', 'public-request']);
    expect(choose(draft, 'cat', 'report', false).category).toBeUndefined();
    const applying = choose(draft, 'cat', 'application', false);
    expect(choose(applying, 'lvl', 'cataclysm', false).importance).toBeUndefined();
    expect(choose(applying, 'lvl', 'notable', false).importance).toBe('notable');
  });

  it('clears a level the new kind cannot carry, and asks for a section only for the board', () => {
    const report = choose(choose(draft, 'cat', 'report', true), 'lvl', 'cataclysm', true);
    expect(report.importance).toBe('cataclysm');
    expect(choose(report, 'cat', 'public-request', true).importance).toBeUndefined();
    const post = choose(choose(draft, 'cat', 'bulletin', true), 'lvl', 'routine', true);
    expect(next(post)).toBe('true');
    expect(next(choose(post, 'sec', 'festivities', true))).toBe('false');
    expect(next(choose(post, 'sec', 'bounties', true))).toBe('true');
  });

  it('asks a report for its wing and its kind, in five rows at most', () => {
    const report = choose(choose(draft, 'cat', 'report', true), 'lvl', 'routine', true);
    const rows = (d: typeof report) => (stepWhat(d, true).components as { components: { custom_id: string; options?: { label: string }[] }[] }[]);
    expect(rows(report)).toHaveLength(5);
    expect(rows(report)[1]!.components[0]!.options!.map((o) => o.label)).toEqual(['Embassy', 'Intelligence', 'Military', 'Logistics', 'Auxiliary']);
    expect(rows(report)[2]!.components[0]!.options).toHaveLength(8);
    expect(next(report)).toBe('true');
    const filed = choose(choose(report, 'wing', 'auxiliary', true), 'kind', 'intelligence', true);
    expect(filed).toMatchObject({ wing: 'auxiliary', kind: 'intelligence' });
    expect(next(filed)).toBe('false');
    expect(choose(filed, 'wing', 'scholarship', true).wing).toBe('auxiliary');
    // Another kind of filing forgets the wing and the kind.
    expect(choose(filed, 'cat', 'bulletin', true)).toMatchObject({ wing: null, kind: null });
  });

  it('asks a rank of members only', () => {
    const required = (d: Parameters<typeof modalWho>[0]) =>
      (modalWho(d).components as { components: { custom_id: string; required: boolean }[] }[])[0]!.components[0]!.required;
    expect(required({ ...draft, category: 'report' })).toBe(true);
    expect(required({ ...draft, category: 'application' })).toBe(false);
    expect(modalValues({ components: [{ components: [{ custom_id: 'rank', value: 'Agent' }] }] })).toEqual({ rank: 'Agent' });
  });

  it('judges a step by its own fields only', () => {
    const partial = {
      ...draft,
      category: 'report' as const,
      wing: 'military' as const,
      kind: 'activity' as const,
      importance: 'routine' as const,
      rank: 'Agent',
      name: 'Celarwen',
      title: '',
    };
    expect(checkSoFar(partial, ['title'])).toMatchObject({ ok: false });
    expect(checkSoFar({ ...partial, title: 'A patrol' }, ['rank', 'name', 'superior', 'title'])).toMatchObject({ ok: true });
  });

  it('reads the hour as members write it', () => {
    const now = { year: 226, monthIndex: 9, day: 4, hour: 18, minute: 4 };
    expect(readHour({ month: 'heart', day: '12', clock: '6:30 pm' }, now)).toEqual({ year: 226, monthIndex: 9, day: 12, hour: 18, minute: 30 });
    expect(readHour({ month: "Sun's Dawn", day: '28', clock: '00:15' }, now)).toMatchObject({ monthIndex: 2, hour: 0, minute: 15 });
    expect(readHour({ month: '1', day: '1', clock: '12am' }, now)).toMatchObject({ monthIndex: 1, hour: 0, minute: 0 });
    expect(readHour({ month: 'Midyear', day: '1', clock: '9' }, now)).toHaveProperty('error');
    expect(readHour({ month: "Sun's Dawn", day: '29', clock: '9:00' }, now)).toHaveProperty('error');
    expect(readHour({ month: 'Heartfire', day: '1', clock: '13 pm' }, now)).toHaveProperty('error');
  });
});

function memoryFilings(): FilingStore & { rows: FilingRecord[]; entries: CabinetEntry[] } {
  const rows: FilingRecord[] = [];
  const entries: CabinetEntry[] = [];
  return {
    rows,
    entries,
    async insert(filing, door, filerDiscordId, filedAt) {
      const id = rows.length + 1;
      rows.push({ id, filing, door, filerDiscordId, stamp: null, stampedAt: null, filedAt, discordChannelId: null, discordMessageId: null, reportId: null });
      return id;
    },
    async get(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async posted(id, channelId, messageId) {
      Object.assign(rows[id - 1]!, { discordChannelId: channelId, discordMessageId: messageId });
    },
    async enter(id, entry) {
      entries.push(entry);
      rows[id - 1]!.reportId = entry.id;
    },
    async stamp(id, stamp: FilingStamp, stampedAt) {
      const row = rows[id - 1]!;
      if (row.stamp) return false;
      Object.assign(row, { stamp, stampedAt });
      return true;
    },
    unstamped: async () => [],
    recentlyStamped: async () => [],
    boardCounts: async () => [],
    board: async () => [],
  };
}

describe('filing', () => {
  it('enters a report in the Cabinet under its wing, with its fields laid out as a record', () => {
    const entry = cabinetEntry(9, troops, '2026-11-02T12:00:00.000Z', CHANNEL)!;
    expect(entry).toMatchObject({ id: 'scribe-9', category: 'Military', subcategory: 'Inspection Report', severity: 'low', authorName: troops.name });
    expect(wingOf(entry.category)).toBe('military');
    const fields = parseReportRecord(entry.body).filter((b) => b.kind === 'field');
    expect(fields.map((f) => f.kind === 'field' && f.label)).toEqual(['Entry', 'Rank', 'Incident', 'Answering to', 'Importance']);
    expect(entry.body.endsWith(troops.body)).toBe(true);
    expect(cabinetEntry(9, { ...troops, category: 'bulletin', section: 'propaganda' }, '', null)).toBeNull();
    expect(cabinetEntry(9, { ...troops, category: 'application' }, '', null)).toBeNull();
  });

  it('pings only the summoned roles, names the filer without pinging them, and never parses a filer’s mentions', () => {
    const base: FilingRecord = {
      id: 3,
      filing: { ...troops, importance: 'strategic', title: '@everyone **look** <@&1>' },
      door: 'discord',
      filerDiscordId: '666666666666666666',
      stamp: null,
      stampedAt: null,
      filedAt: '',
      discordChannelId: null,
      discordMessageId: null,
      reportId: null,
    };
    const post = announcement(base, config, ORIGIN) as { content: string; allowed_mentions: { parse: string[]; roles: string[] }; embeds: { title: string }[] };
    expect(post.allowed_mentions).toEqual({ parse: [], roles: [ROLE.command] });
    expect(post.content.startsWith(`<@&${ROLE.command}>`)).toBe(true);
    expect(post.content).toContain('Filed by <@666666666666666666>.');
    expect(JSON.stringify(post)).not.toContain('@everyone');
    expect(post.embeds[0]!.title).toBe('@​everyone \\*\\*look\\*\\* <@​&1\\>');
    expect(plain('**a** @here')).toBe('\\*\\*a\\*\\* @​here');
    const routine = announcement({ ...base, filing: troops, filerDiscordId: null, door: 'web' }, config, ORIGIN) as { allowed_mentions: { roles: string[] } };
    expect(routine.allowed_mentions.roles).toEqual([]);
  });

  it('posts the filing as an embed of its parchment’s parts, linked to the parchment on the site', () => {
    const filed: FilingRecord = {
      id: 12,
      filing: { ...troops, body: 'First [click](https://evil.example) @here.\n\n\n\nSecond.' },
      door: 'discord',
      filerDiscordId: '666666666666666666',
      stamp: null,
      stampedAt: null,
      filedAt: '2026-11-02T12:00:00.000Z',
      discordChannelId: null,
      discordMessageId: null,
      reportId: null,
    };
    const post = announcement(filed, config, ORIGIN) as {
      embeds: Record<string, unknown>[];
      components: { components: { style: number; url: string }[] }[];
    };
    const embed = post.embeds[0] as { author: { name: string }; url: string; description: string; color: number; fields: { name: string; value: string }[]; timestamp: string };
    expect(embed.author.name).toBe('Thalmor Embassy · Entry No. 12');
    expect(embed.url).toBe(`${ORIGIN}/filings/12`);
    expect(post.components[0]!.components[0]).toMatchObject({ style: 5, url: `${ORIGIN}/filings/12` });
    // The body keeps its paragraphs, but no masked link and no mention survive.
    expect(embed.description).toBe('First \\[click\\](https://evil.example) @​here.\n\nSecond.');
    expect(embed.color).toBe(0x58703c);
    expect(embed.timestamp).toBe(filed.filedAt);
    expect(Object.fromEntries(embed.fields.map((f) => [f.name, f.value]))).toMatchObject({
      'Inspection Report': 'To the Military Wing',
      Importance: 'Standard Routine',
      Signed: `${troops.rank} ${troops.name}`,
      'Answering to': troops.superior,
    });
    expect(prose('a\n\n\n\nb')).toBe('a\n\nb');
    // A preview is a draft, linked to nothing yet; a stamped filing shows the Clerk's seal.
    const draft = filingEmbed({ filing: troops, serial: null, stamp: null }, null) as { author: { name: string }; url?: string };
    expect(draft.author.name).toBe('Thalmor Embassy · Draft');
    expect(draft.url).toBeUndefined();
    const stamped = filingEmbed({ filing: troops, serial: 12, stamp: { mark: 'denied', at: troops.time } }, null) as { fields: { name: string; value: string }[] };
    expect(stamped.fields.at(-1)).toEqual({ name: 'The Clerk’s seal', value: expect.stringMatching(/^Denied, /), inline: true });
  });

  it('previews the post in the wizard’s last step, and clears it on any other', () => {
    const draft = { id: 'd1a2f3e4-5678', ...troops };
    const last = stepPreview(draft, troops) as { embeds: unknown[]; components: { components: { label: string }[] }[] };
    expect(last.embeds).toHaveLength(1);
    expect(last.components[0]!.components.map((c) => c.label)).toEqual(['File it', 'Edit', 'Cancel']);
    expect(stepWhat(draft, true)).toMatchObject({ embeds: [] });
    expect(stepWhen(draft, troops.time)).toMatchObject({ embeds: [] });
  });

  it('records, enters and posts a report, and posts nothing where no channel is set', async () => {
    const filings = memoryFilings();
    const posts: { channel: string; payload: Record<string, unknown> }[] = [];
    const deps = {
      filings,
      config,
      origin: ORIGIN,
      post: async (channel: string, payload: Record<string, unknown>) => {
        posts.push({ channel, payload });
        return '777777777777777777';
      },
    };
    const id = await record(deps, troops, 'web', '666666666666666666');
    expect(filings.entries).toHaveLength(1);
    expect(await publish(deps, id)).toBe(true);
    expect(posts[0]).toMatchObject({ channel: CHANNEL, payload: { embeds: [{ url: `${ORIGIN}/filings/${id}` }] } });
    expect(filings.rows[0]).toMatchObject({ discordChannelId: CHANNEL, discordMessageId: '777777777777777777' });

    // The verdict answers the filing's own post, and links to the stamped parchment.
    expect(await stampFiling(deps, id, 'approved', new Date('2026-11-02T18:00:00.000Z'))).toMatchObject({ ok: true });
    expect(await announceStamp(deps, filings.rows[0]!)).toBe(true);
    expect(posts[1]).toMatchObject({
      channel: CHANNEL,
      payload: {
        content: expect.stringContaining('Approved by High Command'),
        message_reference: { message_id: '777777777777777777' },
        components: [{ components: [{ url: `${ORIGIN}/filings/${id}` }] }],
      },
    });
    expect(verdict({ ...filings.rows[0]!, discordMessageId: null }, ORIGIN)).not.toHaveProperty('message_reference');

    const post: Filing = { ...troops, category: 'bulletin', section: 'propaganda' };
    const second = await record(deps, post, 'web', '666666666666666666');
    expect(filings.entries).toHaveLength(1);
    expect(await publish(deps, second)).toBe(false);
    expect(posts).toHaveLength(2);
  });

  it('presses a stamp once, at the realm’s hour', async () => {
    const filings = memoryFilings();
    const id = await record({ filings, config }, { ...troops, category: 'application', rank: '' }, 'web', null);
    const at = new Date('2026-11-02T18:00:00.000Z');
    const first = await stampFiling({ filings }, id, 'approved', at);
    expect(first).toMatchObject({ ok: true, record: { stamp: { mark: 'approved', at: incidentNow(at.getTime()) } } });
    expect(await stampFiling({ filings }, id, 'denied', at)).toMatchObject({ ok: false, status: 409 });
    expect(await stampFiling({ filings }, 99, 'denied', at)).toMatchObject({ ok: false, status: 404 });
  });
});

describe('the board and the Clerk Table', () => {
  const record = (over: Partial<FilingRecord> = {}): FilingRecord => ({
    id: 5,
    filing: { ...troops, category: 'bulletin', section: 'festivities' },
    door: 'web',
    filerDiscordId: '666666666666666666',
    stamp: null,
    stampedAt: null,
    filedAt: '2026-11-02T19:45:00.000Z',
    discordChannelId: null,
    discordMessageId: null,
    reportId: null,
    ...over,
  });

  it('hangs every section, counting the Scribe’s posts, and signs a notice in-world', async () => {
    const sections = await boardSummary({ boardCounts: async () => [{ section: 'festivities', count: 2, latestAt: '2026-11-02T19:45:00.000Z' }] });
    expect(sections.map((s) => s.id)).toEqual(['propaganda', 'recruitment', 'festivities', 'standing-orders', 'spiritual-guidance', 'bounties']);
    expect(sections.find((s) => s.id === 'festivities')).toMatchObject({ count: 2, latestAt: '2026-11-02T19:45:00.000Z' });
    const notice = noticeOf(record(), 'festivities');
    expect(notice).toMatchObject({ id: 5, postedBy: `${troops.rank} ${troops.name}`, stamp: 'aldmeri' });
    expect(JSON.stringify(notice)).not.toContain('666666666666666666');
  });

  it('asks the Clerk Table for open filings and summoning reports, and never shows a Discord id', async () => {
    let asked: unknown[] = [];
    const table = await clerkTable({
      unstamped: async (categories, levels) => {
        asked = [categories, levels];
        return [record({ filing: { ...troops, category: 'application', rank: '' } })];
      },
      recentlyStamped: async () => [record({ stamp: { mark: 'denied', at: troops.time }, stampedAt: '2026-11-02T20:00:00.000Z' })],
    });
    expect(asked).toEqual([['application', 'public-request'], ['strategic', 'cataclysm']]);
    // Each with what its parchment is drawn from, stamp and all.
    expect(table.waiting[0]).toMatchObject({ id: 5, signed: troops.name, stamp: null, parchment: { serial: 5, stamp: null, filing: { category: 'application' } } });
    expect(table.stamped[0]).toMatchObject({ stamp: 'denied', parchment: { serial: 5, stamp: { mark: 'denied' } } });
    expect(JSON.stringify(table)).not.toContain('666666666666666666');
  });
});

describe('the Scribe’s routes', () => {
  const source = (path: string) => readFileSync(path, 'utf8');

  it('answer privately, and write only same-site JSON', () => {
    for (const file of ['seal.ts', 'file.ts']) {
      const text = source(`functions/api/scribe/${file}`);
      expect(text, file).toContain('refuseForeignWrite(request)');
      expect(text, file).toContain('scribeJson(');
    }
    expect(source('functions/api/solar/clerk/[id].ts')).toMatch(/refuseWithoutSolarWrit[\s\S]*refuseForeignWrite\(request\)/);
    expect(source('functions/api/solar/clerk/index.ts')).toContain('refuseWithoutSolarWrit(');
  });

  it('check a sealed filing’s writ before answering it, and never let a sealed answer be cached', () => {
    const text = source('functions/api/filings/[id].ts');
    expect(text.indexOf('hasSolarWrit(')).toBeLessThan(text.indexOf('const view'));
    expect(text).toContain("'cache-control': 'private, no-store'");
    expect(text).toMatch(/shown \? \{ 'cache-control': 'public, max-age=60' \} : PRIVATE/);
    expect(text).not.toContain('caches.default');
  });

  it('draw nothing on the server: no drawing Worker is bound or called', () => {
    expect(source('wrangler.toml')).not.toMatch(/\[\[services\]\]|thalmor-scribe/);
    for (const file of ['functions/lib/scribe.ts', 'functions/lib/scribe-env.ts', 'functions/api/discord/interactions.ts']) {
      expect(source(file), file).not.toMatch(/SCRIBE\b|render|\.png/);
    }
  });

  it('verify Discord’s signature before reading an interaction', () => {
    const text = source('functions/api/discord/interactions.ts');
    expect(text.indexOf('verifyDiscord(')).toBeLessThan(text.indexOf('JSON.parse(body)'));
  });
});

describe('the relay to the quartermaster', () => {
  const body = '{"type":2,"data":{"name":"clockin","options":[{"name":"time","value":"18:00"}]},"token":"t","note":"ünïcödé"}';
  const raw = new TextEncoder().encode(body).buffer as ArrayBuffer;
  const signed = { raw, signature: 'ab'.repeat(64), timestamp: '1793650000', contentType: 'application/json' };
  const QM = 'https://thalmor-quartermaster.example.workers.dev';

  it('keeps the Scribe’s own interactions and hands on every other', () => {
    expect(isScribeInteraction({ type: 2, data: { name: 'report' } })).toBe(true);
    expect(isScribeInteraction({ type: 2, data: { name: 'archives' } })).toBe(true);
    expect(isScribeInteraction({ type: 4, data: { name: 'archives' } })).toBe(true);
    expect(isScribeInteraction({ type: 3, data: { custom_id: 'scribe:cat:d1a2f3e4-5678' } })).toBe(true);
    expect(isScribeInteraction({ type: 5, data: { custom_id: 'scribe:who:d1a2f3e4-5678' } })).toBe(true);
    expect(isScribeInteraction({ type: 2, data: { name: 'clockin' } })).toBe(false);
    expect(isScribeInteraction({ type: 2, data: { name: 'stock' } })).toBe(false);
    expect(isScribeInteraction({ type: 3, data: { custom_id: 'stock:page:2' } })).toBe(false);
    expect(isScribeInteraction({ type: 5, data: { custom_id: 'report-not-ours' } })).toBe(false);
  });

  it('hands on the body byte for byte, with Discord’s signature headers, and relays the answer as given', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response('{"type":4,"data":{"content":"Clocked in."}}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    const res = await forwardInteraction(QM, 2, signed, fake);
    expect(seen!.url).toBe(QM);
    expect(seen!.init.method).toBe('POST');
    expect(new Uint8Array(seen!.init.body as ArrayBuffer)).toEqual(new Uint8Array(raw));
    expect(seen!.init.headers).toMatchObject({
      'X-Signature-Ed25519': signed.signature,
      'X-Signature-Timestamp': signed.timestamp,
      'Content-Type': 'application/json',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(await res.text()).toBe('{"type":4,"data":{"content":"Clocked in."}}');
  });

  it('relays the quartermaster’s own refusal, and answers plainly when it fails, is missing or is too slow', async () => {
    const refusing = (async () => new Response('Bad signature', { status: 401, headers: { 'Content-Type': 'text/plain' } })) as unknown as typeof fetch;
    const refused = await forwardInteraction(QM, 2, signed, refusing);
    expect([refused.status, await refused.text()]).toEqual([401, 'Bad signature']);

    const plain = async (res: Response) => (await res.json()) as { type: number; data: { content?: string; flags?: number; choices?: unknown[] } };
    const failing = (async () => new Response('boom', { status: 502 })) as unknown as typeof fetch;
    expect(await plain(await forwardInteraction(QM, 2, signed, failing))).toEqual({
      type: 4,
      data: { content: QUARTERMASTER_DOWN, flags: 64, allowed_mentions: { parse: [] } },
    });
    const throwing = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect((await plain(await forwardInteraction(QM, 3, signed, throwing))).data.content).toBe(QUARTERMASTER_DOWN);

    let called = false;
    const never = (async () => {
      called = true;
      return new Response('{}');
    }) as unknown as typeof fetch;
    expect((await plain(await forwardInteraction(undefined, 2, signed, never))).data.content).toBe(QUARTERMASTER_DOWN);
    expect(called).toBe(false);

    const slow = ((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason)))) as unknown as typeof fetch;
    const started = Date.now();
    expect((await plain(await forwardInteraction(QM, 2, signed, slow, 30))).data.content).toBe(QUARTERMASTER_DOWN);
    expect(Date.now() - started).toBeLessThan(RELAY_TIMEOUT_MS);
    // Autocomplete may not answer with a message: it gets no choices instead.
    expect(await plain(await forwardInteraction(QM, 4, signed, slow, 30))).toEqual({ type: 8, data: { choices: [] } });
  });

  it('gives Discord’s three seconds a margin', () => {
    expect(RELAY_TIMEOUT_MS).toBeLessThanOrEqual(2600);
  });

  it('hands on before the Scribe consults anything of its own, and never its own commands', () => {
    const text = readFileSync('functions/api/discord/interactions.ts', 'utf8');
    const forward = text.indexOf('forwardInteraction(');
    expect(text.indexOf('verifyDiscord(')).toBeLessThan(forward);
    expect(text.indexOf('if (!isScribeInteraction(i))')).toBeLessThan(forward);
    expect(forward).toBeLessThan(text.indexOf('if (!env.REPORTS)'));
    expect(text).toContain('const raw = await request.arrayBuffer();');
  });
});

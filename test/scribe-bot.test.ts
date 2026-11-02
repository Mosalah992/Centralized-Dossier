// The Scribe's server side, without Cloudflare: Discord's signatures and role
// map, codes and the seal, the /report wizard's steps, and filing.

import { describe, expect, it } from 'vitest';

import { incidentNow, type Filing, type FilingStamp } from '../shared/filing';
import { parseReportRecord } from '../shared/reports';
import { wingOf } from '../shared/wings';
import { grantFor, scribeConfig, summonsFor, verifyDiscord } from '../functions/lib/discord';
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
  stepWhat,
} from '../functions/lib/report-wizard';
import {
  announcement,
  cabinetEntry,
  plain,
  publish,
  record,
  stampFiling,
  type CabinetEntry,
  type FilingRecord,
  type FilingStore,
} from '../functions/lib/scribe';
import type { AttemptStore } from '../functions/lib/reports';
import { SAMPLES } from '../scribe/samples';

const ROLE = { justiciar: '111111111111111111', agent: '222222222222222222', command: '333333333333333333', all: '444444444444444444' };
const CHANNEL = '555555555555555555';
const config = scribeConfig({
  roles: {
    [ROLE.justiciar]: { rank: 'Justiciar', office: 'Thalmor Embassy', precedence: 50 },
    [ROLE.agent]: { rank: 'Agent', office: 'Thalmor Embassy', precedence: 10 },
    REPLACE_WITH_ROLE_ID: { rank: 'Nobody', office: '', precedence: 99 },
  },
  summons: { command: [ROLE.command, 'REPLACE_WITH_DEPARTMENT_HEADS_ROLE_ID'], all: [ROLE.all] },
  channels: { troops: CHANNEL, application: CHANNEL, bulletin: 'REPLACE_WITH_BULLETIN_CHANNEL_ID' },
});

const troops = SAMPLES[0]!.request.filing;

describe('the role map', () => {
  it('keeps only real Discord ids, so placeholders read as nothing configured', () => {
    expect([...config.roles.keys()]).toEqual([ROLE.justiciar, ROLE.agent]);
    expect(config.summons.command).toEqual([ROLE.command]);
    expect(config.channels).toEqual({ troops: CHANNEL, application: CHANNEL });
    // The committed configuration is all placeholders until the team fills it in.
    expect(scribeConfig().roles.size).toBe(0);
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

  it('reads only its own custom ids', () => {
    expect(readCustomId(`scribe:cat:${draft.id}`)).toEqual({ step: 'cat', draftId: draft.id });
    expect(readCustomId('scribe:cat:x')).toBeNull();
    expect(readCustomId('other:cat:abcdefgh12')).toBeNull();
  });

  it('offers someone without a commission only the open kinds, at the open levels', () => {
    expect(categoriesFor(false)).toEqual(['application', 'public-request']);
    expect(choose(draft, 'cat', 'troops', false).category).toBeUndefined();
    const applying = choose(draft, 'cat', 'application', false);
    expect(choose(applying, 'lvl', 'cataclysm', false).importance).toBeUndefined();
    expect(choose(applying, 'lvl', 'notable', false).importance).toBe('notable');
  });

  it('clears a level the new kind cannot carry, and asks for a section only for the board', () => {
    const report = choose(choose(draft, 'cat', 'troops', true), 'lvl', 'cataclysm', true);
    expect(report.importance).toBe('cataclysm');
    expect(choose(report, 'cat', 'public-request', true).importance).toBeUndefined();
    const post = choose(choose(draft, 'cat', 'bulletin', true), 'lvl', 'routine', true);
    const next = (d: typeof post) => JSON.stringify(stepWhat(d, true)).match(/"label":"Next","custom_id":"[^"]+","disabled":(true|false)/)?.[1];
    expect(next(post)).toBe('true');
    expect(next(choose(post, 'sec', 'festivities', true))).toBe('false');
    expect(next(choose(post, 'sec', 'bounties', true))).toBe('true');
  });

  it('asks a rank of members only', () => {
    const required = (d: Parameters<typeof modalWho>[0]) =>
      (modalWho(d).components as { components: { custom_id: string; required: boolean }[] }[])[0]!.components[0]!.required;
    expect(required({ ...draft, category: 'troops' })).toBe(true);
    expect(required({ ...draft, category: 'application' })).toBe(false);
    expect(modalValues({ components: [{ components: [{ custom_id: 'rank', value: 'Agent' }] }] })).toEqual({ rank: 'Agent' });
  });

  it('judges a step by its own fields only', () => {
    const partial = { ...draft, category: 'troops' as const, importance: 'routine' as const, rank: 'Agent', name: 'Celarwen', title: '' };
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
    expect(entry).toMatchObject({ id: 'scribe-9', category: 'Military', subcategory: 'Troops Report', severity: 'low', authorName: troops.name });
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
    const post = announcement(base, config) as { content: string; allowed_mentions: { parse: string[]; roles: string[] } };
    expect(post.allowed_mentions).toEqual({ parse: [], roles: [ROLE.command] });
    expect(post.content.startsWith(`<@&${ROLE.command}>`)).toBe(true);
    expect(post.content).toContain('Filed by <@666666666666666666>.');
    expect(post.content).not.toContain('@everyone');
    expect(plain('**a** @here')).toBe('\\*\\*a\\*\\* @​here');
    const routine = announcement({ ...base, filing: troops, filerDiscordId: null, door: 'web' }, config) as { allowed_mentions: { roles: string[] } };
    expect(routine.allowed_mentions.roles).toEqual([]);
  });

  it('records, enters and posts a report, and posts nothing where no channel is set', async () => {
    const filings = memoryFilings();
    const posts: { channel: string; payload: Record<string, unknown>; file?: unknown }[] = [];
    const deps = {
      filings,
      config,
      render: async () => new Uint8Array([137, 80, 78, 71]),
      post: async (channel: string, payload: Record<string, unknown>, file?: unknown) => {
        posts.push({ channel, payload, file });
        return '777777777777777777';
      },
    };
    const id = await record(deps, troops, 'web', '666666666666666666');
    expect(filings.entries).toHaveLength(1);
    expect(await publish(deps, id)).toBe(true);
    expect(posts[0]).toMatchObject({ channel: CHANNEL, file: { name: `thalmor-entry-${id}.png`, type: 'image/png' } });
    expect(filings.rows[0]).toMatchObject({ discordChannelId: CHANNEL, discordMessageId: '777777777777777777' });

    const post: Filing = { ...troops, category: 'bulletin', section: 'propaganda' };
    const second = await record(deps, post, 'web', '666666666666666666');
    expect(filings.entries).toHaveLength(1);
    expect(await publish(deps, second)).toBe(false);
    expect(posts).toHaveLength(1);
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

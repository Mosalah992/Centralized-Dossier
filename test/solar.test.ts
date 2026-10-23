import { describe, expect, it } from 'vitest';

import { PIN_LIMITS, checkPin, type SolarPin } from '../shared/solar';
import { SOLAR_COOKIE_NAME, SOLAR_SCOPE, REPORTS_SCOPE, issueWrit } from '../functions/lib/session';
import { handlePin, handlePins, type PinStore } from '../functions/lib/solar-pins';
import { isForeign } from '../functions/lib/solar';

/**
 * The Solar's war table: the pieces High Command sets on the realm map, kept
 * behind the Solar's own writ and changed only from the archive's own pages.
 */

const SECRET = 'solar-cookie-secret';
const env = { SOLAR_COOKIE_SECRET: SECRET, SOLAR_PASSPHRASE: 'word', SOLAR_EPOCH: '1' };

function memoryStore(): PinStore & { pins: Map<string, SolarPin> } {
  const pins = new Map<string, SolarPin>();
  return {
    pins,
    async list() { return [...pins.values()]; },
    async count() { return pins.size; },
    async get(id) { return pins.get(id) ?? null; },
    async insert(pin) { pins.set(pin.id, pin); },
    async update(pin) { pins.set(pin.id, pin); },
    async remove(id) { return pins.delete(id); },
  };
}

async function request(path: string, init: RequestInit & { writ?: string | null } = {}): Promise<Request> {
  const writ = init.writ === undefined ? await issueWrit(SECRET, 1, SOLAR_SCOPE) : init.writ;
  const headers = new Headers(init.headers);
  if (writ) headers.set('Cookie', `${SOLAR_COOKIE_NAME}=${writ}`);
  if (init.body) headers.set('content-type', 'application/json');
  headers.set('Sec-Fetch-Site', headers.get('Sec-Fetch-Site') ?? 'same-origin');
  return new Request(`https://archive.example${path}`, { ...init, headers });
}

const piece = { kind: 'pawn', x: 0.4, y: 0.3, label: 'Whiterun watch', note: 'Two agents.' };

describe('a piece, checked', () => {
  it('takes a whole piece, trimmed', () => {
    const checked = checkPin({ ...piece, label: '  Whiterun watch  ' });
    expect(checked).toEqual({ ok: true, value: { ...piece } });
  });

  it('refuses a place off the map, a name too long, and an unknown piece', () => {
    expect(checkPin({ ...piece, x: 1.01 }).ok).toBe(false);
    expect(checkPin({ ...piece, y: -0.01 }).ok).toBe(false);
    expect(checkPin({ ...piece, x: Number.NaN }).ok).toBe(false);
    expect(checkPin({ ...piece, label: '' }).ok).toBe(false);
    expect(checkPin({ ...piece, label: 'x'.repeat(PIN_LIMITS.label + 1) }).ok).toBe(false);
    expect(checkPin({ ...piece, note: 'x'.repeat(PIN_LIMITS.note + 1) }).ok).toBe(false);
    expect(checkPin({ ...piece, kind: 'rook' }).ok).toBe(false);
    expect(checkPin(null).ok).toBe(false);
  });

  it('moves a piece with only its place, keeping the rest', () => {
    const base = { kind: 'interest' as const, x: 0.1, y: 0.1, label: 'Bruma', note: '' };
    expect(checkPin({ x: 0.5, y: 0.6 }, base)).toEqual({ ok: true, value: { ...base, x: 0.5, y: 0.6 } });
  });
});

describe('the war table', () => {
  it('is shut without the Solar writ, and to a Reports writ', async () => {
    const store = memoryStore();
    expect((await handlePins(await request('/api/solar/pins', { writ: null }), env, store)).status).toBe(401);
    const reports = await issueWrit(SECRET, 1, REPORTS_SCOPE);
    expect((await handlePins(await request('/api/solar/pins', { writ: reports }), env, store)).status).toBe(401);
  });

  it('fails closed without its secret', async () => {
    const response = await handlePins(await request('/api/solar/pins'), { SOLAR_COOKIE_SECRET: '' }, memoryStore());
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('sets a piece down, moves it, renames it and takes it up', async () => {
    const store = memoryStore();
    const created = await handlePins(await request('/api/solar/pins', { method: 'POST', body: JSON.stringify(piece) }), env, store);
    expect(created.status).toBe(201);
    const { pin } = (await created.json()) as { pin: SolarPin };
    expect(pin).toMatchObject(piece);

    const listed = (await (await handlePins(await request('/api/solar/pins'), env, store)).json()) as { pins: SolarPin[] };
    expect(listed.pins).toHaveLength(1);

    const moved = await handlePin(
      await request(`/api/solar/pins/${pin.id}`, { method: 'PATCH', body: JSON.stringify({ x: 0.7, y: 0.2 }) }),
      env, store, pin.id,
    );
    expect(((await moved.json()) as { pin: SolarPin }).pin).toMatchObject({ ...piece, x: 0.7, y: 0.2 });

    const renamed = await handlePin(
      await request(`/api/solar/pins/${pin.id}`, { method: 'PATCH', body: JSON.stringify({ label: 'Whiterun post' }) }),
      env, store, pin.id,
    );
    expect(((await renamed.json()) as { pin: SolarPin }).pin.label).toBe('Whiterun post');

    const taken = await handlePin(await request(`/api/solar/pins/${pin.id}`, { method: 'DELETE' }), env, store, pin.id);
    expect(taken.status).toBe(200);
    expect(store.pins.size).toBe(0);
  });

  it('refuses a piece from another site, or one not sent as JSON', async () => {
    const store = memoryStore();
    const foreign = await request('/api/solar/pins', { method: 'POST', body: JSON.stringify(piece), headers: { 'Sec-Fetch-Site': 'cross-site' } });
    expect((await handlePins(foreign, env, store)).status).toBe(403);

    const form = await request('/api/solar/pins', { method: 'POST' });
    const asForm = new Request(form, { body: 'kind=pawn', headers: { ...Object.fromEntries(form.headers), 'content-type': 'application/x-www-form-urlencoded' } });
    expect((await handlePins(asForm, env, store)).status).toBe(415);
    expect(store.pins.size).toBe(0);
  });

  it('holds no more pieces than its limit', async () => {
    const store = memoryStore();
    for (let i = 0; i < PIN_LIMITS.count; i++) {
      store.pins.set(`pin-${String(i).padStart(6, '0')}`, { id: `pin-${i}`, ...piece, kind: 'pawn', createdAt: '', updatedAt: '' });
    }
    const response = await handlePins(await request('/api/solar/pins', { method: 'POST', body: JSON.stringify(piece) }), env, store);
    expect(response.status).toBe(409);
  });

  it('knows another site by the browser’s word, or by Origin when there is none', () => {
    const at = (headers: Record<string, string>) => new Request('https://archive.example/api/solar/pins', { method: 'POST', headers });
    expect(isForeign(at({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(false);
    expect(isForeign(at({ 'Sec-Fetch-Site': 'same-site' }))).toBe(true);
    expect(isForeign(at({ Origin: 'https://archive.example' }))).toBe(false);
    expect(isForeign(at({ Origin: 'https://elsewhere.example' }))).toBe(true);
    expect(isForeign(at({}))).toBe(false);
  });
});

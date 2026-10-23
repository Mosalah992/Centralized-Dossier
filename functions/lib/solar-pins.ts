// The war table's pieces. Every route here is behind the Solar writ; writes
// must also come from the archive's own pages.
//
// The handlers take a PinStore rather than D1 itself, so the tests can run
// them against a store in memory; the D1 store, and its SQL, is in
// lib/solar-d1.ts.

import { SOLAR_COOKIE_NAME, readCookie } from './session';
import { isForeign, refuseForeignWrite, refuseWithoutSolarWrit, solarJson, type SolarEnv } from './solar';
import { PIN_LIMITS, checkPin, type SolarPin } from '../../shared/solar';

export interface PinStore {
  list(): Promise<SolarPin[]>;
  count(): Promise<number>;
  get(id: string): Promise<SolarPin | null>;
  insert(pin: SolarPin): Promise<void>;
  update(pin: SolarPin): Promise<void>;
  remove(id: string): Promise<boolean>;
}

const ID = /^[a-z0-9-]{8,40}$/;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** GET lists the pieces; POST sets one down. */
export async function handlePins(request: Request, env: SolarEnv, store: PinStore | null): Promise<Response> {
  const refusal = await refuseWithoutSolarWrit(env, readCookie(request, SOLAR_COOKIE_NAME));
  if (refusal) return refusal;
  if (!store) return solarJson({ error: 'The war table cannot be reached.' }, 503);

  if (request.method === 'GET') return solarJson({ pins: await store.list() });
  if (request.method !== 'POST') return solarJson({ error: 'Method not permitted.' }, 405);

  const foreign = refuseForeignWrite(request);
  if (foreign) return foreign;
  const checked = checkPin(await readJson(request));
  if (!checked.ok) return solarJson({ error: checked.error }, 400);
  if ((await store.count()) >= PIN_LIMITS.count) {
    return solarJson({ error: `The table holds ${PIN_LIMITS.count} pieces at most. Take one up first.` }, 409);
  }

  const now = new Date().toISOString();
  const pin: SolarPin = { id: crypto.randomUUID(), ...checked.value, createdAt: now, updatedAt: now };
  await store.insert(pin);
  return solarJson({ pin }, 201);
}

/** PATCH moves or renames one piece; DELETE takes it up. */
export async function handlePin(request: Request, env: SolarEnv, store: PinStore | null, id: string): Promise<Response> {
  const refusal = await refuseWithoutSolarWrit(env, readCookie(request, SOLAR_COOKIE_NAME));
  if (refusal) return refusal;
  if (!store) return solarJson({ error: 'The war table cannot be reached.' }, 503);
  if (!ID.test(id)) return solarJson({ error: 'No such piece.' }, 404);
  if (request.method !== 'PATCH' && request.method !== 'DELETE') return solarJson({ error: 'Method not permitted.' }, 405);

  if (isForeign(request)) return solarJson({ error: 'Not from this archive.' }, 403);

  if (request.method === 'DELETE') {
    return (await store.remove(id)) ? solarJson({ removed: id }) : solarJson({ error: 'No such piece.' }, 404);
  }

  const foreign = refuseForeignWrite(request);
  if (foreign) return foreign;
  const existing = await store.get(id);
  if (!existing) return solarJson({ error: 'No such piece.' }, 404);
  const checked = checkPin(await readJson(request), existing);
  if (!checked.ok) return solarJson({ error: checked.error }, 400);

  const pin: SolarPin = { ...existing, ...checked.value, updatedAt: new Date().toISOString() };
  await store.update(pin);
  return solarJson({ pin });
}

import { afterEach, describe, expect, it } from 'vitest';

import { staleWhileRevalidate } from '../functions/lib/swr';

// A stand-in for the Workers Cache API: enough of `caches.default` to store
// and return entries by URL.
function installCache() {
  const store = new Map<string, Response>();
  (globalThis as { caches?: unknown }).caches = {
    default: {
      match: async (key: Request) => store.get(key.url)?.clone(),
      put: async (key: Request, response: Response) => { store.set(key.url, response.clone()); },
    },
  };
  return store;
}

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
});

const options = (produce: () => Promise<Response>) => {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    opts: {
      cacheKey: new Request('https://archive.cache.internal/sheet/roster'),
      freshSeconds: 60,
      waitUntil: (promise: Promise<unknown>) => { pending.push(promise); },
      produce,
    },
  };
};

const volume = () => new Response('{"ok":true}', {
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
});

describe('stale-while-revalidate', () => {
  it('serves a cache hit with the route’s own Cache-Control, not the retention header', async () => {
    installCache();
    const first = options(async () => volume());
    await staleWhileRevalidate(first.opts);
    await Promise.all(first.pending);

    const hit = await staleWhileRevalidate(options(async () => volume()).opts);

    expect(hit.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(hit.headers.get('x-archive-cache-control')).toBeNull();
    expect(await hit.json()).toEqual({ ok: true });
  });

  it('keeps an entry for a day so it can be served stale while refreshing', async () => {
    const store = installCache();
    const first = options(async () => volume());
    await staleWhileRevalidate(first.opts);
    await Promise.all(first.pending);

    const entry = [...store.values()][0]!;
    expect(entry.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('revalidates an entry stored before the route’s header was kept', async () => {
    const store = installCache();
    store.set('https://archive.cache.internal/sheet/roster', new Response('{}', {
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'x-archive-fetched-at': String(Math.floor(Date.now() / 1000)),
      },
    }));

    const hit = await staleWhileRevalidate(options(async () => volume()).opts);
    expect(hit.headers.get('Cache-Control')).toBe('no-cache');
  });
});

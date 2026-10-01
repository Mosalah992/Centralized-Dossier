import { afterEach, describe, expect, it, vi } from 'vitest';

import { openChronicle, openReports } from '../web/src/api';

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('portrait-gate adapters', () => {
  it.each([
    ['Chronicle', openChronicle, '/api/chronicle/gate'],
    ['Reports', openReports, '/api/reports/gate'],
  ] as const)('%s sends its phrase only to its own gate', async (_name, open, endpoint) => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(open('  a phrase  ', controller.signal)).resolves.toEqual({ ok: true, message: '' });
    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'POST', signal: controller.signal, body: JSON.stringify({ passphrase: '  a phrase  ' }),
    }));
  });

  it('keeps a rate-limit delay visible to the portrait gate', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Too many attempts.' }), {
      status: 429,
      headers: { 'Retry-After': '18', 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(openReports('wrong')).resolves.toEqual({
      ok: false, message: 'Too many attempts.', retryAfterSeconds: 18,
    });
  });

  it('propagates request aborts instead of treating them as authorization', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = openChronicle('word', controller.signal);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});

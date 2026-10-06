import { describe, expect, it } from 'vitest';

import { guardAssetFallback } from '../functions/lib/assets';

const html = () => new Response('<!doctype html>', {
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' },
});
const req = (path: string) => new Request(`https://thalmor-archives.com${path}`);

describe('missing fingerprinted assets', () => {
  it('turn the SPA fallback into an uncacheable 404', async () => {
    const out = guardAssetFallback(req('/assets/index-DCeVSJZb.js'), html());
    expect(out.status).toBe(404);
    expect(out.headers.get('Cache-Control')).toBe('no-store');
    expect(out.headers.get('Content-Type')).not.toContain('text/html');
  });

  it('leave real assets untouched', () => {
    const js = new Response('export {}', { headers: { 'Content-Type': 'application/javascript' } });
    expect(guardAssetFallback(req('/assets/index-DCeVSJZb.js'), js)).toBe(js);
  });

  it('leave the SPA fallback alone for app routes', () => {
    const page = html();
    expect(guardAssetFallback(req('/archives/roster'), page)).toBe(page);
    expect(guardAssetFallback(req('/'), page)).toBe(page);
  });
});

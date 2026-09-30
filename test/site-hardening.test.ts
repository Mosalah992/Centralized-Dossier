import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS, withSecurityHeaders } from '../functions/lib/security';
import { parse } from '../web/src/router';

const read = (path: string) => readFileSync(path, 'utf8');

describe('retired mini-game', () => {
  it('has no route, runtime, model, stylesheet, test, or asset preparation surface', () => {
    expect(parse('/slaytheheretic')).toEqual({ name: 'missing' });
    expect(parse('/SlayTheHeretic')).toEqual({ name: 'missing' });

    for (const path of [
      'web/src/game',
      'web/src/assets/arcane',
      'web/src/styles/slay.css',
      'shared/spellcraft.ts',
      'scripts/prepare-arcane.mjs',
      'test/spellcraft.test.ts',
      'Assets/Arcane mini game assets',
    ]) {
      expect(existsSync(path), `${path} should be absent`).toBe(false);
    }

    expect(read('web/src/App.tsx')).not.toMatch(/SlayTheHeretic|route\.name === 'game'/);
  });
});

describe('public support link', () => {
  it('is themed in the app and severs opener/referrer access to Ko-fi', () => {
    const app = read('web/src/App.tsx');
    expect(app).toContain('https://ko-fi.com/N1B0279SRR');
    expect(app).toContain('rel="noopener noreferrer external"');
    expect(app).toContain('className="support-seal"');
    expect(read('web/src/styles/archive-navigation.css')).toContain('.support-seal');
    expect(read('index.html')).not.toContain('style=');
  });
});

describe('browser security policy', () => {
  it('denies fallback capabilities and script injection primitives', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src-attr 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/(?:^|\s)\*(?:;|$)/);
  });

  it('keeps the static and Function policies identical', () => {
    const staticHeaders = read('public/_headers');
    const staticCsp = /^\s*Content-Security-Policy:\s*(.+)$/m.exec(staticHeaders)?.[1]?.trim();
    expect(staticCsp).toBe(CONTENT_SECURITY_POLICY);
    expect(staticHeaders).toContain('Cache-Control: public, max-age=31536000, immutable');
  });

  it('adds defense-in-depth headers without weakening route-owned caching', () => {
    const secured = withSecurityHeaders(new Response('{}', {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    }));

    expect(secured.status).toBe(401);
    expect(secured.headers.get('Cache-Control')).toBe('private, no-store');
    expect(secured.headers.get('Vary')).toBe('Cookie');
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(secured.headers.get(name)).toBe(value);
    }
  });
});

describe('initial-load ownership', () => {
  it('keeps route-only styles out of the entry module', () => {
    const entry = read('web/src/main.tsx');
    for (const sheet of ['chronicle.css', 'enforcement.css', 'orrery.css', 'firmament.css', 'reports.css', 'archive-seal.css']) {
      expect(entry, `${sheet} should load with its route`).not.toContain(sheet);
    }
    expect(read('web/src/views/Reports.tsx')).toContain("../styles/reports.css");
    expect(read('web/src/components/ArchiveSeal.tsx')).toContain("../styles/archive-seal.css");
  });

  it('pauses continuous calendar rendering offscreen and under reduced motion', () => {
    for (const path of ['web/src/components/Firmament.tsx', 'web/src/components/Orrery.tsx']) {
      const source = read(path);
      expect(source).toContain('autoplay: false');
      expect(source).toContain('IntersectionObserver');
      expect(source).toContain('if (still)');
    }
  });
});

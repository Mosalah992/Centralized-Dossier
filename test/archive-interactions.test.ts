import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_NAVIGATION,
  filterArchiveNavigation,
  navigationItemIsActive,
} from '../web/src/archive-navigation';
import { ALL_SLUGS } from '../shared/volumes';

const read = (path: string) => readFileSync(path, 'utf8');

describe('archive navigation', () => {
  it('is generated from every published volume and the two real standalone routes', () => {
    const hrefs = ARCHIVE_NAVIGATION.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/reports');
    for (const slug of ALL_SLUGS) expect(hrefs).toContain(`/archives/${slug}`);
  });

  it('filters labels and registry groups without searching record bodies', () => {
    expect(filterArchiveNavigation('finance').map((item) => item.href))
      .toEqual(['/archives/ledger', '/archives/stipends']);
    expect(filterArchiveNavigation('high command').map((item) => item.href))
      .toEqual(['/reports']);
  });

  it('marks only the current real route', () => {
    const reports = ARCHIVE_NAVIGATION.find((item) => item.href === '/reports')!;
    const roster = ARCHIVE_NAVIGATION.find((item) => item.href === '/archives/roster')!;
    expect(navigationItemIsActive({ name: 'reports' }, reports)).toBe(true);
    expect(navigationItemIsActive({ name: 'reports' }, roster)).toBe(false);
    expect(navigationItemIsActive({ name: 'volume', slug: 'roster' }, roster)).toBe(true);
  });
});

describe('interaction boundaries', () => {
  it('places ArchiveSeal on Reports and not in the cabinet', () => {
    expect(read('web/src/views/Reports.tsx')).toContain('<ArchiveSeal');
    expect(read('web/src/components/Shelf.tsx')).not.toContain('ArchiveSeal');
  });

  it('keeps the Reports gate server-backed and the hidden face inert', () => {
    const reports = read('web/src/views/Reports.tsx');
    const seal = read('web/src/components/ArchiveSeal.tsx');
    expect(reports).toContain('openReports(word)');
    expect(seal).toContain('backFace.current.inert = !flipped');
  });

  it('uses the existing motion system and ships no Three.js dependency', () => {
    const manifest = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
    expect(manifest.dependencies?.three).toBeUndefined();
    expect(read('web/src/components/ArchiveSeal.tsx')).toContain("from '../motion'");
    expect(read('web/src/styles/archive-seal.css')).toContain('prefers-reduced-motion: reduce');
  });

  it('retains the requested sidebar preference key and mobile dismissal controls', () => {
    const app = read('web/src/App.tsx');
    const sidebar = read('web/src/components/ArchiveSidebar.tsx');
    expect(app).toContain('thalmor.sidebar.expanded');
    expect(sidebar).toContain("event.key === 'Escape'");
    expect(sidebar).toContain('archive-sidebar__backdrop');
    expect(sidebar).toContain("document.body.style.overflow = 'hidden'");
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildFilerIndex, resolveFiler } from '../shared/reports';

const index = buildFilerIndex([
  { name: 'Elenwen', discord: ['first.emissary', 'elenwen_alt'] },
  { name: 'Ondolemar', discord: ['ondo'] },
  { name: 'Ancano', discord: ['shared.handle'] },
  { name: 'Estormo', discord: ['@Shared.Handle'] },
  { name: '', discord: ['nameless'] },
]);

describe('report attribution', () => {
  it('signs a filing with the in-world name of the one member who claims the handle', () => {
    expect(resolveFiler({ username: 'first.emissary' }, index)).toBe('Elenwen');
    expect(resolveFiler({ username: 'ELENWEN_ALT' }, index)).toBe('Elenwen');
  });

  it('falls back to the display name', () => {
    expect(resolveFiler({ username: 'unknown', global_name: 'ondo' }, index)).toBe('Ondolemar');
  });

  it('leaves a filing unsigned when two members claim the handle, or none does', () => {
    expect(resolveFiler({ username: 'shared.handle' }, index)).toBeNull();
    expect(resolveFiler({ username: 'stranger', global_name: null }, index)).toBeNull();
    expect(resolveFiler({ username: 'nameless' }, index)).toBeNull();
  });

  it('never returns a handle', () => {
    const handles = ['first.emissary', 'elenwen_alt', 'ondo', 'shared.handle', 'nameless', 'stranger'];
    for (const username of handles) {
      const signed = resolveFiler({ username }, index);
      expect(handles).not.toContain(signed?.toLowerCase());
    }
  });
});

describe('the collector', () => {
  const source = readFileSync('reporter/src/index.ts', 'utf8');

  it('hands the Discord author only to resolveFiler', () => {
    expect(source.match(/message\.author/g)).toHaveLength(1);
    expect(source).toContain('resolveFiler(message.author, filers)');
    expect(source).not.toMatch(/\.(username|global_name)\b/);
    expect(source).not.toMatch(/author\.id\b/);
  });

  it('keeps names it could not check rather than erasing them', () => {
    expect(source).toContain('COALESCE(excluded.author_name, reports.author_name)');
  });

  it('reads Discord only', () => {
    expect(source).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)/i);
  });
});

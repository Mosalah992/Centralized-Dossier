import { describe, expect, it } from 'vitest';

import { CANONICAL_ORIGIN, canonicalRedirect } from '../functions/lib/canonical';

describe('the canonical archive host', () => {
  it('permanently moves the production Pages hostname without losing the location', () => {
    const request = new Request(
      'https://thalmor-archives.pages.dev/archives/informants?leaf=4#filings',
    );

    expect(canonicalRedirect(request)).toBe(
      `${CANONICAL_ORIGIN}/archives/informants?leaf=4#filings`,
    );
  });

  it('leaves the custom domain and Pages preview hostnames reachable', () => {
    expect(canonicalRedirect(new Request('https://thalmor-archives.com/'))).toBeNull();
    expect(canonicalRedirect(new Request('https://reports-preview.thalmor-archives.pages.dev/')))
      .toBeNull();
  });
});

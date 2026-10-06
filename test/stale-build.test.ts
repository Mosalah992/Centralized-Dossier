import { describe, expect, it } from 'vitest';

import { claimReload, isChunkLoadError } from '../web/src/stale-build';

const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
};

describe('stale build recovery', () => {
  it('recognises failed dynamic imports across browsers', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Shell-A.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads once, then not again within the window', () => {
    const storage = memory();
    expect(claimReload(storage, 100_000)).toBe(true);
    expect(claimReload(storage, 110_000)).toBe(false);
    expect(claimReload(storage, 131_000)).toBe(true);
  });
});

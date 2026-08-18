import { describe, expect, it } from 'vitest';

import { PUBLIC_PATHS } from '../functions/lib/public-paths';

/**
 * This set is the archive's boundary. Everything not in it needs a writ, so a
 * line added here is a route opened to the whole internet — and it would be
 * added by someone doing something else at the time, in a file they were
 * touching for another reason.
 *
 * These tests exist to make that impossible to do quietly. If you are here
 * because one of them failed, you have just published a route: check that you
 * meant to, then update the expected list in the same commit.
 */
describe('the public paths are the boundary', () => {
  it('is exactly these three, and no more', () => {
    expect([...PUBLIC_PATHS].sort()).toEqual([
      '/api/auth/callback',
      '/api/auth/login',
      '/api/gate',
    ]);
  });

  it('does not expose anything that reads the sheet', () => {
    for (const path of [
      '/api/volumes',
      '/api/volumes/roster',
      '/api/volumes/statistics',
      '/api/volumes/ledger',
      '/api/volumes/stipends',
      '/api/volumes/honor',
      '/api/volumes/calendar',
    ]) {
      expect(PUBLIC_PATHS.has(path)).toBe(false);
    }
  });

  it('does not expose the sealed volume or its own door', () => {
    expect(PUBLIC_PATHS.has('/api/chronicle')).toBe(false);
    // The volume's gate sits BEHIND the archive's, deliberately: its word
    // cannot even be offered by someone who is not already inside.
    expect(PUBLIC_PATHS.has('/api/chronicle/gate')).toBe(false);
  });

  it('opens named paths only, never a prefix', () => {
    // A `startsWith('/api/auth')` rule would publish every route later filed
    // under that folder, including one written by someone who never read this.
    for (const near of [
      '/api/auth',
      '/api/auth/',
      '/api/auth/logout',
      '/api/auth/token',
      '/api/auth/callback/../../volumes/roster',
      '/api/gate/',
      '/api/gateway',
    ]) {
      expect(PUBLIC_PATHS.has(near)).toBe(false);
    }
  });
});

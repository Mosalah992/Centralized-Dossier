import { describe, expect, it } from 'vitest';

import {
  REPORTS_COOKIE_NAME, REPORTS_SCOPE, SESSION_TTL_SECONDS, SOLAR_COOKIE_NAME, SOLAR_SCOPE,
  clearedCookie, issueWrit, readWrit, writCookie,
} from '../functions/lib/session';

/**
 * The archive's session layer: the writs for the two doors it still keeps,
 * the Cabinet's (Reports) and the Solar's.
 *
 * This suite used to cover the archive's own gate, a Discord login and the
 * Thalmor Chronicles' lock. All are gone (the Chronicles were opened on
 * 2026-10-23).
 *
 * THE SCOPE TESTS ARE THE LOAD-BEARING ONES. Readers still carry validly signed
 * archive and Chronicle writs, and a cookie's value can be moved anywhere the
 * reader likes. The only thing that stops one being pasted into another door's
 * cookie and honoured is that the scope is inside the MAC.
 */

const SECRET = 'a-secret-of-no-particular-length';
const EPOCH = 1;

const bodyOf = (token: string) => token.slice(0, token.indexOf('.'));
const sigOf = (token: string) => token.slice(token.indexOf('.') + 1);
const b64url = (value: unknown) => btoa(JSON.stringify(value))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('a writ', () => {
  it('round-trips, and lasts the week its cookie does', async () => {
    const writ = await readWrit(SECRET, EPOCH, await issueWrit(SECRET, EPOCH, SOLAR_SCOPE), SOLAR_SCOPE);
    expect(writ).not.toBeNull();

    const life = writ!.exp - Math.floor(Date.now() / 1000);
    expect(life).toBeGreaterThan(SESSION_TTL_SECONDS - 60);
    expect(life).toBeLessThanOrEqual(SESSION_TTL_SECONDS);
  });

  it('carries no identity — nothing about the reader is recorded', async () => {
    const writ = await readWrit(SECRET, EPOCH, await issueWrit(SECRET, EPOCH, SOLAR_SCOPE), SOLAR_SCOPE);
    // The archive briefly minted writs naming the reader, their Discord id and
    // their roles. A writ now is a fact about the door rather than the reader.
    expect(Object.keys(writ!).sort()).toEqual(['e', 'exp', 's']);
  });

  it('is refused under another secret', async () => {
    const token = await issueWrit(SECRET, EPOCH, REPORTS_SCOPE);
    expect(await readWrit('a-different-secret', EPOCH, token, REPORTS_SCOPE)).toBeNull();
  });

  it('is rotated out by the epoch', async () => {
    const token = await issueWrit(SECRET, EPOCH, REPORTS_SCOPE);
    expect(await readWrit(SECRET, EPOCH + 1, token, REPORTS_SCOPE)).toBeNull();
  });

  it('refuses a mangled or absent token rather than throwing', async () => {
    expect(await readWrit(SECRET, EPOCH, null, SOLAR_SCOPE)).toBeNull();
    expect(await readWrit(SECRET, EPOCH, 'garbage', SOLAR_SCOPE)).toBeNull();
    expect(await readWrit(SECRET, EPOCH, '.sig', SOLAR_SCOPE)).toBeNull();
    const token = await issueWrit(SECRET, EPOCH, SOLAR_SCOPE);
    expect(await readWrit(SECRET, EPOCH, `${bodyOf(token)}.wrong`, SOLAR_SCOPE)).toBeNull();
  });

  it('cannot be extended by editing the cookie', async () => {
    const token = await issueWrit(SECRET, EPOCH, SOLAR_SCOPE);
    const claims = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(bodyOf(token).replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)),
    ));
    claims.exp += 60 * 60 * 24 * 365;

    // Same signature, different body — the MAC covers the whole thing.
    expect(await readWrit(SECRET, EPOCH, `${b64url(claims)}.${sigOf(token)}`, SOLAR_SCOPE)).toBeNull();
  });
});

describe('an old writ does not open a door', () => {
  /*
   * Forged by hand rather than minted, because nothing in the module can
   * produce them any more. They are the shape of what readers may still hold:
   * archive writs, Chronicle writs, and the oldest with no scope at all.
   */
  const stale = async (claims: Record<string, unknown>) => {
    const body = b64url(claims);
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
    );
    let raw = '';
    for (const b of sig) raw += String.fromCharCode(b);
    return `${body}.${btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  };

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  it('is refused when it names the archive or Chronicle scope', async () => {
    for (const s of ['archive', 'chronicle']) {
      expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp, s }), REPORTS_SCOPE)).toBeNull();
      expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp, s }), SOLAR_SCOPE)).toBeNull();
    }
  });

  it('is refused when it predates scopes and names none at all', async () => {
    expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp }), SOLAR_SCOPE)).toBeNull();
  });

  it('is refused on its scope, though its signature is perfectly good', async () => {
    // Guarding against the wrong conclusion if this ever fails: the same claims
    // signed the same way with the right scope are accepted, so the scope is
    // what did the work above.
    expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp, s: 'solar' }), SOLAR_SCOPE)).not.toBeNull();
  });
});

describe('separate doors', () => {
  it('does not let a Reports writ open the Solar, nor a Solar writ the Cabinet', async () => {
    const reports = await issueWrit(SECRET, EPOCH, REPORTS_SCOPE);
    const solar = await issueWrit(SECRET, EPOCH, SOLAR_SCOPE);
    expect(await readWrit(SECRET, EPOCH, reports, SOLAR_SCOPE)).toBeNull();
    expect(await readWrit(SECRET, EPOCH, solar, REPORTS_SCOPE)).toBeNull();
  });
});

describe('the writ cookie', () => {
  it('matches its own lifetime to the writ inside', () => {
    expect(writCookie('t', SOLAR_COOKIE_NAME)).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
  });

  it('is named for its door, and clears by that name', () => {
    expect(writCookie('t', SOLAR_COOKIE_NAME)).toContain(`${SOLAR_COOKIE_NAME}=t`);
    expect(clearedCookie(REPORTS_COOKIE_NAME)).toContain(`${REPORTS_COOKIE_NAME}=`);
    expect(clearedCookie(REPORTS_COOKIE_NAME)).toContain('Max-Age=0');
  });

  it('is never readable by script', () => {
    expect(writCookie('t', SOLAR_COOKIE_NAME)).toContain('HttpOnly');
    expect(writCookie('t', SOLAR_COOKIE_NAME)).toContain('Secure');
  });
});

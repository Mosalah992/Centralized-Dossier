import { describe, expect, it } from 'vitest';

import {
  CHRONICLE_COOKIE_NAME, SESSION_TTL_SECONDS,
  clearedCookie, issueWrit, readWrit, writCookie,
} from '../functions/lib/session';

/**
 * What is left of the archive's session layer, which is one volume's lock.
 *
 * This suite used to cover three things: the passphrase writ that opened the
 * archive, the identity writ a Discord login minted in its place, and the OAuth
 * state nonce that tied a callback to the login that started it. The archive is
 * public now and all three are gone. The Thalmor Chronicles keep their own word
 * and their own cookie, and that is what these tests are about.
 *
 * THE SCOPE TESTS AT THE BOTTOM ARE THE LOAD-BEARING ONES and the reason this
 * file did not shrink to nothing. There is only one scope left, which makes the
 * check look like a formality — it is not. Readers are still carrying validly
 * signed archive writs in `thalmor_writ`, with up to a week to run, and a
 * cookie's value can be moved anywhere the reader likes. The only thing that
 * stops one being pasted into the chronicle's cookie and honoured is that the
 * scope is inside the MAC.
 */

const SECRET = 'a-secret-of-no-particular-length';
const EPOCH = 1;

const bodyOf = (token: string) => token.slice(0, token.indexOf('.'));
const sigOf = (token: string) => token.slice(token.indexOf('.') + 1);
const b64url = (value: unknown) => btoa(JSON.stringify(value))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('the volume writ', () => {
  it('round-trips, and lasts the week its cookie does', async () => {
    const writ = await readWrit(SECRET, EPOCH, await issueWrit(SECRET, EPOCH));
    expect(writ).not.toBeNull();

    const life = writ!.exp - Math.floor(Date.now() / 1000);
    expect(life).toBeGreaterThan(SESSION_TTL_SECONDS - 60);
    expect(life).toBeLessThanOrEqual(SESSION_TTL_SECONDS);
  });

  it('carries no identity — nothing about the reader is recorded', async () => {
    const writ = await readWrit(SECRET, EPOCH, await issueWrit(SECRET, EPOCH));
    // The archive briefly minted writs naming the reader, their Discord id and
    // their roles. Whoever opens the volume now does so anonymously, and the
    // writ is a fact about the door rather than about them.
    expect(Object.keys(writ!).sort()).toEqual(['e', 'exp', 's']);
  });

  it('is refused under another secret', async () => {
    const token = await issueWrit(SECRET, EPOCH);
    expect(await readWrit('a-different-secret', EPOCH, token)).toBeNull();
  });

  it('is rotated out by the epoch', async () => {
    const token = await issueWrit(SECRET, EPOCH);
    expect(await readWrit(SECRET, EPOCH + 1, token)).toBeNull();
  });

  it('refuses a mangled or absent token rather than throwing', async () => {
    expect(await readWrit(SECRET, EPOCH, null)).toBeNull();
    expect(await readWrit(SECRET, EPOCH, 'garbage')).toBeNull();
    expect(await readWrit(SECRET, EPOCH, '.sig')).toBeNull();
    const token = await issueWrit(SECRET, EPOCH);
    expect(await readWrit(SECRET, EPOCH, `${bodyOf(token)}.wrong`)).toBeNull();
  });

  it('cannot be extended by editing the cookie', async () => {
    const token = await issueWrit(SECRET, EPOCH);
    const claims = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(bodyOf(token).replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)),
    ));
    claims.exp += 60 * 60 * 24 * 365;

    // Same signature, different body — the MAC covers the whole thing.
    expect(await readWrit(SECRET, EPOCH, `${b64url(claims)}.${sigOf(token)}`)).toBeNull();
  });
});

describe('an old archive writ does not open the volume', () => {
  /*
   * These are forged by hand rather than minted, because nothing in the module
   * can produce them any more — which is exactly the point. They are the shape
   * of what is sitting in readers' browsers right now, under `thalmor_writ`,
   * signed by the same GATE_SECRET and not yet expired.
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

  it('is refused when it names the archive scope', async () => {
    expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp, s: 'archive' })))
      .toBeNull();
  });

  it('is refused when it predates scopes and names none at all', async () => {
    // The oldest writs carry no `s`. A default of "archive" would have been
    // harmless while an archive scope existed; with only one scope left, a
    // default of any kind would have let these through. There is none.
    expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp })))
      .toBeNull();
  });

  it('is refused even though its signature is perfectly good', async () => {
    // Guarding against the wrong conclusion if this ever fails: these are not
    // rejected as forgeries. Re-signing the same claims with the right scope is
    // accepted, so the scope is what did the work above.
    expect(await readWrit(SECRET, EPOCH, await stale({ e: EPOCH, exp, s: 'chronicle' })))
      .not.toBeNull();
  });
});

describe('the writ cookie', () => {
  it('matches its own lifetime to the writ inside', () => {
    expect(writCookie('t')).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
  });

  it('defaults to the volume it now exists for', () => {
    expect(writCookie('t')).toContain(`${CHRONICLE_COOKIE_NAME}=t`);
    expect(clearedCookie()).toContain(`${CHRONICLE_COOKIE_NAME}=`);
    expect(clearedCookie()).toContain('Max-Age=0');
  });

  it('is never readable by script', () => {
    expect(writCookie('t')).toContain('HttpOnly');
    expect(writCookie('t')).toContain('Secure');
  });
});

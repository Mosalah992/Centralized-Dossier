import { describe, expect, it } from 'vitest';

import {
  COOKIE_NAME, CHRONICLE_COOKIE_NAME, OAUTH_TTL_SECONDS, SESSION_TTL_SECONDS,
  clearedStateCookie, issueWrit, readWrit, sign, stateCookie, unsign, writCookie,
  type Identity,
} from '../functions/lib/session';

const SECRET = 'a-secret-of-no-particular-length';
const EPOCH = 1;

const ME: Identity = {
  id: '201009402',
  name: 'Ganaril the Reformer',
  roles: ['1111111111111111111', '2222222222222222222'],
};

/** Re-sign a tampered body so only the CONTENT differs, not the shape. */
const bodyOf = (token: string) => token.slice(0, token.indexOf('.'));
const decode = (b64: string) =>
  JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')
      + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0)),
  ));

describe('the passphrase writ is unchanged', () => {
  it('still carries no identity, and still lasts a week', async () => {
    const writ = await readWrit(SECRET, EPOCH, await issueWrit(SECRET, EPOCH));
    expect(writ).not.toBeNull();
    expect(writ!.u).toBeUndefined();
    expect(writ!.n).toBeUndefined();
    expect(writ!.r).toBeUndefined();

    const life = writ!.exp - Math.floor(Date.now() / 1000);
    expect(life).toBeGreaterThan(SESSION_TTL_SECONDS - 60);
  });
});

describe('the identity writ', () => {
  it('round-trips who the reader is', async () => {
    const writ = await readWrit(SECRET, EPOCH,
      await issueWrit(SECRET, EPOCH, 'archive', ME));
    expect(writ!.u).toBe(ME.id);
    expect(writ!.n).toBe(ME.name);
    expect(writ!.r).toEqual(ME.roles);
  });

  it('lasts a day, not a week — roles on it are a snapshot', async () => {
    const writ = await readWrit(SECRET, EPOCH,
      await issueWrit(SECRET, EPOCH, 'archive', ME));
    const life = writ!.exp - Math.floor(Date.now() / 1000);
    expect(life).toBeGreaterThan(OAUTH_TTL_SECONDS - 60);
    expect(life).toBeLessThanOrEqual(OAUTH_TTL_SECONDS);
  });

  it('cannot be given a role by editing the cookie', async () => {
    const token = await issueWrit(SECRET, EPOCH, 'archive', ME);
    const claims = decode(bodyOf(token));
    claims.r = [...claims.r, '9999999999999999999'];

    const forged = btoa(JSON.stringify(claims))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Same signature, different body — the MAC covers the whole thing.
    expect(await readWrit(SECRET, EPOCH, `${forged}.${token.slice(token.indexOf('.') + 1)}`))
      .toBeNull();
  });

  it('is refused under another secret', async () => {
    const token = await issueWrit(SECRET, EPOCH, 'archive', ME);
    expect(await readWrit('a-different-secret', EPOCH, token)).toBeNull();
  });

  it('is rotated out by the epoch like any other', async () => {
    const token = await issueWrit(SECRET, EPOCH, 'archive', ME);
    expect(await readWrit(SECRET, EPOCH + 1, token)).toBeNull();
  });
});

describe('scope isolation still holds with identity present', () => {
  it('will not open the chronicle with an archive writ, however it was earned', async () => {
    for (const identity of [undefined, ME]) {
      const archive = await issueWrit(SECRET, EPOCH, 'archive', identity);
      expect(await readWrit(SECRET, EPOCH, archive, 'chronicle')).toBeNull();
      expect(await readWrit(SECRET, EPOCH, archive, 'archive')).not.toBeNull();
    }
  });

  it('keeps the two cookies separate', () => {
    expect(COOKIE_NAME).not.toBe(CHRONICLE_COOKIE_NAME);
  });
});

describe('the OAuth state', () => {
  it('round-trips a nonce', async () => {
    const nonce = crypto.randomUUID();
    expect(await unsign(SECRET, await sign(SECRET, nonce))).toBe(nonce);
  });

  it('refuses a forged or mangled one', async () => {
    const token = await sign(SECRET, 'nonce');
    expect(await unsign(SECRET, null)).toBeNull();
    expect(await unsign(SECRET, 'garbage')).toBeNull();
    expect(await unsign(SECRET, `${bodyOf(token)}.wrong`)).toBeNull();
    expect(await unsign('another-secret', token)).toBeNull();
  });

  it('is scoped to /api/auth and cleared the same way', () => {
    expect(stateCookie('t')).toContain('Path=/api/auth');
    expect(clearedStateCookie()).toContain('Path=/api/auth');
    expect(clearedStateCookie()).toContain('Max-Age=0');
  });

  it('is Lax, because the callback is a top-level navigation from discord.com', () => {
    // Strict would not be sent on that navigation and every login would fail
    // its own state check.
    expect(stateCookie('t')).toContain('SameSite=Lax');
    expect(stateCookie('t')).toContain('HttpOnly');
    expect(stateCookie('t')).toContain('Secure');
  });
});

describe('the writ cookie', () => {
  it('matches its own lifetime to the writ inside', () => {
    expect(writCookie('t')).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(writCookie('t', undefined, OAUTH_TTL_SECONDS))
      .toContain(`Max-Age=${OAUTH_TTL_SECONDS}`);
  });

  it('is never readable by script', () => {
    expect(writCookie('t')).toContain('HttpOnly');
    expect(writCookie('t')).toContain('Secure');
  });
});

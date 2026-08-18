import { describe, expect, it } from 'vitest';

// @ts-expect-error — a plain .mjs script, imported for the one function in it
// that is worth guarding. See the header of that file for why it is worth it.
import { keysIn, setDevVar } from '../scripts/make-dev-vars.mjs';

/**
 * The first draft of this script rewrote .dev.vars from scratch, deleting
 * GATE_PASSPHRASE and CHRONICLE_PASSPHRASE among others — values Cloudflare
 * will not read back, so losing them locally means replacing the live ones and
 * locking out everyone holding the old word.
 *
 * These tests are here so that failure cannot come back.
 */
const REAL = [
  'GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","private_key":"-----BEGIN..."}',
  'GATE_SECRET=abc',
  'GATE_PASSPHRASE=a word',
  'GATE_EPOCH=1',
  'CHRONICLE_PASSPHRASE=another word',
  'DISCORD_CLIENT_ID=123',
  'DISCORD_GUILD_ID=456',
].join('\n') + '\n';

describe('writing the service-account key into .dev.vars', () => {
  it('keeps every other value', () => {
    const after = setDevVar(REAL, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{"new":true}');
    for (const line of REAL.split('\n').slice(1).filter(Boolean)) {
      expect(after).toContain(line);
    }
    expect(keysIn(after)).toHaveLength(7);
  });

  it('replaces the key in place rather than appending a second one', () => {
    const after = setDevVar(REAL, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{"new":true}');
    expect(after.match(/^GOOGLE_SERVICE_ACCOUNT_JSON=/gm)).toHaveLength(1);
    expect(after).toContain('GOOGLE_SERVICE_ACCOUNT_JSON={"new":true}');
    expect(after).not.toContain('private_key');
    // Order is preserved, so the file does not reshuffle on every run.
    expect(keysIn(after)[0]).toBe('GOOGLE_SERVICE_ACCOUNT_JSON');
    expect(keysIn(after)[6]).toBe('DISCORD_GUILD_ID');
  });

  it('is a no-op when run twice with the same key', () => {
    const once = setDevVar(REAL, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{"a":1}');
    expect(setDevVar(once, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{"a":1}')).toBe(once);
  });

  it('handles values full of equals signs, which the JSON key is', () => {
    const value = '{"private_key":"a=b=c=","token_uri":"https://x/y?a=b"}';
    const after = setDevVar(REAL, 'GOOGLE_SERVICE_ACCOUNT_JSON', value);
    expect(after).toContain(`GOOGLE_SERVICE_ACCOUNT_JSON=${value}`);
    expect(keysIn(after)).toHaveLength(7);
  });

  it('appends when the key is absent, without disturbing what is there', () => {
    const without = 'GATE_SECRET=abc\nGATE_PASSPHRASE=a word\n';
    const after = setDevVar(without, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{}');
    expect(keysIn(after)).toEqual([
      'GATE_SECRET', 'GATE_PASSPHRASE', 'GOOGLE_SERVICE_ACCOUNT_JSON',
    ]);
  });

  it('writes a usable file from nothing', () => {
    expect(setDevVar('', 'GOOGLE_SERVICE_ACCOUNT_JSON', '{}'))
      .toBe('GOOGLE_SERVICE_ACCOUNT_JSON={}\n');
  });

  it('leaves comments and blank lines alone', () => {
    const commented = '# the gate\nGATE_SECRET=abc\n\n# the volume\nCHRONICLE_PASSPHRASE=w\n';
    const after = setDevVar(commented, 'GOOGLE_SERVICE_ACCOUNT_JSON', '{}');
    expect(after).toContain('# the gate');
    expect(after).toContain('# the volume');
    expect(after).toContain('CHRONICLE_PASSPHRASE=w');
  });

  it('ends with exactly one newline however often it is run', () => {
    let body = REAL;
    for (let i = 0; i < 3; i++) body = setDevVar(body, 'GOOGLE_SERVICE_ACCOUNT_JSON', `{"i":${i}}`);
    expect(body.endsWith('\n')).toBe(true);
    expect(body.endsWith('\n\n')).toBe(false);
  });
});

// The redaction the nightly job publishes through.
//
// WHY THIS SUITE IS DIFFERENT FROM THE OTHERS. Everything else in test/ checks
// that the archive shows the right thing. This checks that it does not show a
// particular wrong thing — a Discord handle or an account id — in text that is
// pulled, redacted and published every night with nobody watching. The export
// script has a human at the keyboard who reads "REFUSING TO WRITE" and stops.
// The Worker has 04:00 UTC.
//
// So the cases below are the shapes that actually occur in the dump: mention
// markup, role and channel pings, custom emoji, signed CDN attachment links,
// and ids people paste by hand into prose.

import { describe, expect, it } from 'vitest';

import {
  type RawMessage,
  identifiersIn,
  isReport,
  redact,
  statedDate,
  survivors,
  toFilings,
} from '../shared/filings';

const author = {
  id: '1498207051762106438',
  username: 'a_real_handle',
  global_name: 'Iwelien',
};

function message(content: string, over: Partial<RawMessage> = {}): RawMessage {
  return {
    id: '1500000000000000001',
    content,
    timestamp: '2026-08-25T21:00:18.790Z',
    author,
    ...over,
  };
}

describe('redaction', () => {
  it('replaces mention markup rather than mauling it', () => {
    // The bare-snowflake sweep would otherwise leave `<@[id]>` behind: markup
    // that resolves to nothing and reads as nothing.
    expect(redact('<@1498207051762106438> was there')).toBe('[an agent] was there');
    expect(redact('<@!1498207051762106438> too')).toBe('[an agent] too');
    expect(redact('ping <@&1498207051762106438>')).toBe('ping [a rank]');
    expect(redact('see <#1498207051762106438>')).toBe('see [a channel]');
  });

  it('keeps an emoji’s name and drops the id pointing at the guild', () => {
    expect(redact('<:thalmor:1498207051762106438>')).toBe(':thalmor:');
    expect(redact('<a:wave:1498207051762106438>')).toBe(':wave:');
  });

  it('strips every link, signed CDN ones included', () => {
    const cdn = 'https://cdn.discordapp.com/attachments/149/150/x.png?ex=1&is=2&hm=deadbeef';
    expect(redact(`proof: ${cdn}`)).toBe('proof: [link]');
    expect(redact('http://example.com/a')).toBe('[link]');
  });

  it('sweeps hand-pasted snowflakes', () => {
    expect(redact('his id is 1498207051762106438 apparently')).toBe('his id is [id] apparently');
  });

  it('strips the marks of the tool the report was typed into', () => {
    // A filing renders as plain text, so none of this formats — it just shows.
    expect(redact('```While patrolling I saw nothing.```')).toBe('While patrolling I saw nothing.');
    expect(redact('[While patrolling I saw nothing.]')).toBe('While patrolling I saw nothing.');
    expect(redact('**Agent:** Falcril')).toBe('Agent: Falcril');
    expect(redact('*emphasis* and **strong**')).toBe('emphasis and strong');
    expect(redact('### Findings')).toBe('Findings');
    expect(redact('- [ ] a task')).toBe('- a task');
  });

  it('leaves an underscore inside a word alone', () => {
    // Stripping these would maul the very handles the survivor check hunts for.
    expect(redact('a_name_like_this')).toBe('a_name_like_this');
    expect(redact('_emphasised_ text')).toBe('emphasised text');
  });

  it('KEEPS the redaction markers, which are themselves bracketed', () => {
    // The ordering this pins is the whole risk in tidying: strip brackets after
    // the redaction runs and you erase exactly the marks that tell a reader
    // something was taken out.
    expect(redact('**see** <@1498207051762106438> there'))
      .toBe('see [an agent] there');
    expect(redact('[proof: https://cdn.discordapp.com/x.png]'))
      .toBe('proof: [link]');
    expect(redact('*ping* <@&1498207051762106438>')).toBe('ping [a rank]');
  });

  it('leaves ordinary prose alone', () => {
    const prose = 'Encountered a Nord named Olaf who gave praise to Talos for his rescue.';
    expect(redact(prose)).toBe(prose);
  });
});

describe('the survivor check', () => {
  const secrets = identifiersIn([message('x')]);

  it('collects usernames and ids, never display names', () => {
    // A display name identifies nobody — Discord has no lookup by it — and in
    // this guild they are the character names the reports are about.
    expect(secrets.has('a_real_handle')).toBe(true);
    expect(secrets.has('1498207051762106438')).toBe(true);
    expect(secrets.has('Iwelien')).toBe(false);
  });

  it('passes text the redaction cleaned', () => {
    expect(survivors(redact('<@1498207051762106438> reported in'), secrets)).toEqual([]);
  });

  it('catches a handle the redaction never had a rule for', () => {
    // This is the case the whole check exists for: a username written out in
    // prose is not markup, not a link and not a snowflake, so nothing in
    // redact() touches it.
    expect(survivors('signed, a_real_handle', secrets)).toContain('a_real_handle');
  });

  it('catches a bare id and a url on their own terms', () => {
    expect(survivors('1498207051762106438', secrets)).toContain('<bare snowflake id>');
    expect(survivors('https://example.com', secrets)).toContain('<url>');
  });

  it('ignores identifiers too short to be anything but a collision', () => {
    expect(survivors('the cat sat', new Set(['cat']))).toEqual([]);
  });
});

describe('what counts as a report', () => {
  it('takes anything with an agent header, however short', () => {
    expect(isReport("Agent's name: Lakkon")).toBe(true);
    expect(isReport('Agent name - Rivi')).toBe(true);
  });

  it('takes anything long enough to be substance', () => {
    expect(isReport('x'.repeat(400))).toBe(true);
    expect(isReport('x'.repeat(399))).toBe(false);
  });

  it('leaves chatter out', () => {
    // 1900 of the 2687 messages in the last full export were exactly this.
    expect(isReport('lol')).toBe(false);
    expect(isReport('on my way')).toBe(false);
  });
});

describe('stated in-world dates', () => {
  it('reads the month the report names', () => {
    expect(statedDate('2nd of Second Seed, a quiet night')).toBe('2nd of Second Seed');
    expect(statedDate('Rain’s Hand 28')).toBe('Rain’s Hand 28');
  });

  it('returns null rather than guessing', () => {
    expect(statedDate('no date here at all')).toBeNull();
  });
});

describe('toFilings', () => {
  it('drops a filing that fails the survivor check rather than publishing it', () => {
    // Unattended: there is nobody to read a warning before a hundred people
    // read the leak, so the only safe outcome is to drop the filing.
    const leaky = message(`Agent's name: X. Contact confirmed by a_real_handle.`);
    const { filings, dropped } = toFilings([leaky], 'lakkon', identifiersIn([leaky]));

    expect(filings).toEqual([]);
    expect(dropped).toBe(1);
  });

  it('publishes a clean filing with its agent and dates', () => {
    const clean = message(
      `Agent's name: Lakkon. 2nd of Second Seed. Watched the road and saw nothing.`,
    );
    const { filings, dropped } = toFilings([clean], 'lakkon', identifiersIn([clean]));

    expect(dropped).toBe(0);
    expect(filings).toHaveLength(1);
    expect(filings[0]?.agent).toBe('lakkon');
    expect(filings[0]?.inWorld).toBe('2nd of Second Seed');
    expect(filings[0]?.filedAt).toBe('2026-08-25T21:00:18.790Z');
  });

  it('ignores bots', () => {
    const bot = message('x'.repeat(500), { author: { ...author, bot: true } });
    expect(toFilings([bot], 'lakkon', new Set()).filings).toEqual([]);
  });
});

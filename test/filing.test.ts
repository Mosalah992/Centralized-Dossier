import { describe, expect, it } from 'vitest';

import {
  CATEGORY_INFO,
  FILING_CATEGORIES,
  FILING_LIMITS,
  IMPORTANCE_INFO,
  IMPORTANCE_LEVELS,
  OPEN_IMPORTANCE,
  checkFiling,
  checkParchmentRequest,
  importanceFor,
  incidentClock,
  incidentDate,
  incidentNow,
} from '../shared/filing';
import { reckon } from '../shared/reckoning';
import { SAMPLES } from '../scribe/samples';

const valid = SAMPLES[0]!.request.filing;

describe('the filing model', () => {
  it('files every category where the plan sends it', () => {
    const where = Object.fromEntries(
      FILING_CATEGORIES.map((c) => {
        const to = CATEGORY_INFO[c].destination;
        return [c, to.kind === 'cabinet' ? to.wing : to.kind];
      }),
    );
    expect(where).toEqual({
      bulletin: 'board',
      troops: 'military',
      logistics: 'logistics',
      bureau: 'intelligence',
      embassy: 'diplomatic',
      patrol: 'military',
      training: 'military',
      'lesson-magic': 'scholarship',
      'lesson-language': 'scholarship',
      application: 'clerk',
      'public-request': 'clerk',
    });
    expect(FILING_CATEGORIES.filter((c) => CATEGORY_INFO[c].open)).toEqual(['application', 'public-request']);
  });

  it('maps the five levels onto the Cabinet’s severities, and only the top two summon anyone', () => {
    expect(IMPORTANCE_LEVELS.map((l) => [IMPORTANCE_INFO[l].name, IMPORTANCE_INFO[l].severity, IMPORTANCE_INFO[l].summons])).toEqual([
      ['Standard Routine', 'low', 'none'],
      ['Nominal', 'informational', 'none'],
      ['Notable', 'medium', 'none'],
      ['Strategic', 'high', 'command'],
      ['Cataclysm', 'critical', 'all'],
    ]);
  });

  it('never lets an open filing summon anybody', () => {
    for (const level of OPEN_IMPORTANCE) expect(IMPORTANCE_INFO[level].summons).toBe('none');
    expect(importanceFor('application')).toEqual(OPEN_IMPORTANCE);
    const raised = checkFiling({ ...valid, category: 'public-request', importance: 'cataclysm' });
    expect(raised).toMatchObject({ ok: false, field: 'importance' });
    expect(checkFiling({ ...valid, category: 'troops', importance: 'cataclysm' }).ok).toBe(true);
  });

  it('accepts every sample', () => {
    for (const { request } of SAMPLES) expect(checkFiling(request.filing)).toMatchObject({ ok: true });
  });

  it('cleans what it accepts', () => {
    const checked = checkFiling({
      ...valid,
      rank: '  Captain\t',
      name: 'Aelindor\u0000  Saerhal',
      superior: '   ',
      body: 'First line.   \r\n\r\n\r\n\r\nSecond, after a long gap.',
    });
    expect(checked.ok && checked.value).toMatchObject({
      rank: 'Captain',
      name: 'Aelindor Saerhal',
      superior: null,
      body: 'First line.\n\nSecond, after a long gap.',
    });
  });

  it('asks for a rank only of members', () => {
    expect(checkFiling({ ...valid, rank: '' })).toMatchObject({ ok: false, field: 'rank' });
    expect(checkFiling({ ...valid, category: 'application', rank: '' })).toMatchObject({ ok: true });
  });

  it('nails a Bulletin Post to a section, never to Bounties', () => {
    expect(checkFiling({ ...valid, category: 'bulletin' })).toMatchObject({ ok: false, field: 'section' });
    expect(checkFiling({ ...valid, category: 'bulletin', section: 'bounties' })).toMatchObject({ ok: false, field: 'section' });
    const posted = checkFiling({ ...valid, category: 'bulletin', section: 'propaganda' });
    expect(posted.ok && posted.value.section).toBe('propaganda');
    // A section on anything else is dropped rather than carried.
    const report = checkFiling({ ...valid, section: 'propaganda' });
    expect(report.ok && report.value.section).toBeNull();
  });

  it('holds every field to its limit', () => {
    expect(checkFiling({ ...valid, title: 'x'.repeat(FILING_LIMITS.title + 1) })).toMatchObject({ ok: false, field: 'title' });
    expect(checkFiling({ ...valid, body: 'x'.repeat(FILING_LIMITS.body + 1) })).toMatchObject({ ok: false, field: 'body' });
    expect(checkFiling({ ...valid, body: 'Too short.' })).toMatchObject({ ok: false, field: 'body' });
    expect(checkFiling({ ...valid, name: '' })).toMatchObject({ ok: false, field: 'name' });
  });

  it('knows the Tamrielic months', () => {
    const on = (monthIndex: number, day: number) => checkFiling({ ...valid, time: { ...valid.time, monthIndex, day } });
    expect(on(2, 28).ok).toBe(true);
    expect(on(2, 29)).toMatchObject({ ok: false, field: 'time' });
    expect(on(13, 1)).toMatchObject({ ok: false, field: 'time' });
    expect(checkFiling({ ...valid, time: { ...valid.time, hour: 24 } })).toMatchObject({ ok: false, field: 'time' });
  });

  it('writes the hour as the room’s plate does', () => {
    const time = { year: 226, monthIndex: 9, day: 4, hour: 18, minute: 4 };
    expect(incidentDate(time)).toBe('4th of Heartfire, 4E 226');
    expect(incidentClock(time)).toBe('6:04 PM');
    expect(incidentClock({ ...time, hour: 0, minute: 0 })).toBe('12:00 AM');
    expect(incidentClock({ ...time, hour: 12 })).toBe('12:04 PM');
    expect(incidentDate({ ...time, day: 12, monthIndex: 1 })).toBe('12th of Morning Star, 4E 226');
  });

  it('resolves "now" to the realm’s own hour, once', () => {
    const at = Date.UTC(2026, 10, 2, 18, 0, 0);
    const { year, monthIndex, day, hour, minute } = reckon(at);
    expect(incidentNow(at)).toEqual({ year, monthIndex, day, hour, minute });
  });

  it('checks what the renderer is asked to draw', () => {
    expect(checkParchmentRequest(SAMPLES[5]!.request)).toMatchObject({ ok: true });
    expect(checkParchmentRequest({ filing: valid })).toMatchObject({ ok: true, value: { serial: null, stamp: null } });
    expect(checkParchmentRequest({ filing: valid, serial: 0 }).ok).toBe(false);
    expect(checkParchmentRequest({ filing: valid, stamp: { mark: 'sealed', at: valid.time } }).ok).toBe(false);
    expect(checkParchmentRequest({ filing: { ...valid, title: '' } })).toMatchObject({ ok: false, error: /^title:/ });
  });
});

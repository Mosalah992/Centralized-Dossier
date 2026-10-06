import { describe, expect, it } from 'vitest';

import { parseReportRecord } from '../shared/reports';

const words = (s: string) => s.split(/\s+/).filter(Boolean);

describe('report record layout', () => {
  it('lays template lines out as fields and keeps prose', () => {
    expect(parseReportRecord('Location: Solitude\nSubject: The East Empire Company\n\nTwo agents observed the docks.\nThey left at dusk.'))
      .toEqual([
        { kind: 'field', label: 'Location', value: 'Solitude' },
        { kind: 'field', label: 'Subject', value: 'The East Empire Company' },
        { kind: 'prose', text: 'Two agents observed the docks.\nThey left at dusk.' },
      ]);
  });

  it('leaves narrative colons as prose', () => {
    expect(parseReportRecord('the agent said: we wait')).toEqual([{ kind: 'prose', text: 'the agent said: we wait' }]);
    expect(parseReportRecord('A very long sentence that only happens to have: a colon')).toEqual([
      { kind: 'prose', text: 'A very long sentence that only happens to have: a colon' },
    ]);
  });

  it('never drops or reorders text', () => {
    const body = 'Intro line\nDate: 4E 226\nmiddle prose: lower case\n\nOutcome: Arrested\nclosing';
    const out = parseReportRecord(body)
      .map((b) => (b.kind === 'field' ? `${b.label}: ${b.value}` : b.text)).join('\n');
    expect(words(out)).toEqual(words(body));
  });

  it('returns nothing for an empty body', () => {
    expect(parseReportRecord('')).toEqual([]);
  });
});

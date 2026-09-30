import { describe, expect, it } from 'vitest';

import { extractReportSeverity, filterReportMessage } from '../shared/reports';

const body = 'The patrol completed its survey without incident. '.repeat(8);
const message = (over: Record<string, unknown> = {}) => ({
  id: '123456789012345678',
  content: body,
  timestamp: '2026-09-29T12:00:00.000Z',
  author: { id: '987654321098765432', username: 'private-handle' },
  ...over,
});

describe('Reports ingestion filtering', () => {
  it('includes a long text report and cleans Discord markup without retaining a handle', () => {
    const result = filterReportMessage(message({ content: `# Survey\n<@987654321098765432> ${body}<:seal:123456789012345678>` }));
    expect(result).toMatchObject({ included: true });
    if (!result.included) return;
    expect(result.text).toContain('an agent');
    expect(result.text).toContain('seal');
    expect(result.text).not.toContain('<@');
  });

  it.each([
    ['bot', message({ author: { id: '1', bot: true } })],
    ['system', message({ type: 7 })],
    ['attachment', message({ content: '', attachments: [{}] })],
    ['embed', message({ embeds: [{}] })],
    ['url', message({ content: `${body} https://example.com/evidence` })],
    ['short', message({ content: 'A brief note.' })],
  ] as const)('drops %s messages', (reason, input) => {
    expect(filterReportMessage(input)).toEqual({ included: false, reason });
  });

  it('drops bare domains before text can be persisted', () => {
    expect(filterReportMessage(message({ content: `${body} evidence.example.org/path` })))
      .toEqual({ included: false, reason: 'url' });
  });

  it('classifies a leading severity field and excludes it from the stored text', () => {
    const result = filterReportMessage(message({ content: `Severity: High\n${body}` }));
    expect(result).toMatchObject({ included: true, severity: 'high' });
    if (!result.included) return;
    expect(result.text).not.toContain('Severity:');
  });

  it('uses unassessed for missing or invalid severity metadata', () => {
    expect(extractReportSeverity(body).severity).toBe('unassessed');
    expect(extractReportSeverity(`Severity: Urgent\n${body}`)).toMatchObject({ severity: 'unassessed', body: body.trim() });
  });
});

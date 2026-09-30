import { describe, expect, it } from 'vitest';

import { REPORT_CATEGORIES } from '../reporter/src/config';
import { resolveReportSources, type DiscordChannel } from '../reporter/src/sources';

const channel = (
  id: string,
  name: string,
  type: number,
  parent_id: string | null,
): DiscordChannel => ({ id, name, type, parent_id });

describe('Reports Discord source discovery', () => {
  it.each(['Military', 'Informants'] as const)(
    'reads every eligible named child under %s',
    (categoryName) => {
      const category = REPORT_CATEGORIES.find((entry) => entry.name === categoryName)!;
      const channels = [
        channel(category.id, `${categoryName.toLowerCase()}-reports`, 4, null),
        channel('named-one', 'ainz-armas', 0, category.id),
        channel('named-two', 'haldir', 0, category.id),
        channel('voice', 'briefing-room', 2, category.id),
        channel('elsewhere', 'unrelated', 0, 'different-category'),
      ];

      expect(resolveReportSources(channels, category).sources.map((source) => source.name))
        .toEqual(['ainz-armas', 'haldir']);
    },
  );

  it('keeps ordinary operational chat out of reports-only categories', () => {
    const category = REPORT_CATEGORIES.find((entry) => entry.name === 'Logistics')!;
    const channels = [
      channel(category.id, 'logistics', 4, null),
      channel('reports', 'supply-reports', 0, category.id),
      channel('chat', 'administrator-chat', 0, category.id),
    ];

    expect(resolveReportSources(channels, category).sources.map((source) => source.name))
      .toEqual(['supply-reports']);
  });
});

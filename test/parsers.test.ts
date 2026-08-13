import { describe, expect, it } from 'vitest';

import { parseRoster, summarize, handleParts } from '../shared/parsers/roster';
import { parseStats } from '../shared/parsers/stats';
import { parseLedger } from '../shared/parsers/ledger';
import { parseStipends } from '../shared/parsers/stipends';
import { parseHonor } from '../shared/parsers/honor';
import { parseCalendar, eventsOf } from '../shared/parsers/calendar';
import { VOLUMES, getVolume, resolveTabTitle } from '../shared/volumes';
import { num, isOrnament } from '../shared/text';
import {
  rosterGrid, statsGrid, ledgerGrid, stipendsGrid, honorGrid, calendarGrid, CALENDAR_COLORS,
} from './fixtures';

describe('text helpers', () => {
  it('reads comma-formatted numbers and negatives', () => {
    expect(num('39,300')).toBe(39300);
    expect(num('-200')).toBe(-200);
    expect(num('0')).toBe(0);
  });

  it('distinguishes blank from zero', () => {
    expect(num('')).toBeNull();
    expect(num('  ')).toBeNull();
    expect(num('not a number')).toBeNull();
  });

  it('recognises both ornament styles and the footer', () => {
    expect(isOrnament('❖ Hall of Honor ❖')).toBe(true);
    expect(isOrnament('■ Troops Roster ■')).toBe(true);
    expect(isOrnament('❖ For the glory of the Third Aldmeri Dominion ❖')).toBe(true);
    expect(isOrnament('Aranwe')).toBe(false);
  });
});

describe('volume registry', () => {
  it('defines six volumes with unique slugs', () => {
    expect(VOLUMES).toHaveLength(6);
    expect(new Set(VOLUMES.map((v) => v.slug)).size).toBe(6);
  });

  it('only the calendar needs grid formatting', () => {
    const needing = VOLUMES.filter((v) => v.needsGridData).map((v) => v.slug);
    expect(needing).toEqual(['calendar']);
  });

  it('resolves an exact tab regardless of case and stray spacing', () => {
    const roster = getVolume('roster')!;
    expect(resolveTabTitle(roster, ['Index', 'Roster ', 'Stats'])).toBe('Roster ');
  });

  it('resolves the calendar by prefix, preferring the latest year', () => {
    const calendar = getVolume('calendar')!;
    const titles = ['Tamrielic Calendar 4E 226', 'Tamrielic Calendar 4E 227', 'Draft'];
    expect(resolveTabTitle(calendar, titles)).toBe('Tamrielic Calendar 4E 227');
  });

  it('returns null when a tab has been deleted rather than guessing', () => {
    const ledger = getVolume('ledger')!;
    expect(resolveTabTitle(ledger, ['Index', 'Roster'])).toBeNull();
  });
});

describe('roster', () => {
  const members = parseRoster(rosterGrid);

  it('keeps only rows with a name, dropping spacers and ornament', () => {
    expect(members.map((m) => m.name)).toEqual(['Aranwe', 'Torvaril', 'Miraleth', 'Sildwen']);
  });

  it('records the 1-based sheet row so cells stay addressable', () => {
    expect(members[0]!.row).toBe(4);
    // Miraleth follows a spacer row, so its row is 7, not 6.
    expect(members[2]!.row).toBe(7);
  });

  it('splits multiple Discord handles', () => {
    expect(members[1]!.discord).toEqual(['torvaril', 'torv.alt']);
    expect(members[2]!.discord).toEqual([]);
  });

  it('reads the bot-owned checkbox and hours columns', () => {
    expect(members[0]!.owed).toBe(true);
    expect(members[0]!.hours).toBeCloseTo(11.26);
    expect(members[3]!.paid).toBe(true);
  });

  it('treats blank hours as zero', () => {
    expect(members[3]!.hours).toBe(0);
  });

  it('summarizes by status', () => {
    const { total, byStatus } = summarize(members);
    expect(total).toBe(4);
    expect(byStatus).toContainEqual({ label: 'ACTIVE', count: 2 });
    expect(byStatus).toContainEqual({ label: 'LOA', count: 1 });
  });

  it('normalizes handles', () => {
    expect(handleParts('@Roselord / Slimely')).toEqual(['roselord', 'slimely']);
  });
});

describe('stats', () => {
  const stats = parseStats(statsGrid);

  it('reads the membership block', () => {
    expect(stats.membership[0]).toEqual({ label: 'TOTAL MEMBERS', count: 99 });
    expect(stats.membership.map((t) => t.label)).toContain('ARRESTED');
  });

  it('reads the tier headers', () => {
    expect(stats.corps.tiers).toEqual(['JUNIOR', 'SENIOR', 'ELITE', 'LEADER']);
  });

  it('keeps "not applicable" distinct from an explicit zero', () => {
    const medical = stats.corps.rows.find((r) => r.label === 'MEDICAL')!;
    expect(medical.tiers['JUNIOR']).toBeNull();
    expect(medical.tiers['SENIOR']).toBe(4);

    const officers = stats.corps.rows.find((r) => r.label === 'OFFICERS')!;
    expect(officers.tiers['SENIOR']).toBe(0);
  });

  it('totals a corps row across its tiers', () => {
    expect(stats.corps.rows.find((r) => r.label === 'SOLDIERS')!.total).toBe(27);
    expect(stats.corps.rows.find((r) => r.label === 'MEDICAL')!.total).toBe(5);
  });

  it('sweeps past interior gaps in the race column', () => {
    const races = stats.races.map((r) => r.label);
    expect(races).toContain('Argonian');
    // Redguard sits below a blank row and must still be collected.
    expect(races).toContain('Redguard');
  });

  it('reads the wing block', () => {
    expect(stats.wings).toContainEqual({ label: 'Militant Wing', count: 61 });
  });
});

describe('ledger', () => {
  const ledger = parseLedger(ledgerGrid);

  it('reads the pay tiers and stops at the totals row', () => {
    expect(ledger.tiers.map((t) => t.role)).toEqual([
      'Emissary', 'Justiciar', 'Ambassador / Talon', 'Recruit / Intern',
    ]);
  });

  it('keeps a zero-payment tier', () => {
    const recruit = ledger.tiers.find((t) => t.role === 'Recruit / Intern')!;
    expect(recruit.payment).toBe(0);
    expect(recruit.owed).toBe(4);
  });

  it('reads the live COUNTIFS results rather than recomputing them', () => {
    const justiciar = ledger.tiers.find((t) => t.role === 'Justiciar')!;
    expect(justiciar.owed).toBe(2);
    expect(justiciar.total).toBe(1600);
    expect(ledger.totalActiveTroopsOwed).toBe(33);
  });

  it('treats tier Paid as a count and expense Paid as a checkbox', () => {
    expect(ledger.tiers.find((t) => t.role === 'Justiciar')!.paidCount).toBe(2);
    expect(ledger.expenses.find((e) => e.expense === 'Potions Reimbursement')!.paid).toBe(true);
    expect(ledger.expenses.find((e) => e.expense === 'Embassy rent per month')!.paid).toBe(false);
  });

  it('drops trailing rows that hold only an unchecked box', () => {
    expect(ledger.expenses).toHaveLength(3);
    expect(ledger.expenses.every((e) => e.expense !== '')).toBe(true);
  });

  it('keeps negative corrections', () => {
    expect(ledger.expenses.find((e) => e.expense === 'Promotion wage adjustment')!.amount).toBe(-200);
  });

  it('pairs summary labels with their figures across gaps and connectors', () => {
    const labels = ledger.summary.map((s) => s.label);
    expect(labels).toEqual([
      'Troops Wages', 'Expenses', 'Total Weekly Expense', 'Current Balance', 'Estimated Balance',
    ]);
    expect(ledger.summary.find((s) => s.label === 'Current Balance')!.numeric).toBe(39300);
    // The original formatting is preserved for display.
    expect(ledger.summary.find((s) => s.label === 'Current Balance')!.value).toBe('39,300');
  });

  it('captures the treasurer commentary', () => {
    expect(ledger.commentary).toMatch(/5000 Septim buffer/);
  });
});

describe('stipends', () => {
  const stipends = parseStipends(stipendsGrid);

  it('splits the two-line in-world week into from/to', () => {
    expect(stipends.weeks[0]!.from).toBe("Mondas, 13th of Sun's Height 4E 226");
    expect(stipends.weeks[0]!.to).toBe("Sundas, 19th of Sun's Height 4E 226");
  });

  it('strips thousands separators but keeps the formatted original', () => {
    expect(stipends.weeks[0]!.spent).toBe(24070);
    expect(stipends.weeks[0]!.display.spent).toBe('24,070');
  });

  it('reads the running balance beside the header', () => {
    expect(stipends.balanceForWeek).toBe('45,000');
  });

  it('reads the per-row note', () => {
    expect(stipends.weeks[1]!.note).toMatch(/Previous week's Balance/);
  });

  it('stops at the footer', () => {
    expect(stipends.weeks).toHaveLength(2);
  });
});

describe('hall of honor', () => {
  const entries = parseHonor(honorGrid);

  it('drops the title, footer and padding rows', () => {
    expect(entries).toHaveLength(2);
  });

  it('keeps honorifics as part of the name', () => {
    expect(entries[0]!.name).toBe('First Emissary Indoril Aranwe');
    expect(entries[0]!.citation).toMatch(/retired to Alinor/);
  });
});

describe('calendar', () => {
  const year = parseCalendar(calendarGrid);

  it('reads the ornamented title', () => {
    expect(year.title).toBe('Tamrielic Calendar 4E 226');
  });

  it('reads the legend from the sheet rather than hard-coded colours', () => {
    expect(year.legend).toHaveLength(4);
    expect(year.legend.find((l) => l.color === CALENDAR_COLORS.AUDIT)!.label)
      .toMatch(/^Audit/);
  });

  it('finds each month block from its weekday header', () => {
    expect(year.months.map((m) => m.name)).toEqual(['Morning Star', "Sun's Dawn"]);
  });

  it('indexes months by the canonical Tamrielic order', () => {
    expect(year.months[0]!.index).toBe(1);
    expect(year.months[1]!.index).toBe(2);
  });

  it('pads the first week with nulls where the month has not started', () => {
    const firstWeek = year.months[0]!.weeks[0]!;
    expect(firstWeek.slice(0, 4).every((d) => d === null)).toBe(true);
    expect(firstWeek[4]!.day).toBe(1);
    expect(firstWeek[4]!.weekday).toBe('Turdas');
  });

  it('decodes day kind from background colour via the legend', () => {
    const firstWeek = year.months[0]!.weeks[0]!;
    expect(firstWeek[4]!.kind).toMatch(/^Audit/);
    expect(firstWeek[5]!.kind).toBe('Ordinary day');

    const secondWeek = year.months[0]!.weeks[1]!;
    expect(secondWeek[1]!.day).toBe(5);
    expect(secondWeek[1]!.kind).toMatch(/^Morndas/);
  });

  it('parses a note into name, in-world date and caution', () => {
    const festival = year.months[0]!.weeks[2]!.find((d) => d?.day === 15)!;
    expect(festival.event).toEqual({
      name: "South Wind's Prayer",
      date: "Morning Star 15, 4E 226",
      caution: 'Watch for unlawful observance.',
    });
  });

  it('strips the ornament from an audit note name', () => {
    const audit = year.months[0]!.weeks[0]![4]!;
    expect(audit.event!.name).toBe('Annual inventory - every seal verified');
  });

  it('leaves days without a note eventless', () => {
    expect(year.months[0]!.weeks[0]![5]!.event).toBeNull();
  });

  it('collects every noted day in calendar order', () => {
    const events = eventsOf(year);
    expect(events.map((e) => e.event.name)).toEqual([
      'Annual inventory - every seal verified',
      "South Wind's Prayer",
    ]);
    expect(events[0]!.month).toBe('Morning Star');
  });
});

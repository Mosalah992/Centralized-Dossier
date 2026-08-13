// Runs the parsers against the real spreadsheet dump in tmp/tabs/, which is
// git-ignored — so these are skipped in a fresh clone and in CI, and only bite
// locally after `npm run dump`. Fixture tests pin behaviour; these catch the
// sheet drifting out from under us.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { FormattedGrid, Grid } from '../shared/types';
import { parseRoster } from '../shared/parsers/roster';
import { parseStats } from '../shared/parsers/stats';
import { parseLedger } from '../shared/parsers/ledger';
import { parseStipends } from '../shared/parsers/stipends';
import { parseHonor } from '../shared/parsers/honor';
import { parseCalendar, eventsOf } from '../shared/parsers/calendar';
import { VOLUMES, resolveTabTitle } from '../shared/volumes';

const TABS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'tmp', 'tabs',
);

const hasDump = fs.existsSync(path.join(TABS_DIR, '_index.json'));

const read = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(TABS_DIR, file), 'utf8'));

const values = (file: string): Grid => read(file).values ?? [];

describe.skipIf(!hasDump)('live sheet dump', () => {
  it('every volume resolves to a tab that exists', () => {
    const titles: string[] = read('_index.json').map((t: { tab: string }) => t.tab);
    for (const volume of VOLUMES) {
      expect(resolveTabTitle(volume, titles), `${volume.slug} did not resolve`).not.toBeNull();
    }
  });

  it('parses the roster', () => {
    const members = parseRoster(values('roster.json'));
    expect(members.length).toBeGreaterThan(50);
    expect(members.every((m) => m.name)).toBe(true);
    // Sheet rows are 1-based and start below the row-3 header.
    expect(members[0]!.row).toBeGreaterThanOrEqual(4);
    // Handles are the bot's join key — most members must have one.
    expect(members.filter((m) => m.discord.length).length).toBeGreaterThan(members.length / 2);
  });

  it('parses the statistics blocks', () => {
    const stats = parseStats(values('stats.json'));
    expect(stats.membership.find((t) => t.label === 'TOTAL MEMBERS')).toBeTruthy();
    expect(stats.corps.tiers).toEqual(['JUNIOR', 'SENIOR', 'ELITE', 'LEADER']);
    expect(stats.races.length).toBeGreaterThan(5);
    expect(stats.wings.length).toBeGreaterThan(2);
  });

  it('parses the ledger and agrees with the sheet arithmetic', () => {
    const ledger = parseLedger(values('ledger.json'));
    expect(ledger.tiers.length).toBeGreaterThan(3);
    // Payment x Owed = Total is the sheet's own formula; if our reading of the
    // columns is right, it holds for every tier.
    for (const tier of ledger.tiers) {
      expect(tier.payment * tier.owed, `tier ${tier.role}`).toBe(tier.total);
    }
    expect(ledger.expenses.every((e) => e.expense !== '')).toBe(true);
    expect(ledger.summary.length).toBeGreaterThan(2);
  });

  it('parses the stipend weeks', () => {
    const stipends = parseStipends(values('stipends.json'));
    expect(stipends.weeks.length).toBeGreaterThan(0);

    for (const week of stipends.weeks) {
      // Both lines of the in-world range must survive the split.
      expect(week.from).not.toBe('');
      expect(week.to).not.toBe('');
      expect(week.from).not.toBe(week.to);
      expect(week.received).toBeGreaterThan(0);
      // Thousands separators are stripped for the number, kept for display.
      expect(week.display.received).toMatch(/,/);
    }

    // Deliberately NOT asserting received - spent === balance. Only the first
    // row carries the =C-D formula; later balances are typed by hand and at
    // least one does not reconcile. The archive reports what the treasury
    // wrote — reconciling it is their business, not the parser's.
    expect(stipends.balanceForWeek).not.toBe('');
  });

  it('parses the hall of honor', () => {
    const entries = parseHonor(values('hall-of-honor.json'));
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.name && !e.name.startsWith('❖'))).toBe(true);
  });

  it('parses a full Tamrielic year from the formatted grid', () => {
    const file = fs.readdirSync(TABS_DIR).find((f) => f.endsWith('.formatted.json'));
    expect(file, 'no formatted calendar dump — re-run npm run dump').toBeTruthy();

    const grid: FormattedGrid = read(file!).grid;
    const year = parseCalendar(grid);

    expect(year.months).toHaveLength(12);
    expect(year.months.map((m) => m.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(year.legend).toHaveLength(4);

    // A Tamrielic year is 365 days, and every day must decode to a legend kind.
    const days = year.months.flatMap((m) => m.weeks.flat()).filter((d) => d !== null);
    expect(days).toHaveLength(365);
    expect(days.every((d) => d!.kind !== '')).toBe(true);

    // Every Morndas that is not a festival or audit is a reconciliation day.
    const morndas = days.filter((d) => d!.weekday === 'Morndas');
    expect(morndas.length).toBe(52);

    expect(eventsOf(year).length).toBeGreaterThan(10);
    expect(eventsOf(year).every((e) => e.event.name && e.event.date)).toBe(true);
  });
});

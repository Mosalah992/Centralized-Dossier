// Stipends tab — the Imperial Mint registry.
//
//   B Week | C Amount Received | D Amount Spent | E Balance
//
// Column B is a single cell holding a two-line in-world date range:
//
//   Mondas, 13th of Sun's Height 4E 226
//   Sundas, 19th of Sun's Height 4E 226
//
// Figures are comma-formatted strings; both the number and the original
// formatting are kept, since the archive renders the sheet's own presentation.

import type { Grid, Stipends, StipendWeek } from '../types';
import { at, findRow, isOrnament, lines, num } from '../text';

const COL = { WEEK: 1, RECEIVED: 2, SPENT: 3, BALANCE: 4, NOTE: 6 } as const;
const BALANCE_LABEL = 6; // column G, alongside the header row

export function parseStipends(grid: Grid): Stipends {
  const header = findRow(grid, COL.WEEK, 'Week');
  if (header < 0) return { weeks: [], balanceForWeek: '' };

  const weeks: StipendWeek[] = [];
  for (let r = header + 1; r < grid.length; r++) {
    const week = at(grid, r, COL.WEEK);
    if (!week) continue;
    if (isOrnament(week)) break;

    const [from = '', to = ''] = lines(week);
    const received = at(grid, r, COL.RECEIVED);
    const spent = at(grid, r, COL.SPENT);
    const balance = at(grid, r, COL.BALANCE);

    weeks.push({
      row: r + 1,
      from,
      // A single-line range is legitimate; mirror `from` rather than inventing.
      to: to || from,
      received: num(received) ?? 0,
      spent: num(spent) ?? 0,
      balance: num(balance) ?? 0,
      display: { received, spent, balance },
      note: at(grid, r, COL.NOTE),
    });
  }

  return {
    weeks,
    // "Balance for the Week" is labelled a row above its own figure.
    balanceForWeek: at(grid, header, BALANCE_LABEL),
  };
}

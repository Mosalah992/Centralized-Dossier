// Ledger tab — hand-maintained by the treasury, and the most volatile of the
// six. Between 2026-07-25 and 2026-08-13 its tiers, totals and expense rows all
// changed, so every block is anchored on its header row rather than a fixed
// row number.
//
//   Pay tiers   header "Role"    -> Role | Payment | Owed | Total | Paid | Names
//   Total row   "Total Active Troops Owed"
//   Expenses    header "Expense" -> Expense | (C) | Amount | To | Paid ☑ | Description
//   Summary     label/value pairs strung across one row
//
// `Owed` and `Total` are live COUNTIFS/product formulas over the Roster's Owed
// checkboxes. We read the computed values and never recompute them — the sheet
// owns that arithmetic.
//
// Note the two meanings of "Paid": a *count* of already-paid members on a pay
// tier, a *checkbox* on an expense row.

import type { Expense, Grid, Ledger, PayTier } from '../types';
import { at, bool, findRow, isOrnament, num, rowAt } from '../text';

const TIER = { ROLE: 1, PAYMENT: 2, OWED: 3, TOTAL: 4, PAID: 5, NAMES: 6 } as const;
const EXP = { NAME: 1, AMOUNT: 3, TO: 4, PAID: 5, DESCRIPTION: 6 } as const;

const TOTAL_OWED_LABEL = /^total active troops owed/i;
const SUMMARY_ANCHOR = /^troops wages/i;

function parseTiers(grid: Grid, headerRow: number): { tiers: PayTier[]; endRow: number } {
  const tiers: PayTier[] = [];
  let r = headerRow + 1;

  for (; r < grid.length; r++) {
    const role = at(grid, r, TIER.ROLE);
    if (!role) continue;                       // spacer row inside the block
    if (TOTAL_OWED_LABEL.test(role)) break;    // totals row closes the block
    if (isOrnament(role)) break;

    // A tier must carry a payment figure; anything else is a stray label.
    const payment = num(at(grid, r, TIER.PAYMENT));
    if (payment === null) break;

    tiers.push({
      row: r + 1,
      role,
      payment,
      owed: num(at(grid, r, TIER.OWED)) ?? 0,
      total: num(at(grid, r, TIER.TOTAL)) ?? 0,
      paidCount: num(at(grid, r, TIER.PAID)) ?? 0,
      notes: at(grid, r, TIER.NAMES),
    });
  }

  return { tiers, endRow: r };
}

function parseExpenses(grid: Grid, headerRow: number): Expense[] {
  const expenses: Expense[] = [];

  for (let r = headerRow + 1; r < grid.length; r++) {
    const name = at(grid, r, EXP.NAME);
    // Trailing rows carry a bare unchecked box and no expense — not data.
    if (!name) continue;
    if (isOrnament(name)) break;
    if (SUMMARY_ANCHOR.test(name)) break;

    expenses.push({
      row: r + 1,
      expense: name,
      amount: num(at(grid, r, EXP.AMOUNT)) ?? 0,
      to: at(grid, r, EXP.TO),
      paid: bool(at(grid, r, EXP.PAID)),
      description: at(grid, r, EXP.DESCRIPTION),
    });
  }

  return expenses;
}

/**
 * The summary row strings label/value pairs across the sheet with gaps and
 * `+`/`=` connectors between them ("Troops Wages | 11300 | + | Expenses | 9250
 * | = | Total Weekly Expense | | 20550 | …"). Pair each text label with the
 * next numeric cell rather than hard-coding columns, since the treasurer moves
 * these about.
 */
function parseSummary(grid: Grid, row: number): Ledger['summary'] {
  if (row < 0) return [];
  const cells = rowAt(grid, row);
  const pairs: Ledger['summary'] = [];

  let pendingLabel: string | null = null;
  for (const raw of cells) {
    const cell = raw.replace(/\n/g, ' ').trim();
    if (!cell || cell === '+' || cell === '=') continue;

    const value = num(cell);
    if (value === null) {
      pendingLabel = cell;
    } else if (pendingLabel) {
      pairs.push({ label: pendingLabel, value: cell, numeric: value });
      pendingLabel = null;
    }
  }

  return pairs;
}

export function parseLedger(grid: Grid): Ledger {
  const tierHeader = findRow(grid, TIER.ROLE, 'Role');
  const { tiers, endRow } = tierHeader >= 0
    ? parseTiers(grid, tierHeader)
    : { tiers: [], endRow: 0 };

  const totalRow = findRow(grid, TIER.ROLE, TOTAL_OWED_LABEL, endRow);
  const totalActiveTroopsOwed = totalRow >= 0 ? num(at(grid, totalRow, TIER.OWED)) : null;

  const expenseHeader = findRow(grid, EXP.NAME, 'Expense', Math.max(endRow, 0));
  const expenses = expenseHeader >= 0 ? parseExpenses(grid, expenseHeader) : [];

  const summaryRow = findRow(grid, EXP.NAME, SUMMARY_ANCHOR, Math.max(expenseHeader, 0));
  const summary = parseSummary(grid, summaryRow);

  // The treasurer's standing advice sits in a merged cell below the summary.
  let commentary = '';
  for (let r = summaryRow + 1; r >= 0 && r < grid.length; r++) {
    const cell = at(grid, r, EXP.NAME);
    if (!cell || isOrnament(cell)) continue;
    if (num(cell) !== null) continue;
    commentary = cell;
    break;
  }

  return { tiers, totalActiveTroopsOwed, expenses, summary, commentary };
}

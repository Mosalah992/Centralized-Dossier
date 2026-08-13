// Structural fixtures. These mirror the real tabs cell-for-cell in shape —
// including their awkward parts — but carry invented names, so the repository
// never holds the live roster. Real data stays in git-ignored tmp/, which
// parsers.live.test.ts exercises when a dump is present.

import type { FormattedCell, FormattedGrid, Grid } from '../shared/types';

const FOOTER = '❖ For the glory of the Third Aldmeri Dominion ❖';

export const rosterGrid: Grid = [
  ['', '❖ Troops Roster · Thalmor Embassy of the Province of Skyrim ❖', '', '', '', '', '', '', '✦ = 5 Merits'],
  [],
  ['Unit', 'Rank', 'Name', 'Race', 'Discord', 'Status', 'Owed', 'Paid', 'Notes', 'Last Active', 'Total Hours'],
  ['Command', 'First Emissary', 'Aranwe', 'Altmer', '@aranwe', 'ACTIVE', 'TRUE', 'FALSE', '', '2026-08-11 04:12', '11.26'],
  // Two handles on one member, and an unchecked Owed.
  ['Militant', 'Justiciar', 'Torvaril', 'Altmer', '@torvaril / torv.alt', 'ACTIVE', 'FALSE', 'FALSE', 'FIREBALL', '2026-08-09 21:03', '36.69'],
  // Spacer row inside the table — no name, so not a member.
  ['', '', '', '', '', '', '', '', '', '', ''],
  ['Supply', 'Recruit', 'Miraleth', 'Khajiit', '', 'JUST JOINED', 'FALSE', 'FALSE', '', '', '0'],
  // Hours are blank rather than 0 for a member who never clocked in.
  ['Diplomatic', 'Ambassador', 'Sildwen', 'Bosmer', '@sildwen', 'LOA', 'FALSE', 'TRUE', 'on leave', '2026-07-02 10:00', ''],
  [],
  ['', FOOTER],
];

export const statsGrid: Grid = [
  ['', '❖ Roster Stats · Thalmor Embassy of the Province of Skyrim ❖'],
  [],
  ['', '', '', '', '', 'JUNIOR', 'SENIOR', 'ELITE', 'LEADER'],
  ['', 'TOTAL MEMBERS', '99', '', 'RECRUITS', '23', '', '', '', '', 'Altmer', '81', '', 'Command', '7'],
  ['', 'ACTIVE', '61', '', 'STAFF', '3', '9', '0', '', '', 'Bosmer', '1', '', 'Militant Wing', '61'],
  ['', 'INACTIVE', '8', '', 'SOLDIERS', '15', '8', '4', '', '', 'Khajiit', '14', '', 'Diplomatic Wing', '17'],
  ['', 'ABSENT', '1', '', 'OFFICERS', '8', '0', '0', '', '', 'Dunmer', '0', '', 'Administrative Wing', '13'],
  // MEDICAL has no JUNIOR figure at all — a gap, not a zero.
  ['', 'LOA', '6', '', 'MEDICAL', '', '4', '1', '', '', 'Orc', '1'],
  ['', 'JUST JOINED', '22', '', 'SUPPLY CORPS', '5', '', '1', '', '', 'Imperial', '0'],
  ['', 'ARRESTED', '0', '', 'BLACK TALON', '', '', '3', '', '', 'Breton', '1'],
  ['', '', '', '', 'AMBASSADORS', '3', '0', '1', '', '', 'Nord', '0'],
  ['', '', '', '', 'CANONREEVE', '', '', '', '1', '', 'Argonian', '0'],
  // A blank row inside the race column that later resumes — must not end it.
  ['', '', '', '', 'BATTLEREEVE', '', '', '', '1'],
  ['', '', '', '', 'ADVISOR', '', '', '', '1', '', 'Redguard', '0'],
  ['', '', '', '', 'EMISSARY', '', '', '', '1'],
  [],
  ['', FOOTER],
];

export const ledgerGrid: Grid = [
  ['', '❖ Financial Ledger · Thalmor Embassy of the Province of Skyrim ❖'],
  [],
  ['', 'Troops Weekly Owed Pay '],
  ['', 'Role', 'Payment', 'Owed', 'Total', 'Paid', 'Names '],
  ['', 'Emissary', '1000', '1', '1000', '0'],
  ['', 'Justiciar', '800', '2', '1600', '2'],
  ['', 'Ambassador / Talon', '500', '2', '1000', '1', 'Talons wages transfered to glass budget'],
  // Payment of 0 is a real tier, not a missing value.
  ['', 'Recruit / Intern', '0', '4', '0', '0'],
  ['', 'Total Active Troops Owed', '', '33'],
  ['', 'Expenses & Reimbursements'],
  ['', 'Expense', '', 'Amount', 'To', 'Paid', 'Description'],
  ['', 'Embassy rent per month', '', '2250', 'Hafingaar', 'FALSE', '75 x per day rent '],
  ['', 'Potions Reimbursement', '', '3000', 'Aranwe', 'TRUE', 'x22 Extra Magicka Potions'],
  // A correction can be negative.
  ['', 'Promotion wage adjustment', '', '-200', '', 'TRUE', ''],
  // Trailing rows hold a bare unchecked box and no expense — not data.
  ['', '', '', '', '', 'FALSE'],
  ['', '', '', '', '', 'FALSE'],
  ['', 'Troops Wages', '11300', '+', 'Expenses', '9250', '=', 'Total Weekly Expense', '', '20550', 'Current Balance', '39,300', 'Estimated\nBalance', '24,450'],
  [],
  ['', 'We aim to keep a 5000 Septim buffer every week for unforeseen expenses.'],
  [],
  ['', FOOTER],
];

export const stipendsGrid: Grid = [
  [],
  ['', '❖ Imperial Mint Stipend Registry ❖', '', '', '', '', 'Balance for the Week'],
  ['', 'Week', 'Amount Received', 'Amount Spent', 'Balance', '', '45,000'],
  ["", "Mondas, 13th of Sun's Height 4E 226\nSundas, 19th of Sun's Height 4E 226", '25,000', '24,070', '930'],
  ["", "Mondas, 20th of Sun's Height 4E 226\nSundas, 26th of Sun's Height 4E 226", '25,000', '12,295', '12,705', '', "Current week's Stipend + Previous week's Balance"],
  [],
  ['', FOOTER],
];

export const honorGrid: Grid = [
  [],
  ['', '❖ Hall of Honor ❖'],
  [],
  ['', 'First Emissary Indoril Aranwe', 'Honorably retired to Alinor after years of service'],
  ['', 'Lord Malen Sildwen', 'Fell in battle defending his wife against a Dremora'],
  // Padding rows below the entries.
  [],
  [],
  ['', FOOTER],
];

// ── Calendar ──────────────────────────────────────────────────────────────

const AUDIT = '#e7cb74';
const FESTIVAL = '#e3ede8';
const MORNDAS = '#faf0d6';
const ORDINARY = '#eae4d3';

/** Cell shorthand: value, background, note. */
const c = (value: string, background?: string, note?: string): FormattedCell => ({
  value,
  ...(background ? { background } : {}),
  ...(note ? { note } : {}),
});

const blank = (n: number): FormattedCell[] => Array.from({ length: n }, () => c(''));

export const calendarGrid: FormattedGrid = [
  [],
  [c(''), c('❖ Tamrielic Calendar 4E 226 ❖')],
  [],
  // Month titles sit directly above their weekday header.
  [c(''), c('Morning Star'), ...blank(6), c(''), c("Sun's Dawn")],
  [
    c(''), c('Sundas'), c('Morndas'), c('Tirdas'), c('Middas'), c('Turdas'), c('Fredas'), c('Loredas'),
    c(''), c('Sundas'), c('Morndas'), c('Tirdas'), c('Middas'), c('Turdas'), c('Fredas'), c('Loredas'),
  ],
  [
    c(''), c(''), c(''), c(''), c(''),
    c('1', AUDIT, '❖ Annual inventory - every seal verified\nMorning Star 1, 4E 226'),
    c('2', ORDINARY), c('3', ORDINARY),
    c(''),
    c('1', ORDINARY), c('2', MORNDAS), c('3', ORDINARY), c('4', ORDINARY), c('5', ORDINARY), c('6', ORDINARY), c('7', ORDINARY),
  ],
  [
    c(''), c('4', ORDINARY), c('5', MORNDAS), c('6', ORDINARY), c('7', ORDINARY), c('8', ORDINARY), c('9', ORDINARY), c('10', ORDINARY),
    c(''),
    c('8', ORDINARY), c('9', MORNDAS), c('10', ORDINARY), c('11', ORDINARY), c('12', ORDINARY), c('13', ORDINARY), c('14', ORDINARY),
  ],
  [
    c(''), c('11', ORDINARY), c('12', MORNDAS), c('13', ORDINARY), c('14', ORDINARY),
    c('15', FESTIVAL, "South Wind's Prayer\nMorning Star 15, 4E 226\nWatch for unlawful observance."),
    c('16', ORDINARY), c('17', ORDINARY),
    c(''),
    c('15', ORDINARY), c('16', MORNDAS), c('17', ORDINARY), c('18', ORDINARY), c('19', ORDINARY), c('20', ORDINARY), c('21', ORDINARY),
  ],
  // Wholly blank row ends both months.
  [],
  [],
  [c(''), c('Reading the year')],
  [c(''), c('', AUDIT), c('Audit — every seal verified against the ledger')],
  [c(''), c('', FESTIVAL), c('Tamrielic festival — hover the day; watch for unlawful observance')],
  [c(''), c('', MORNDAS), c('Morndas — weekly reconciliation of the ledger')],
  [c(''), c('', ORDINARY), c('Ordinary day')],
];

export const CALENDAR_COLORS = { AUDIT, FESTIVAL, MORNDAS, ORDINARY };

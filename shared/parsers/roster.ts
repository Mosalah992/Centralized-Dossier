// Roster tab. Headers on row 3, members from row 4:
//   A Unit | B Rank | C Name | D Race | E Discord | F Status
//   G Owed ☑ | H Paid ☑ | I Notes | J Last Active | K Total Hours
//
// G, H, J and K are written by the thalmor-quartermaster Worker on Discord
// commands and Monday crons. This site displays them; it must not edit them.

import type { Grid, Member } from '../types';
import { at, isOrnament } from '../text';

export const ROSTER_HEADER_ROW = 3;
export const ROSTER_START_ROW = 4;

const COL = {
  UNIT: 0, RANK: 1, NAME: 2, RACE: 3, DISCORD: 4, STATUS: 5,
  OWED: 6, PAID: 7, NOTES: 8, LAST_ACTIVE: 9, HOURS: 10,
} as const;

/** "@roselord / slimely" -> ["roselord", "slimely"]. Trailing dots are legal. */
export function handleParts(cell: string): string[] {
  return cell
    .split('/')
    .map((p) => p.trim().replace(/^@+/, '').toLowerCase())
    .filter(Boolean);
}

/**
 * Parse the roster from a full A1-origin grid.
 * A row is a member only if it has a Name — blank spacer rows, the ornamental
 * title and the Dominion footer are all dropped.
 */
export function parseRoster(grid: Grid): Member[] {
  const members: Member[] = [];

  for (let r = ROSTER_START_ROW - 1; r < grid.length; r++) {
    const name = at(grid, r, COL.NAME);
    if (!name || isOrnament(name)) continue;

    const hours = Number(at(grid, r, COL.HOURS).replace(/,/g, ''));

    members.push({
      row: r + 1,
      unit: at(grid, r, COL.UNIT),
      rank: at(grid, r, COL.RANK),
      name,
      race: at(grid, r, COL.RACE),
      discord: handleParts(at(grid, r, COL.DISCORD)),
      status: at(grid, r, COL.STATUS).toUpperCase(),
      owed: at(grid, r, COL.OWED).toUpperCase() === 'TRUE',
      paid: at(grid, r, COL.PAID).toUpperCase() === 'TRUE',
      notes: at(grid, r, COL.NOTES),
      lastActive: at(grid, r, COL.LAST_ACTIVE),
      hours: Number.isFinite(hours) ? hours : 0,
    });
  }

  return members;
}

/** Counts by Status, in first-seen order — a cheap header for the volume. */
export function summarize(members: Member[]): { total: number; byStatus: { label: string; count: number }[] } {
  const byStatus = new Map<string, number>();
  for (const m of members) {
    if (!m.status) continue;
    byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1);
  }
  return {
    total: members.length,
    byStatus: [...byStatus.entries()].map(([label, count]) => ({ label, count })),
  };
}

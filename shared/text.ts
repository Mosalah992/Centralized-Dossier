// Cell helpers. Sheet data is untidy — trailing spaces, comma-formatted
// numbers, ornamental title rows — so every parser reads through these rather
// than indexing a grid directly.

import type { Grid } from './types';

/** Trimmed cell at 0-based row/col. Out-of-range reads give `''`, never throw. */
export function at(grid: Grid, row: number, col: number): string {
  const r = grid[row];
  if (!r) return '';
  const v = r[col];
  return v === undefined || v === null ? '' : String(v).trim();
}

/** Whole row as trimmed strings. */
export function rowAt(grid: Grid, row: number): string[] {
  const r = grid[row];
  return r ? r.map((v) => (v === undefined || v === null ? '' : String(v).trim())) : [];
}

/**
 * Number from a cell, tolerating thousands separators and stray currency text.
 * Blank or unparseable gives `null` so callers can tell "0" from "missing".
 */
export function num(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Like `num`, but blank/unparseable becomes 0. */
export function numOr0(value: string): number {
  return num(value) ?? 0;
}

/** Sheet checkbox — the API renders these as the strings TRUE/FALSE. */
export function bool(value: string): boolean {
  return value.toUpperCase() === 'TRUE';
}

/**
 * Ornamental rows: every tab opens with a `❖ Title ❖` (older tabs use `■`) and
 * closes with the Dominion footer. Neither is data.
 */
export function isOrnament(value: string): boolean {
  return /^[❖■✦✧]/.test(value) || /glory of the Third Aldmeri Dominion/i.test(value);
}

/** Strip the ornament characters from a title row. */
export function stripOrnament(value: string): string {
  return value.replace(/[❖■]/g, '').trim();
}

/**
 * 0-based index of the first row whose cell at `col` matches, or -1.
 * Used to anchor blocks on their header row instead of a hard-coded row number,
 * so inserting a row above a table does not break its parser.
 */
export function findRow(
  grid: Grid,
  col: number,
  match: string | RegExp,
  from = 0,
): number {
  const test = (v: string) =>
    typeof match === 'string' ? v.toLowerCase() === match.toLowerCase() : match.test(v);
  for (let r = from; r < grid.length; r++) {
    if (test(at(grid, r, col))) return r;
  }
  return -1;
}

/** Split a multi-line cell into trimmed, non-empty lines. */
export function lines(value: string): string[] {
  return value.split('\n').map((l) => l.trim()).filter(Boolean);
}

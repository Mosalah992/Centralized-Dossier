// Tamrielic Calendar — the only volume whose meaning is not in its values.
//
// The cells hold bare day numbers. What a day *is* comes from its background
// colour, decoded against the legend the sheet prints at the bottom, and what
// happens on it comes from the cell's hover note:
//
//   Witches' Festival
//   Frostfall 13, 4E 226
//   Watch for unlawful observance.
//
// So this parser takes a FormattedGrid (spreadsheets.get?includeGridData=true),
// not the plain values grid the other five use.
//
// Layout: twelve months in a 3 x 4 arrangement. Each block is a month title
// row, a weekday header row (Sundas … Loredas), then up to six week rows. Block
// positions are found by locating every "Sundas" cell rather than hard-coding
// rows and columns, so re-flowing the sheet does not break it.
//
// The legend's four colours are read at runtime, never hard-coded: re-theming
// the calendar in the sheet should re-theme the archive, not break it.

import type {
  CalendarDay,
  CalendarEvent,
  CalendarMonth,
  CalendarYear,
  FormattedCell,
  FormattedGrid,
} from '../types';

export const WEEKDAYS = [
  'Sundas', 'Morndas', 'Tirdas', 'Middas', 'Turdas', 'Fredas', 'Loredas',
] as const;

/** Canonical order of the Tamrielic year, used to index months reliably. */
export const MONTHS: readonly string[] = [
  'Morning Star', "Sun's Dawn", 'First Seed', "Rain's Hand",
  'Second Seed', 'Mid Year', "Sun's Height", 'Last Seed',
  'Heartfire', 'Frostfall', "Sun's Dusk", 'Evening Star',
];

const WHITE = '#ffffff';

function cellAt(grid: FormattedGrid, row: number, col: number): FormattedCell {
  return grid[row]?.[col] ?? { value: '' };
}

const isDayNumber = (value: string) => /^\d{1,2}$/.test(value.trim());

/**
 * The legend rows beneath the grids: an empty swatch cell in column B with a
 * coloured background, and its meaning as text in column C.
 */
function parseLegend(grid: FormattedGrid): { color: string; label: string }[] {
  const legend: { color: string; label: string }[] = [];

  for (let r = 0; r < grid.length; r++) {
    const swatch = cellAt(grid, r, 1);
    const label = cellAt(grid, r, 2).value.trim();

    const isSwatch =
      !swatch.value.trim() &&
      !!swatch.background &&
      swatch.background.toLowerCase() !== WHITE;

    // "Reading the year" sits in column B, so a labelled row is not a swatch.
    if (isSwatch && label && !isDayNumber(label)) {
      legend.push({ color: swatch.background!.toLowerCase(), label });
    }
  }

  return legend;
}

/** Note text -> event. Line 1 is the name, line 2 the in-world date. */
function parseEvent(note: string | undefined): CalendarEvent | null {
  if (!note) return null;
  const parts = note.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!parts.length) return null;

  return {
    // Audit notes are prefixed with the sheet's ❖ ornament.
    name: parts[0]!.replace(/^[❖■]\s*/, '').trim(),
    date: parts[1] ?? '',
    caution: parts.slice(2).join(' '),
  };
}

/** Every (row, col) where a weekday header begins a month block. */
function findBlocks(grid: FormattedGrid): { row: number; col: number }[] {
  const blocks: { row: number; col: number }[] = [];

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (cellAt(grid, r, c).value.trim() === WEEKDAYS[0]) blocks.push({ row: r, col: c });
    }
  }

  return blocks;
}

function readMonth(
  grid: FormattedGrid,
  headerRow: number,
  col: number,
  kindOf: (bg: string | undefined) => string,
): CalendarMonth | null {
  // The month title sits directly above its weekday header.
  const name = cellAt(grid, headerRow - 1, col).value.trim();
  if (!name) return null;

  const weeks: (CalendarDay | null)[][] = [];

  for (let r = headerRow + 1; r < grid.length; r++) {
    const week: (CalendarDay | null)[] = [];
    let filled = 0;

    for (let i = 0; i < WEEKDAYS.length; i++) {
      const cell = cellAt(grid, r, col + i);
      const value = cell.value.trim();

      if (!isDayNumber(value)) {
        week.push(null);
        continue;
      }

      filled++;
      week.push({
        day: Number(value),
        weekday: WEEKDAYS[i]!,
        kind: kindOf(cell.background),
        event: parseEvent(cell.note),
      });
    }

    // A wholly blank row ends the month; a partly blank one is its first or
    // last week and still belongs to it.
    if (filled === 0) break;
    weeks.push(week);
  }

  if (!weeks.length) return null;

  const index = MONTHS.findIndex((m) => m.toLowerCase() === name.toLowerCase());
  return { name, index: index >= 0 ? index + 1 : 0, weeks };
}

export function parseCalendar(grid: FormattedGrid): CalendarYear {
  const legend = parseLegend(grid);
  const byColor = new Map(legend.map((l) => [l.color, l.label]));
  const kindOf = (bg: string | undefined) =>
    (bg ? byColor.get(bg.toLowerCase()) : undefined) ?? '';

  // The ornamented title row, e.g. "❖ Tamrielic Calendar 4E 226 ❖".
  let title = '';
  for (let r = 0; r < Math.min(grid.length, 5) && !title; r++) {
    for (const cell of grid[r] ?? []) {
      const value = cell.value.trim();
      if (/^[❖■]/.test(value)) {
        title = value.replace(/[❖■]/g, '').trim();
        break;
      }
    }
  }

  const months = findBlocks(grid)
    .map((b) => readMonth(grid, b.row, b.col, kindOf))
    .filter((m): m is CalendarMonth => m !== null)
    .sort((a, b) => (a.index || 99) - (b.index || 99));

  return { title, weekdays: [...WEEKDAYS], legend, months };
}

/** Every day carrying a note, in calendar order — the volume's "upcoming" list. */
export function eventsOf(year: CalendarYear): {
  month: string;
  day: number;
  event: CalendarEvent;
  kind: string;
}[] {
  const out: { month: string; day: number; event: CalendarEvent; kind: string }[] = [];

  for (const month of year.months) {
    for (const week of month.weeks) {
      for (const day of week) {
        if (day?.event) {
          out.push({ month: month.name, day: day.day, event: day.event, kind: day.kind });
        }
      }
    }
  }

  return out;
}

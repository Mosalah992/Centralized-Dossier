// A column heading that can be ordered by.
//
// Renders the whole <th>, not just its contents, because `aria-sort` belongs on
// the header cell and splitting the two would leave the view holding half of an
// accessibility contract it did not know it had.
//
// The press is a Fluent Button rather than a bare <button>, for the keyboard
// behaviour and the hover states — but its focus ring is drawn here, by hand,
// and that is worth explaining because the obvious version does not work.
//
// A plain button inside an open volume inherits base.css's :focus-visible ring,
// which is --gold-bright: 1.26:1 against parchment, which is to say invisible.
// The plan was to let Fluent draw its own ring instead, from colorStrokeFocus2,
// which this theme sets to ink at 13.4:1. Measured in the browser, it does not:
// flattening the button into the header cell means dropping its padding and
// border, and the ring Fluent draws is an ::after pseudo-element that needs
// `position: relative` and room to sit in. What actually rendered was no ring at
// all and an outline-color of transparent — worse than the invisible gold one,
// because there was nothing there to make visible.
//
// So the ring is stated outright below. It still takes its colour from the same
// token, so it stays correct if the theme moves.

import { Button, makeStyles, tokens } from '@fluentui/react-components';

import { SortMark } from './marks';
import type { Sort, SortColumn, SortDirection } from '../views/roster-filter';

const useStyles = makeStyles({
  /*
   * The button disappears into the header. Every typographic property is
   * inherited so the tracked capitals in ledger.css's `thead th` rule go on
   * governing the column heading, and Fluent contributes the press, the focus
   * ring and nothing visible.
   */
  press: {
    minWidth: 0,
    maxWidth: '100%',
    height: 'auto',
    padding: 0,
    border: 0,
    columnGap: '0.45em',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    letterSpacing: 'inherit',
    textTransform: 'inherit',
    textAlign: 'inherit',
    color: 'inherit',
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: 'transparent',
      color: tokens.colorNeutralForeground1,
    },
    ':hover:active': {
      backgroundColor: 'transparent',
      color: tokens.colorNeutralForeground1,
    },

    /*
     * The ring, stated rather than inherited from Fluent — see the note at the
     * top of this file for why Fluent's own indicator does not survive a button
     * flattened into a table header.
     *
     * An outline rather than a border or a shadow: it is drawn outside the box,
     * so a focused header does not shift the column by two pixels. The offset
     * keeps it clear of the tracked capitals, which otherwise touch it.
     */
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '3px',
      borderRadius: tokens.borderRadiusSmall,
    },
  },
});

interface SortHeaderProps {
  column: SortColumn;
  label: string;
  /** The table's current order, or null when it is in the register's own. */
  sort: Sort | null;
  onSort: (sort: Sort | null) => void;
  /** Passed through to the <th>, for the numeric and narrow-column rules. */
  className?: string;
}

/**
 * Ascending, then descending, then back to the order it arrived in.
 *
 * The third state is worth its complication here. The roll comes off the sheet
 * in the Embassy's own order — by wing, then by rank — and that is a real
 * ordering someone maintains, not an accident of storage. Without a way back to
 * it, the first click on any column would discard it for the rest of the visit.
 */
const nextSort = (column: SortColumn, sort: Sort | null): Sort | null => {
  if (!sort || sort.column !== column) return { column, direction: 'ascending' };
  if (sort.direction === 'ascending') return { column, direction: 'descending' };
  return null;
};

export function SortHeader({ column, label, sort, onSort, className }: SortHeaderProps) {
  const styles = useStyles();
  const active: SortDirection | null = sort?.column === column ? sort.direction : null;

  return (
    <th scope="col" className={className} aria-sort={active ?? 'none'}>
      <Button
        appearance="transparent"
        className={styles.press}
        iconPosition="after"
        icon={<SortMark direction={active} />}
        onClick={() => onSort(nextSort(column, sort))}
      >
        {label}
      </Button>
    </th>
  );
}

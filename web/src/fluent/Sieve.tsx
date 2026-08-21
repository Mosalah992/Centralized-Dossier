// The sieve: the bar of controls that narrows a register.
//
// Lives in the Fluent layer rather than in the view because of where its styles
// have to be written. Fluent styles with Griffel, and the archive's standing
// convention is that presentation is hand-written CSS — so the compromise is
// that Griffel is allowed here, inside the Fluent layer, and nowhere else.
// Personnel.tsx gets a component to place and no styles to author.
//
// It is written generically over its filters rather than against the roster's
// three, because the ledger and the stipends have the same problem waiting for
// them and the answer should not be copied out again with different nouns.

import {
  Dropdown,
  Field,
  Option,
  SearchBox,
  fieldClassNames,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

import { ChosenMark, PointMark, ScryMark, StrikeMark } from './marks';

export interface SieveFilter {
  /** Stable across renders; used as the React key. */
  id: string;
  /** The control's own label, e.g. "Wing". */
  label: string;
  /** What the unset state is called, e.g. "All wings". */
  all: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const useStyles = makeStyles({
  /*
   * Ruled off above and below rather than boxed. The page is already a stack of
   * framed things — the registers strip, the table frame — and another box
   * between them reads as a third register rather than as the instrument for
   * reading the second.
   */
  sieve: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: '1rem',
    margin: '2rem 0 0.9rem',
    paddingBottom: '1.1rem',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },

  /* The search takes whatever the dropdowns leave, down to a floor at which a
     name is still readable in it. */
  search: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '16rem',
    minWidth: 0,
  },

  filter: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: '11rem',
  },

  /*
   * Every label in the archive is a wide-tracked Roman capital — the section
   * plates, the table headers, the gate's eyebrow. Fluent's Field label is a
   * 14px sentence-case Segoe line, which is the single most obviously imported
   * thing about an untreated Fluent control. Per invariant 5 this is Cinzel and
   * stays Cinzel: a calligraphic face comes apart at this size.
   */
  field: {
    [`& .${fieldClassNames.label}`]: {
      fontFamily: "'Cinzel', 'Trajan Pro', 'EB Garamond', Georgia, serif",
      fontSize: '0.6rem',
      fontWeight: 600,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: tokens.colorNeutralForeground3,
    },
  },

  /*
   * Announced rather than merely displayed. Narrowing a table by typing changes
   * something a sighted reader sees at once and a screen-reader user is told
   * nothing about, so the tally is a live region. Polite, because it changes on
   * every keystroke and should wait its turn.
   */
  tally: {
    width: '100%',
    margin: 0,
    fontFamily: "'Cinzel', 'Trajan Pro', 'EB Garamond', Georgia, serif",
    fontSize: '0.6rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground3,
  },
});

interface SieveProps {
  /** Names what is being searched, e.g. "Search the muster roll". */
  searchLabel: string;
  placeholder: string;
  query: string;
  onQuery: (value: string) => void;
  filters: SieveFilter[];
  /** Rows currently shown, and rows held in total. */
  shown: number;
  total: number;
  /** What the rows are, for the tally line: "names", "entries", "payments". */
  noun: string;
}

export function Sieve({
  searchLabel,
  placeholder,
  query,
  onQuery,
  filters,
  shown,
  total,
  noun,
}: SieveProps) {
  const styles = useStyles();
  const narrowed = shown !== total;

  return (
    <div className={styles.sieve}>
      {/*
        mergeClasses, never a template string. Griffel classes carry a leading
        sequence hash, and joining two of them by hand leaves two competing
        sequences that the runtime cannot reconcile — one side is silently
        dropped. It shipped that way once: the labels below came out as Fluent's
        sentence-case Segoe line while every other label on the page was tracked
        Cinzel, and nothing errored to say so.
      */}
      <Field label={searchLabel} className={mergeClasses(styles.search, styles.field)}>
        <SearchBox
          value={query}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(_, data) => onQuery(data.value)}
          // Fluent would reach for its own magnifier and its own ×. Both are
          // replaced; see marks.tsx for why none of its icons ship.
          contentBefore={<ScryMark />}
          dismiss={<StrikeMark size="0.85em" />}
        />
      </Field>

      {filters.map((filter) => (
        <Field
          key={filter.id}
          label={filter.label}
          className={mergeClasses(styles.filter, styles.field)}
        >
          <Dropdown
            value={
              filter.options.find((o) => o.value === filter.value)?.label ?? filter.all
            }
            selectedOptions={[filter.value]}
            onOptionSelect={(_, data) => filter.onChange(data.optionValue ?? '')}
            expandIcon={<PointMark />}
            // Fluent renders a clear button even when `clearable` is unset —
            // hidden, but present in the markup with its own icon in it. The
            // unset state is the first option here, so there is nothing for it
            // to do; dropped rather than left lying in the DOM.
            clearButton={null}
          >
            {/* The unset state is an option rather than a clear button, so
                putting a filter back is the same gesture as setting it. */}
            <Option value="" checkIcon={<ChosenMark />}>
              {filter.all}
            </Option>
            {filter.options.map((option) => (
              <Option key={option.value} value={option.value} checkIcon={<ChosenMark />}>
                {option.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      ))}

      <p className={styles.tally} role="status" aria-live="polite">
        {narrowed ? `${shown} of ${total} ${noun}` : `${total} ${noun}`}
      </p>
    </div>
  );
}

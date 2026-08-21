// The Embassy's own marks, for the slots Fluent would otherwise fill with its.
//
// Fluent ships @fluentui/react-icons and reaches for it by default: a rounded
// magnifier in the search box, a rounded chevron on the dropdown, a rounded ×
// on anything dismissible. Those are Microsoft 365's hand. Set beside Cinzel
// capitals on a ruled parchment page they are the one thing in the room that
// was drawn by someone else, and no amount of theming hides a curve.
//
// So every icon slot the pilot touches is passed one of these instead. They are
// drawn in the geometry base.css opens by describing — thin inlay and sharp
// vertical forms, Altmer rather than Nord — and they take `currentColor`, so
// they inherit whatever Fluent's tokens have decided the control's foreground
// is and follow it through hover, focus and disabled without being told.
//
// Sized in `em`, so a mark is always the size of the text it sits beside.
//
// All of them are aria-hidden. Every control that carries one also carries a
// real label; a mark that announced itself would be read out twice.

interface MarkProps {
  /** Overrides the 1em default where a mark needs to sit smaller than its text. */
  size?: string;
}

const base = (size = '1em') => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none' as const,
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  focusable: false,
});

/**
 * The scrying glass, for the search box.
 *
 * Deliberately handle-less. The archive already draws this instrument in
 * chronicle.css — a thin ring with an iris that breathes inside it — and giving
 * it the stub handle a magnifier icon usually has would make it a different
 * object from the one the informants volume shows. The searchable control is
 * labelled in words either way, so the mark does not have to carry the meaning
 * on its own.
 */
export const ScryMark = ({ size }: MarkProps = {}) => (
  <svg {...base(size)}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1" opacity="0.75" />
    <circle cx="8" cy="8" r="1.9" fill="currentColor" />
  </svg>
);

/**
 * Struck through: the mark for clearing a field or dismissing a notice.
 *
 * Two straight strokes rather than a rounded ×, because everything else the
 * archive draws at this size is straight — the rules between sections, the
 * inlay on the covers, the spine bands.
 */
export const StrikeMark = ({ size }: MarkProps = {}) => (
  <svg {...base(size)}>
    <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

/**
 * The dropdown's mark: a solid pointing lozenge, not a chevron.
 *
 * A chevron is a curve interrupted; this is the printer's mark the section
 * plates already use, turned to point at the list it opens.
 */
export const PointMark = ({ size = '0.62em' }: MarkProps = {}) => (
  <svg {...base(size)}>
    <path d="M8 12 L1.5 4 L14.5 4 Z" fill="currentColor" />
  </svg>
);

/**
 * Set against the option a filter is currently on.
 *
 * A lozenge rather than a checkmark. A tick is a clerk's mark on a form; the
 * archive marks a chosen thing the way its section rules do, with a small
 * filled diamond. It is also the one glyph here that is never the only signal —
 * Fluent sets `aria-selected` and a background on the same row.
 */
export const ChosenMark = ({ size = '0.5em' }: MarkProps = {}) => (
  <svg {...base(size)}>
    <path d="M8 1 L15 8 L8 15 L1 8 Z" fill="currentColor" />
  </svg>
);

/**
 * Which way a column is ordered. Drawn as the same lozenge as the dropdown's,
 * turned — so a reader who has learned one has learned the other.
 *
 * `direction` of null is the resting state: both marks at low opacity, so a
 * sortable column looks sortable before it is touched rather than only after.
 * That was the alternative — showing nothing until clicked — and it left every
 * header looking inert.
 */
export const SortMark = (
  { direction, size }: { direction: 'ascending' | 'descending' | null } & MarkProps,
) => (
  <svg {...base(size ?? '0.62em')}>
    <path
      d="M8 1.5 L14 8 L2 8 Z"
      fill="currentColor"
      opacity={direction === 'ascending' ? 1 : 0.22}
    />
    <path
      d="M8 14.5 L2 8 L14 8 Z"
      fill="currentColor"
      opacity={direction === 'descending' ? 1 : 0.22}
    />
  </svg>
);

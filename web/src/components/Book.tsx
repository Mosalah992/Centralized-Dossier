// One volume on the shelf. An anchor, so it is a real link — middle-click,
// open-in-new-tab and the keyboard all behave as expected — with navigation
// intercepted for the in-app transition.
//
// The cover is painted art, but its title is not: the lettering was taken off
// every cover by scripts/prepare-volumes.mjs, which leaves a cleared panel in
// the binding, and the name is set live over that panel here. Titles come from
// shared/volumes.ts and subtitles from the BINDINGS table, which is the point
// of the arrangement — a volume renamed there is renamed on the shelf, where
// before it needed the cover repainting. The eighth volume stood on the shelf
// reading TOP SECRET for as long as it did because nobody was going to repaint
// a book to change a name.
//
// The name is therefore real text, and it is the ONLY place the name is given:
// the img is alt="" and the anchor carries no aria-label, so the link's
// accessible name comes from the title and subtitle a sighted reader is
// looking at. The aria-label it used to carry would now say everything twice.

import type { VolumeSlug } from '../../../shared/types';
import { hrefFor } from '../router';
import { bindingVars } from '../theme';
import { COVERS, COVER_H, COVER_W, LABELS } from '../covers';

interface Props {
  slug: VolumeSlug;
  title: string;
  subtitle: string;
  /** The live tab this volume is bound to; null when it has gone missing. */
  tab: string | null;
  onOpen: (href: string) => void;
}

export function Book({ slug, title, subtitle, tab, onOpen }: Props) {
  const href = hrefFor(slug);
  const missing = tab === null;
  const panel = LABELS[slug];

  return (
    <a
      className="book"
      href={href}
      style={bindingVars(slug)}
      aria-disabled={missing || undefined}
      onClick={(event) => {
        // Let the browser handle new-tab and modified clicks.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        if (!missing) onOpen(href);
      }}
    >
      <span className="book__body">
        <img
          className="book__cover"
          src={COVERS[slug]}
          alt=""
          width={COVER_W}
          height={COVER_H}
          decoding="async"
          draggable={false}
        />
        <span
          className="book__label"
          style={{
            left: `${panel.left * 100}%`,
            top: `${panel.top * 100}%`,
            width: `${panel.width * 100}%`,
            height: `${panel.height * 100}%`,
            // The type is sized off the panel it sits in, not off the book:
            // the plaque on History of the Realm is little more than half the
            // height of the sealed volume's field, and one size set for the
            // whole shelf would either overrun the plaque or leave the sealed
            // volume's panel nearly empty.
            //
            // Both dimensions, because the two lines are held by different
            // ones — the title by the height, taking two lines on every
            // volume, and the subtitle by the width, being one long line of
            // tracked capitals. Given in the book's own width so the whole
            // arrangement holds at every breakpoint; see the container on
            // .book.
            '--label-height': `${panel.height * (COVER_H / COVER_W) * 100}cqw`,
            '--label-width': `${panel.width * 100}cqw`,
          } as React.CSSProperties}
        >
          <span className="book__title">{title}</span>
          <span className="book__subtitle">{subtitle}</span>
        </span>
        {missing && <span className="book__withdrawn">Volume withdrawn</span>}
      </span>
    </a>
  );
}

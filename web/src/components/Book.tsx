// One volume on the shelf. An anchor, so it is a real link — middle-click,
// open-in-new-tab and the keyboard all behave as expected — with navigation
// intercepted for the in-app transition.
//
// The cover is painted art, title and all. Nothing is drawn over it: the
// anchor's aria-label carries the name for anyone who cannot see the image, and
// the img is alt="" so the two do not announce the volume twice.

import type { VolumeSlug } from '../../../shared/types';
import { hrefFor } from '../router';
import { bindingVars } from '../theme';
import { COVERS, COVER_H, COVER_W } from '../covers';

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

  // The subtitle is painted on the cover, so it is read out too rather than
  // being something only sighted readers get.
  const label = missing
    ? `${title} — not currently in the archive`
    : `Open the ${title} — ${subtitle}`;

  return (
    <a
      className="book"
      href={href}
      style={bindingVars(slug)}
      aria-label={label}
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
        {missing && <span className="book__withdrawn">Volume withdrawn</span>}
      </span>
    </a>
  );
}

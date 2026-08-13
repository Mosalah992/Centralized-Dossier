// One volume on the shelf. An anchor, so it is a real link — middle-click,
// open-in-new-tab and the keyboard all behave as expected — with navigation
// intercepted for the in-app transition.

import type { VolumeSlug } from '../../../shared/types';
import { hrefFor } from '../router';
import { bindingVars } from '../theme';
import { Insignia } from './Insignia';

interface Props {
  slug: VolumeSlug;
  title: string;
  /** The live tab this volume is bound to; null when it has gone missing. */
  tab: string | null;
  onOpen: (href: string) => void;
}

export function Book({ slug, title, tab, onOpen }: Props) {
  const href = hrefFor(slug);
  const missing = tab === null;

  const label = missing
    ? `${title} — not currently in the archive`
    : `Open the ${title}`;

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
        <span className="book__pages" />
        <span className="book__spine" />
        <span className="book__cover">
          <Insignia slug={slug} className="book__insignia" />
          <span className="book__title">{title}</span>
          {missing
            ? <span className="book__missing">Volume withdrawn</span>
            : <span className="book__stamp">Embassy Register</span>}
        </span>
      </span>
    </a>
  );
}

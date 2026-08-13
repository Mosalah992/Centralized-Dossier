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
  subtitle: string;
  /** The live tab this volume is bound to; null when it has gone missing. */
  tab: string | null;
  onOpen: (href: string) => void;
}

export function Book({ slug, title, subtitle, tab, onOpen }: Props) {
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
        <span className="book__shadow" />
        <span className="book__pages" />
        <span className="book__spine" />
        <span className="book__cover">
          <span className="book__corner book__corner--tl" />
          <span className="book__corner book__corner--tr" />
          <span className="book__corner book__corner--bl" />
          <span className="book__corner book__corner--br" />
          <Insignia slug={slug} className="book__insignia" />
          <span className="book__title">{title}</span>
          <span className="book__subtitle">{subtitle}</span>
          {missing
            ? <span className="book__missing">Volume withdrawn</span>
            : <span className="book__stamp">Embassy Register</span>}
          <span className="book__strap book__strap--top" />
          <span className="book__strap book__strap--bottom" />
        </span>
      </span>
    </a>
  );
}

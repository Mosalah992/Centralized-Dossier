// One volume on the shelf. An anchor, so it is a real link — middle-click,
// open-in-new-tab and the keyboard all behave as expected — with navigation
// intercepted for the in-app transition.
//
// The cover is painted art, title and all. The volumes are named as their
// covers are lettered (shared/volumes.ts), so renaming one now means new art —
// the price of lettering drawn as part of the binding rather than set over it.
//
// The name stays real text through the anchor's aria-label, which also keeps
// the unfolding docket's three text nodes from being announced as one
// unpunctuated run.

import type { VolumeSlug } from '../../../shared/types';
import { hrefFor } from '../router';
import { bindingVars } from '../theme';
import { COVERS, COVER_H, COVER_W } from '../covers';

interface Props {
  slug: VolumeSlug;
  title: string;
  subtitle: string;
  category: string;
  /** The live tab this volume is bound to; null when it has gone missing. */
  tab: string | null;
  onOpen: (href: string) => void;
}

export function Book({ slug, title, subtitle, category, tab, onOpen }: Props) {
  const href = hrefFor(slug);
  const missing = tab === null;
  const custody = slug === 'informants'
    ? 'Word-sealed volume'
    : slug === 'enforcement'
      ? 'Embassy-held record'
      : 'Archive register';

  return (
    <a
      className="book"
      href={href}
      style={bindingVars(slug)}
      aria-disabled={missing || undefined}
      aria-label={`${title}. ${subtitle}. ${category}. ${missing ? 'Volume withdrawn' : `${custody}. Open complete record`}.`}
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
        {!missing && (
          <span className="book__dossier" aria-hidden="true">
            <span className="book__dossier-class">{custody}</span>
            <span className="book__dossier-category">{category}</span>
            <span className="book__dossier-action">Open complete record <span>→</span></span>
          </span>
        )}
      </span>
    </a>
  );
}

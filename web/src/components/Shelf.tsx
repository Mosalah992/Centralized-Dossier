// The archive index. The cabinet is the primary object on this page; the
// heading stays ceremonial but compact so the six physical volumes dominate.

import { useShelf } from '../api';
import { SHELF, isKept } from '../../../shared/volumes';
import { BINDINGS } from '../theme';
import { Book } from './Book';
import { Notice } from './Notice';

interface Props {
  onOpen: (href: string) => void;
}

export function Shelf({ onOpen }: Props) {
  const shelf = useShelf();

  // Which tab each volume is bound to, once the archivist has answered.
  const tabs = new Map<string, string | null>(
    shelf.state === 'ready' ? shelf.value.volumes.map((v) => [v.slug, v.tab]) : [],
  );

  return (
    <div className="hall">
      <span className="hall__candle hall__candle--left" aria-hidden />
      <span className="hall__candle hall__candle--right" aria-hidden />
      <span className="hall__dust" aria-hidden />

      <header className="hall__head">
        {/* The Dominion insignia. Decorative — the heading beneath it already
            names the archive, so it is not announced a second time. Served
            from public/ as ledger.css serves the same file for its watermark. */}
        <img className="hall__seal" src="/seal.webp" alt="" width={250} height={250} decoding="async" />
        <h1 className="hall__title">
          Thalmor Embassy
          <br />
          Archives
        </h1>
        <p className="hall__subtitle">Official Administrative Registers</p>
      </header>

      {shelf.state === 'error' && (
        <Notice
          kind="error"
          title="The archive cannot be reached"
          body={shelf.message}
        />
      )}

      {shelf.state === 'ready' && !shelf.value.reachable && (
        <Notice
          kind="error"
          title="The registers are sealed"
          body="The archivist cannot reach the master ledger. The volumes below are listed but cannot be opened."
        />
      )}

      <section className="archive-cabinet" aria-label="Archive cabinet">
        <div className="archive-cabinet__cap">
          <span className="archive-cabinet__title">Archive Cabinet</span>
        </div>
        <div className="archive-cabinet__interior">
          {SHELF.map((section) => (
            <section
              className={`section section--${section.category.toLowerCase().replace(/\W+/g, '-')}`}
              key={section.category}
            >
              <h2 className="section__plate">
                <span className="section__name">{section.category}</span>
              </h2>
              <div className="shelf">
                {section.volumes.map((volume) => (
                  <Book
                    key={volume.slug}
                    slug={volume.slug}
                    title={volume.title}
                    subtitle={BINDINGS[volume.slug].subtitle}
                    tab={
                      // A kept volume is written here, not read from the sheet,
                      // so nothing the archivist says can withdraw it.
                      isKept(volume.slug)
                        ? volume.title
                        // Treat an unanswered shelf as present; a volume is only
                        // shown withdrawn once the archivist has actually said so.
                        : shelf.state === 'ready'
                          ? tabs.get(volume.slug) ?? null
                          : volume.title
                    }
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="archive-cabinet__base" aria-hidden />
      </section>

    </div>
  );
}

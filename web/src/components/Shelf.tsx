// The archive index. The cabinet is the primary object on this page; the
// heading stays ceremonial but compact so the six physical volumes dominate.

import { useShelf } from '../api';
import { SHELF } from '../../../shared/volumes';
import { BINDINGS, MASTER_LEDGER_URL } from '../theme';
import { Book } from './Book';
import { Seal } from './Insignia';
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
        <Seal className="hall__seal" />
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
            <section className="section" key={section.category}>
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
                    // Treat an unanswered shelf as present; a volume is only shown
                    // withdrawn once the archivist has actually said so.
                    tab={shelf.state === 'ready' ? tabs.get(volume.slug) ?? null : volume.title}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="archive-cabinet__base" aria-hidden />
      </section>

      <a
        className="seal"
        href={MASTER_LEDGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open the master ledger, the source record behind this archive"
      >
        <span className="seal__wax">
          <Seal size={40} />
        </span>
        <span className="seal__label">Master Archive</span>
        <span className="seal__hint">The source record, maintained under archival authority.</span>
      </a>
    </div>
  );
}

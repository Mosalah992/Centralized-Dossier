// The archive index. The shelf is the object on this page; the heading is kept
// small on purpose so the volumes carry it.

import { useShelf } from '../api';
import { SHELF } from '../../../shared/volumes';
import { MASTER_LEDGER_URL } from '../theme';
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
      <header className="hall__head">
        <Seal className="hall__seal" />
        <h1 className="hall__title">
          Thalmor Embassy
          <br />
          Archives
        </h1>
        <p className="hall__subtitle">Administrative Registers</p>
        <div className="rule hall__rule">
          <span className="rule__mark">❖</span>
        </div>
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
                // Treat an unanswered shelf as present; a volume is only shown
                // withdrawn once the archivist has actually said so.
                tab={shelf.state === 'ready' ? tabs.get(volume.slug) ?? null : volume.title}
                onOpen={onOpen}
              />
            ))}
          </div>
        </section>
      ))}

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
        <span className="seal__label">Master Ledger</span>
        <span className="seal__hint">The source record, in the archivist's own hand</span>
      </a>
    </div>
  );
}

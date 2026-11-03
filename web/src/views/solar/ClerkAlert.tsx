// The Solar's word that something new waits at the Clerk Table: a parchment
// slip pinned to the top of the screen, naming the newest filing, with a way
// to the table and a way to put it aside. It shows again only when something
// newer is filed (clerk-seen.ts), and a screen reader hears it as it appears.

import { filingName, type ClerkFiling } from '../../../../shared/filing';
import { Stamp } from '../../room/takeovers/Stamp';
import '../../styles/clerk.css';

export function ClerkAlert({ fresh, onOpen, onLater }: { fresh: readonly ClerkFiling[]; onOpen: () => void; onLater: () => void }) {
  const newest = fresh[0];
  if (!newest) return null;
  const more = fresh.length - 1;
  return (
    <div className="clerk-alert" role="status">
      <span className="clerk-alert__seal" aria-hidden="true">
        <Stamp mark="aldmeri" size={44} />
      </span>
      <div className="clerk-alert__words">
        <p className="clerk-alert__head">{fresh.length === 1 ? 'A new filing awaits the stamp' : `${fresh.length} new filings await the stamp`}</p>
        <p className="clerk-alert__what">
          {filingName(newest.parchment.filing)} · No. {newest.id}: <span className="clerk-alert__title">{newest.title}</span>
          {more > 0 && <span className="clerk-alert__more"> and {more === 1 ? 'one more' : `${more} more`}</span>}
        </p>
      </div>
      <div className="clerk-alert__actions">
        <button type="button" className="px-btn" onClick={onOpen}>
          Open the Clerk Table
        </button>
        <button type="button" className="px-btn px-btn--quiet" onClick={onLater}>
          Later
        </button>
      </div>
    </div>
  );
}

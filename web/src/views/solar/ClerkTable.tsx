// The Clerk Table's work: the filings waiting for High Command's stamp, each
// read as its parchment (drawn here, web/src/scribe/Parchment.tsx) and stamped
// Approved (the Dominion's gold seal) or Denied. The parchment is drawn again
// with the stamp on it, and the Embassy's bot posts the verdict to the
// filing's channel (functions/api/solar/clerk).
//
// Applications to the Thalmor and Public Requests wait here, and any report
// that summoned High Command (Strategic or Cataclysm) until it is seen. Until
// the Scribe is consecrated the table says so, as it did when it was only
// furnished.

import { useEffect, useRef, useState } from 'react';

import { IMPORTANCE_INFO, filingName, type ClerkFiling, type StampMark } from '../../../../shared/filing';
import { Fleuron } from '../../room/art';
import { Stamp } from '../../room/takeovers/Stamp';
import { Parchment } from '../../scribe/Parchment';
import type { Clerk } from './useClerk';
import '../../styles/clerk.css';

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The table's list comes from the Solar (useClerk), which also counts it on the plaque and announces what is new. */
export function ClerkTable({ clerk }: { clerk: Clerk }) {
  const { table } = clerk;
  const [reading, setReading] = useState<ClerkFiling | null>(null);
  const [notice, setNotice] = useState('');

  const stamp = async (filing: ClerkFiling, mark: StampMark) => {
    setNotice('');
    const answer = await clerk.stamp(filing, mark);
    if (answer.ok) setReading(answer.filing);
    else setNotice(answer.error);
  };

  // Both answers sit in the card the Clerk Table's furniture opens (views/Solar.tsx).
  if (table === 'loading' || table === 'absent') {
    return (
      <div className="clerk">
        <Fleuron />
        <h3>The stamps await their consecration</h3>
        <p>
          Filings will be stamped here once the Scribe Table opens: <strong>Approved</strong> under the Dominion’s gold
          seal, or <strong>Denied</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="clerk">
      <Fleuron />
      <h3>Awaiting the stamp</h3>
      {notice && (
        <p className="clerk__notice" role="alert">
          {notice}
        </p>
      )}
      {table.waiting.length === 0 ? (
        <p className="solar-card__wait">Nothing waits on the table.</p>
      ) : (
        <ul className="clerk__list">
          {table.waiting.map((f) => (
            <li key={f.id}>
              <button type="button" className="clerk__item" onClick={() => setReading(f)}>
                <span className="clerk__kind" data-level={f.importance}>
                  {filingName(f.parchment.filing)} · No. {f.id}
                  {f.importance === 'strategic' || f.importance === 'cataclysm' ? ` · ${IMPORTANCE_INFO[f.importance].name}` : ''}
                </span>
                <span className="clerk__title">{f.title}</span>
                <span className="clerk__by">
                  {f.signed} · {when(f.filedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {table.stamped.length > 0 && (
        <details className="clerk__stamped">
          <summary>Lately stamped</summary>
          <ul className="clerk__list">
            {table.stamped.map((f) => (
              <li key={f.id}>
                <button type="button" className="clerk__item" onClick={() => setReading(f)}>
                  <span className="clerk__kind">
                    {filingName(f.parchment.filing)} · No. {f.id} · {f.stamp === 'denied' ? 'Denied' : 'Approved'}
                  </span>
                  <span className="clerk__title">{f.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {reading && <Reading filing={reading} onStamp={stamp} onClose={() => setReading(null)} />}
    </div>
  );
}

/** One filing laid open: its parchment, and the two stamps. A native dialog, so focus and Esc are the browser's. */
function Reading({ filing, onStamp, onClose }: { filing: ClerkFiling; onStamp: (f: ClerkFiling, mark: StampMark) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    return () => el?.close();
  }, []);

  const press = async (mark: StampMark) => {
    setBusy(true);
    await onStamp(filing, mark);
    setBusy(false);
  };

  return (
    <dialog ref={dialog} className="clerk-reading" aria-labelledby="clerk-reading-title" onClose={onClose}>
      <header className="clerk-reading__bar">
        <h2 id="clerk-reading-title">
          {filingName(filing.parchment.filing)} · Entry No. {filing.id}
        </h2>
        <button type="button" className="btn btn--quiet" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </header>
      <div className="clerk-reading__sheet">
        <Parchment request={filing.parchment} />
      </div>
      <footer className="clerk-reading__bar">
        {filing.stamp ? (
          <p className="clerk-reading__verdict">
            <Stamp mark={filing.stamp === 'denied' ? 'denied' : 'aldmeri'} size={40} />
            {filing.stamp === 'denied' ? 'Denied' : 'Approved'} by High Command, Filed in the Archives.
          </p>
        ) : (
          <>
            <button type="button" className="btn btn--quiet" disabled={busy} onClick={() => void press('denied')}>
              <Stamp mark="denied" size={26} /> Deny
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void press('approved')}>
              <Stamp mark="aldmeri" size={26} /> Approve
            </button>
          </>
        )}
      </footer>
    </dialog>
  );
}

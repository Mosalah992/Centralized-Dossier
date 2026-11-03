// /filings/:id, the page the Embassy's bot links each post to: one filing,
// drawn as its parchment in the reader's browser. Who may read it follows
// where it was filed (functions/api/filings/[id].ts): a Bulletin Post anyone,
// a report the Cabinet's readers or High Command, an Application or a Public
// Request High Command. Anything else is answered as if it did not exist.

import { useEffect, useState } from 'react';

import { CATEGORY_INFO, destinationLabel, type FilingView as Filed } from '../../../shared/filing';
import { Consulting, Notice } from '../components/Notice';
import type { Navigate } from '../router';
import { Parchment } from '../scribe/Parchment';

type State = 'loading' | 'sealed' | 'unreachable' | Filed;

function where(filed: Filed): string {
  const { filing, stamp } = filed.parchment;
  const filedOn = new Date(filed.filedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const verdict = stamp ? ` · ${stamp.mark === 'denied' ? 'Denied' : 'Approved'} by High Command` : '';
  return `${destinationLabel(filing)} · Filed ${filedOn}${verdict}`;
}

export function FilingView({ id, navigate }: { id: number; navigate: Navigate }) {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let live = true;
    setState('loading');
    void (async () => {
      try {
        const res = await fetch(`/api/filings/${id}`, { headers: { Accept: 'application/json' } });
        const json = (res.headers.get('content-type') ?? '').includes('application/json');
        const next: State = res.status === 404 ? 'sealed' : res.ok && json ? ((await res.json()) as Filed) : 'unreachable';
        if (live) setState(next);
      } catch {
        if (live) setState('unreachable');
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  return (
    <div className="filing-view">
      <button className="volume__back" type="button" onClick={() => navigate('/')}>
        Return to the Embassy
      </button>
      {state === 'loading' && <Consulting />}
      {state === 'sealed' && (
        <Notice
          kind="error"
          title={`Entry No. ${id} is sealed`}
          body="Either no filing is entered under that number, or it is kept from this reader. Reports are read in the Cabinet; Applications and Public Requests by High Command, in the Solar."
        />
      )}
      {state === 'unreachable' && <Notice kind="error" title="The archive cannot be reached" body="Try again in a moment." />}
      {typeof state === 'object' && (
        <>
          <header className="filing-view__head">
            <h1>
              {CATEGORY_INFO[state.parchment.filing.category].name} · Entry No. {state.id}
            </h1>
            <p>{where(state)}</p>
          </header>
          <div className="filing-view__sheet">
            <Parchment request={state.parchment} />
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';

import { useRoute } from './router';
import { getVolume } from '../../shared/volumes';
import { bindingVars } from './theme';
import { GATE_SEALED_EVENT } from './api';
import { Ambience } from './components/Ambience';
import { Gate } from './components/Gate';
import { Shelf } from './components/Shelf';
import { Notice } from './components/Notice';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RosterView, StatisticsView } from './views/Personnel';
import { LedgerView, StipendsView } from './views/Finance';
import { CalendarView, HonorView } from './views/Honors';
import type { VolumeSlug } from '../../shared/types';

const VIEWS: Record<VolumeSlug, () => JSX.Element> = {
  roster: RosterView,
  statistics: StatisticsView,
  ledger: LedgerView,
  stipends: StipendsView,
  honor: HonorView,
  calendar: CalendarView,
};

export default function App() {
  const [route, navigate] = useRoute();

  // Whether this browser holds a valid writ. Null until /api/gate answers,
  // so the gate does not flash for members who are already through.
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/gate')
      .then((res) => res.json() as Promise<{ open?: boolean }>)
      .then((body) => setOpen(Boolean(body.open)))
      .catch(() => setOpen(false));
  }, []);

  // A 401 from any volume mid-session (expired or rotated writ) reseals.
  useEffect(() => {
    const reseal = () => setOpen(false);
    window.addEventListener(GATE_SEALED_EVENT, reseal);
    return () => window.removeEventListener(GATE_SEALED_EVENT, reseal);
  }, []);

  // The tab title should say which volume is open.
  useEffect(() => {
    const name = route.name === 'volume' ? getVolume(route.slug)?.title : null;
    document.title = name
      ? `${name} - Thalmor Embassy Archives`
      : 'Thalmor Embassy Archives';
  }, [route]);

  // Ambience holds the same slot in every state — waiting on the gate, sealed,
  // and open. If it changed position React would remount it, and the track
  // would be cut off the moment the seal breaks.
  return (
    <>
      <Ambience />

      {open === null ? null : !open ? (
        <Gate onOpen={() => setOpen(true)} />
      ) : (
        <div className="shell">
          <main>
            {route.name === 'shelf' && <Shelf onOpen={navigate} />}

            {route.name === 'volume' && (
              <div className={`volume volume--${route.slug}`} style={bindingVars(route.slug)}>
                <button className="volume__back" type="button" onClick={() => navigate('/')}>
                  Return to the cabinet
                </button>
                {/* Remounting per slug restarts the page-opening animation and
                    discards the previous volume's state. The boundary keeps a
                    failure inside the volume instead of blanking the archive. */}
                <ErrorBoundary resetKey={route.slug}>
                  {(() => {
                    const View = VIEWS[route.slug];
                    return <View key={route.slug} />;
                  })()}
                </ErrorBoundary>
              </div>
            )}

            {route.name === 'missing' && (
              <>
                <Notice
                  kind="error"
                  title="No such volume"
                  body="The archive holds no register under that name."
                />
                <p style={{ textAlign: 'center' }}>
                  <button className="volume__back" type="button" onClick={() => navigate('/')}>
                    Return to the cabinet
                  </button>
                </p>
              </>
            )}
          </main>

          <footer className="site-footer">
            <p className="site-footer__creed">For the Glory of the Third Aldmeri Dominion</p>
            <p className="site-footer__warning">
              Unauthorised perusal is a matter for the Justiciars.
            </p>
          </footer>
        </div>
      )}
    </>
  );
}

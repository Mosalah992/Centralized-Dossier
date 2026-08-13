import { useEffect } from 'react';

import { useRoute } from './router';
import { getVolume } from '../../shared/volumes';
import { bindingVars } from './theme';
import { Shelf } from './components/Shelf';
import { Notice } from './components/Notice';
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

  // The tab title should say which volume is open.
  useEffect(() => {
    const name = route.name === 'volume' ? getVolume(route.slug)?.title : null;
    document.title = name
      ? `${name} - Thalmor Embassy Archives`
      : 'Thalmor Embassy Archives';
  }, [route]);

  return (
    <div className="shell">
      <main>
        {route.name === 'shelf' && <Shelf onOpen={navigate} />}

        {route.name === 'volume' && (
          <div className={`volume volume--${route.slug}`} style={bindingVars(route.slug)}>
            <button className="volume__back" type="button" onClick={() => navigate('/')}>
              Return to the cabinet
            </button>
            {/* Remounting per slug restarts the page-opening animation and
                discards the previous volume's state. */}
            {(() => {
              const View = VIEWS[route.slug];
              return <View key={route.slug} />;
            })()}
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
  );
}

import { Suspense, lazy, useEffect, useState } from 'react';

import { useRoute } from './router';
import { getTitle } from '../../shared/volumes';
import { bindingVars } from './theme';
import { GATE_SEALED_EVENT, RESEAL_GRACE_MS } from './api';
import { Ambience } from './components/Ambience';
import { Gate } from './components/Gate';
import { Shelf } from './components/Shelf';
import { Consulting, Notice } from './components/Notice';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { VolumeSlug } from '../../shared/types';

/*
 * Volumes load on demand. Everything below was previously in the first bundle,
 * which meant a reader stopped at the gate downloaded all seven registers'
 * code — including the chronicle, which is 24KB of prose before minification —
 * to render a passphrase box they might not answer.
 *
 * Views are named exports, so each import is mapped to a default: React.lazy
 * takes a module whose `default` is the component, and re-exporting here keeps
 * the views themselves free of a default export they have no other use for.
 */
const RosterView = lazy(() => import('./views/Personnel').then((m) => ({ default: m.RosterView })));
const PrecedenceView = lazy(() => import('./views/Precedence').then((m) => ({ default: m.PrecedenceView })));
const LedgerView = lazy(() => import('./views/Finance').then((m) => ({ default: m.LedgerView })));
const StipendsView = lazy(() => import('./views/Finance').then((m) => ({ default: m.StipendsView })));
const HonorView = lazy(() => import('./views/Honors').then((m) => ({ default: m.HonorView })));
const CalendarView = lazy(() => import('./views/Honors').then((m) => ({ default: m.CalendarView })));
const HistoryView = lazy(() => import('./views/History').then((m) => ({ default: m.HistoryView })));
const InformantsView = lazy(() => import('./views/Informants').then((m) => ({ default: m.InformantsView })));

/*
 * Fluent's provider, and it is lazy for the same reason the views are — only
 * more so.
 *
 * THIS IMPORT MUST STAY LAZY. Fluent is the heaviest thing in the project, and
 * a static import here would put it in the index chunk, which is the chunk a
 * reader stopped at the gate downloads to render a seal they may never press.
 * Rendered where it is below — inside the volume branch, inside the Suspense
 * boundary the view was already waiting in — it costs the gate nothing and the
 * shelf nothing, and arrives with the first volume anyone opens.
 */
const FluentShell = lazy(() =>
  import('./fluent/Shell').then((m) => ({ default: m.FluentShell })),
);

const VIEWS: Record<VolumeSlug, React.ComponentType> = {
  roster: RosterView,
  statistics: PrecedenceView,
  ledger: LedgerView,
  stipends: StipendsView,
  honor: HonorView,
  calendar: CalendarView,
  history: HistoryView,
  informants: InformantsView,
};

interface Track {
  url: string;
  title: string;
  /**
   * Performer credited in the footer. A track with no `by` is simply announced
   * — the sealed volume's tone is Embassy property rather than a bard's turn,
   * and crediting a performer under it would be a small lie in the furniture.
   */
  by?: string;
}

/*
 * Served from public/ by URL rather than imported, so the tracks stay out of
 * the build graph: Vite was hashing and re-emitting 4.3MB of audio on every
 * build, and a byte of it never changes. As plain files they are also
 * independently cacheable and can be re-encoded without a rebuild.
 *
 * The cost of leaving the pipeline is the hash, so these are cache-busted by
 * hand: bump the query when a track is replaced, or readers keep the old one.
 */
const MUSIC = '/music';

/** The room tone of the archive itself, and of the gate before it opens. */
const HALL_TRACK: Track = {
  url: `${MUSIC}/summerset-glooms.mp3?v=1`,
  title: 'Summerset Glooms',
  by: 'Vaerion Meanor',
};

/** Volumes that sound their own tone. Everywhere else keeps the hall's. */
const VOLUME_TRACKS: Partial<Record<VolumeSlug, Track>> = {
  history: { url: `${MUSIC}/golden-herald.mp3?v=1`, title: 'Golden Herald', by: 'Vaerion Meanor' },
  // Titled as the Embassy names it; the file keeps the name it arrived under.
  informants: {
    url: `${MUSIC}/whispering-of-the-elder.mp3?v=1`,
    title: 'Whispers of the Elder',
  },
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
  //
  // Held for a beat rather than done on the spot. FluentShell raises a notice
  // saying the writ has lapsed, and it is mounted inside the volume — so
  // resealing immediately would unmount the sentence in the same tick it was
  // written. The delay is what makes the message legible, not a race being
  // papered over: nothing here depends on the two landing in a particular
  // order, and if the shell never mounted the archive still reseals on time.
  useEffect(() => {
    let held: ReturnType<typeof setTimeout> | undefined;
    const reseal = () => {
      if (held) return;
      held = setTimeout(() => setOpen(false), RESEAL_GRACE_MS);
    };
    window.addEventListener(GATE_SEALED_EVENT, reseal);
    return () => {
      window.removeEventListener(GATE_SEALED_EVENT, reseal);
      if (held) clearTimeout(held);
    };
  }, []);

  // The tab title should say which volume is open.
  useEffect(() => {
    const name = route.name === 'volume' ? getTitle(route.slug) : null;
    document.title = name
      ? `${name} - Thalmor Embassy Archives`
      : 'Thalmor Embassy Archives';
  }, [route]);

  const track = (route.name === 'volume' && VOLUME_TRACKS[route.slug]) || HALL_TRACK;

  // Ambience holds the same slot in every state — waiting on the gate, sealed,
  // and open. If it changed position React would remount it, and the track
  // would be cut off the moment the seal breaks.
  return (
    <>
      <Ambience track={track.url} />

      {open === null ? null : !open ? (
        <Gate />
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
                {/* Suspense sits inside the boundary so a chunk that fails to
                    arrive is caught as an error rather than hanging on the
                    fallback forever. The fallback is the same notice a volume
                    shows while the archivist is consulted, so a slow network
                    and a slow sheet look alike to the reader. */}
                <ErrorBoundary resetKey={route.slug}>
                  <Suspense fallback={<Consulting />}>
                    {/* The shell shares this boundary rather than bringing its
                        own, so Fluent and the view arrive together under the
                        one notice instead of the reader watching two
                        consecutive loads. */}
                    <FluentShell slug={route.slug}>
                      {(() => {
                        const View = VIEWS[route.slug];
                        return <View key={route.slug} />;
                      })()}
                    </FluentShell>
                  </Suspense>
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
            {/* The credit names whichever tone is actually sounding, so a
                reader in a volume with its own track is told the right title
                rather than the hall's. A track with no named performer is
                announced and nothing more. */}
            <p className="site-footer__credit">
              {track.by ? (
                <>
                  <em>{track.title}</em>, played by <strong>{track.by}</strong> the bard.
                </>
              ) : (
                <>
                  Playing: <em>{track.title}</em>
                </>
              )}
            </p>
          </footer>
        </div>
      )}
    </>
  );
}

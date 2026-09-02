import { Suspense, lazy, useEffect } from 'react';

import { useRoute } from './router';
import { getTitle } from '../../shared/volumes';
import { bindingVars } from './theme';
import { Ambience } from './components/Ambience';
import { Shelf } from './components/Shelf';
import { Consulting, Notice } from './components/Notice';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { VolumeSlug } from '../../shared/types';

/*
 * Volumes load on demand. Everything below was previously in the first bundle,
 * which meant every reader downloaded all seven registers' code — including the
 * chronicle, which is 24KB of prose before minification — to render whichever
 * one page they had actually come for.
 *
 * The saving used to be argued in terms of a reader stopped at the gate, who
 * paid for all of it to see a seal. There is no gate now and the argument is
 * simply the ordinary one: the shelf is the first screen, it needs none of
 * this, and the reader who opens one volume should not fetch the other eight.
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
const EnforcementView = lazy(() => import('./views/Enforcement').then((m) => ({ default: m.EnforcementView })));

/*
 * Fluent's provider, and it is lazy for the same reason the views are — only
 * more so.
 *
 * THIS IMPORT MUST STAY LAZY. Fluent is the heaviest thing in the project, and
 * a static import here would put it in the index chunk — the one script
 * index.html loads, and therefore the one every reader downloads before they
 * see anything at all. Rendered where it is below — inside the volume branch,
 * inside the Suspense boundary the view was already waiting in — it costs the
 * shelf nothing and arrives with the first volume anyone opens.
 */
/*
 * The Archives Editor.
 *
 * THE TERNARY IS THE POINT, and guarding only the render was not enough. A
 * React.lazy call sits at module top level, so its dynamic import is a real
 * import whatever the JSX around it does: the first attempt guarded the route
 * and the render and still shipped a 12 kB Editor chunk to production, sitting
 * in dist/ with "Seal the volume" and the __editor API paths in it.
 *
 * With the import INSIDE the branch, `import.meta.env.DEV` compiles to `false`,
 * the whole expression is dead, and Rollup emits no chunk at all. That is the
 * difference between a route nobody can reach and code that is not there.
 * test/bundle.test.ts checks dist/ for it, because this was wrong once already.
 */
const EditorView = import.meta.env.DEV
  ? lazy(() => import('./editor/Editor').then((m) => ({ default: m.EditorView })))
  : null;

/*
 * The game, behind React.lazy like every view.
 *
 * It carries five sprites and a canvas engine, none of which a reader at the
 * seal has any business downloading — invariant 7's shape again. Rollup gives
 * it a chunk of its own and test/bundle.test.ts fails if any of it turns up in
 * index-*.js.
 */
const SlayTheHeretic = lazy(() =>
  import('./game/SlayTheHeretic').then((m) => ({ default: m.SlayTheHeretic })),
);

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
  enforcement: EnforcementView,
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
  url: `${MUSIC}/summerset-glooms.mp3?v=2`,
  title: 'Summerset Glooms',
  by: 'Vaerion Meanor',
};

/** Volumes that sound their own tone. Everywhere else keeps the hall's. */
const VOLUME_TRACKS: Partial<Record<VolumeSlug, Track>> = {
  history: { url: `${MUSIC}/golden-herald.mp3?v=2`, title: 'Golden Herald', by: 'Vaerion Meanor' },
  // Titled as the Embassy names it; the file keeps the name it arrived under.
  informants: {
    url: `${MUSIC}/whispering-of-the-elder.mp3?v=2`,
    title: 'Whispers of the Elder',
  },
};

export default function App() {
  const [route, navigate] = useRoute();

  // The archive opens straight onto the shelf. There was a writ to check first
  // and a null state to hold the first paint back while /api/gate answered it;
  // both are gone with the gate, and the first render is the hall itself.

  // The tab title should say which volume is open.
  useEffect(() => {
    const name = route.name === 'volume' ? getTitle(route.slug) : null;
    document.title = name
      ? `${name} - Thalmor Embassy Archives`
      : 'Thalmor Embassy Archives';
  }, [route]);

  const track = (route.name === 'volume' && VOLUME_TRACKS[route.slug]) || HALL_TRACK;

  // Ambience sits outside the shell rather than inside it. It used to hold the
  // same slot across the gate's three states so the track survived the seal
  // breaking; there are no states left to survive, but a remount still cuts the
  // audio, so it stays a sibling of everything that re-renders beneath it.
  return (
    <>
      <Ambience track={track.url} />

      <div className="shell">
        <main>
          {route.name === 'shelf' && <Shelf onOpen={navigate} />}

          {/* The game takes the whole viewport and sits outside the archive's
              page furniture, so it renders as a sibling of the shelf rather
              than inside a volume's binding. */}
          {route.name === 'game' && (
            <ErrorBoundary>
              <Suspense fallback={<Consulting />}>
                <SlayTheHeretic onLeave={() => navigate('/')} />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Dev-only, and that is now the whole of what keeps it from
              readers — it used to sit behind the gate as well. The build
              emits no chunk for it at all; test/bundle.test.ts checks. */}
          {import.meta.env.DEV && route.name === 'editor' && EditorView && (
            <ErrorBoundary resetKey="editor">
              <Suspense fallback={<Consulting />}>
                <EditorView />
              </Suspense>
            </ErrorBoundary>
          )}

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
    </>
  );
}

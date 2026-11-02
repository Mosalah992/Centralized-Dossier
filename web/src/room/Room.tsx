// The Embassy's room: the archive's front page, drawn in pixel art
// (2026-11-02) after the First Emissary's drawing and the team's red lines:
// a hall in one-point perspective, its floor and side walls running back to
// the wall where Ancarion hangs between two arches.
//
//                 Third Aldmeri Dominion · Thalmor Embassy Archives
//   note        banner      Bulletin Board        banner        the hour
//   Bookshelf   pillar  arch   Ancarion   arch  pillar     globe/Cabinet
//               fern           plate            fern
//                       candle Scribe Table candle
//
// Every sprite is drawn in code (scripts/build-pixels.mjs) on one palette and
// laid on one grid (web/src/pixel/layout.ts), scaled by whole device pixels
// (web/src/pixel/scale.ts). Text stays live HTML. Every object is still a
// link or a button, so it can be focused, opened with the keyboard and
// addressed by URL: those that lead to the archive's existing pages navigate
// there; the room's own surfaces (bookshelf, board, Scribe Table, Cabinet)
// open over it as takeovers with URLs of their own. Ancarion keeps the Solar:
// his plate takes its word and lets the reader through to /solar.

import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/jacquard-24/400.css';

import boardArt from '../assets/pixel/board.png';
import bookshelfArt from '../assets/pixel/bookshelf.png';
import noteArt from '../assets/pixel/note.png';
import scene from '../assets/pixel/scene.png';
import scribeArt from '../assets/pixel/scribe.png';
import sconceArt from '../assets/pixel/sconce.png';
import { PANELS, PLACES, type Place } from '../pixel/layout';
import { at } from '../pixel/place';
import { usePixelStage } from '../pixel/scale';
import { Sprite } from '../pixel/Sprite';
import { clearSolarSealed, solarWasSealed } from '../solar-sealed';

import type { Navigate, Route } from '../router';
import type { BoardSectionSummary } from '../../../shared/room';
import { Archway } from './Archway';
import { Boughs } from './Boughs';
import { Cabinet } from './Cabinet';
import { Candle } from './Candle';
import { readSeen, unseenCount } from './board-seen';
import { Link, NavContext } from './nav';
import { RoomClock } from './RoomClock';
import { RoomOrb } from './RoomOrb';
import { RoomPortrait, type AncarionHandle } from './RoomPortrait';
import { SolarPlate, type PlateHandle } from './SolarPlate';
import { useRoomData } from './room-api';
import { Takeover } from './Takeover';
import '../styles/room.css';

const Bookshelf = lazy(() => import('./takeovers/Bookshelf').then((m) => ({ default: m.Bookshelf })));
const Board = lazy(() => import('./takeovers/Board').then((m) => ({ default: m.Board })));
const ScribeTable = lazy(() => import('./takeovers/ScribeTable').then((m) => ({ default: m.ScribeTable })));
const CabinetTakeover = lazy(() => import('./takeovers/Cabinet').then((m) => ({ default: m.Cabinet })));

type RoomRoute = Extract<Route, { name: 'room' }>;

interface ObjectProps {
  id: string;
  href: string;
  name: string;
  describer: string;
  art: string;
  place: Place;
  badge?: ReactNode;
}

function RoomObject({ id, href, name, describer, art, place, badge }: ObjectProps) {
  return (
    <Link href={href} className={`object object--${id} px-at`} style={at(place)} data-object={id} aria-label={`${name}: ${describer}`}>
      <Sprite src={art} className="object__art" />
      <span className="plaque">
        {name}
        {badge}
      </span>
      <span className="describer" aria-hidden="true">
        {describer}
      </span>
    </Link>
  );
}

/** How many sections of the board hold something this reader has not seen. */
function useUnseenNotices(): number {
  const board = useRoomData<{ sections: BoardSectionSummary[] }>('/api/room/board');
  return useMemo(() => (board.state === 'ok' ? unseenCount(board.data.sections, readSeen()) : 0), [board]);
}

export default function Room({ route, navigate }: { route: RoomRoute; navigate: Navigate }) {
  const root = useRef<HTMLDivElement>(null);
  const ancarion = useRef<AncarionHandle>(null);
  const plate = useRef<PlateHandle>(null);
  const plateField = useRef<HTMLInputElement>(null);
  const unseen = useUnseenNotices();
  usePixelStage(root);
  // Turned back from /solar for want of the writ: the plate waits for the word.
  const [solarSealed] = useState(solarWasSealed);
  useEffect(clearSolarSealed, []);
  // A reader who reached the Cabinet without the writ is turned back to the
  // room, where the Cabinet's slip opens for them.
  const [sealed, setSealed] = useState<{ href: string } | null>(null);
  const turnBack = () => {
    const href = window.location.pathname;
    navigate('/', { replace: true });
    setSealed({ href });
  };

  return (
    <NavContext.Provider value={navigate}>
      <div ref={root} className="room">
        <div className="room__stage">
          <img className="room__scene sprite" src={scene} alt="" draggable={false} />
          <Boughs />
          <span className="room__sconce-at px-at" style={at(PLACES.sconceL)} aria-hidden="true">
            <Sprite src={sconceArt} frames={4} />
          </span>
          <span className="room__sconce-at px-at" style={at(PLACES.sconceR)} aria-hidden="true">
            <Sprite src={sconceArt} frames={4} />
          </span>

          <header className="room__title px-at" style={at(PANELS.title)}>
            <p>Third Aldmeri Dominion</p>
            <h1>Thalmor Embassy Archives</h1>
          </header>

          <aside className="room__note note px-at" style={at(PANELS.note)} aria-label="How to file">
            <Sprite src={noteArt} className="note__paper" />
            <div className="note__text">
              <h2>To file at the Scribe Table</h2>
              <ol>
                <li>
                  Give your <strong>code</strong>. It names your rank and office.
                </li>
                <li>Choose what you are filing.</li>
              </ol>
              <p className="note__sign">By order of the First Emissary</p>
            </div>
          </aside>

          <RoomObject
            id="bookshelf"
            href="/bookshelf"
            name="Bookshelf"
            describer="The realm's history, the Chronicles, the Arrests, the Penal Code and the White-Gold Concordat."
            art={bookshelfArt}
            place={PLACES.bookshelf}
          />

          <RoomObject
            id="board"
            href="/board"
            name="Bulletin Board"
            describer="Propaganda, recruitment posters, festivities, standing orders, spiritual guidance and bounties."
            art={boardArt}
            place={PLACES.board}
            badge={
              unseen > 0 ? (
                <span className="plaque__badge" aria-label={`${unseen} new`}>
                  {unseen}
                </span>
              ) : undefined
            }
          />

          {/* The hour and the sky read together: one instrument, two faces. */}
          <RoomClock />
          <RoomOrb />

          <Archway
            side="left"
            place={PLACES.archL}
            name="Roster & Chain of Command"
            describer="The Embassy's troops, and the order of precedence above them."
            ways={[
              { href: '/archives/roster', label: 'Troops Roster' },
              { href: '/archives/statistics', label: 'Chain of Command' },
            ]}
          />

          <RoomPortrait
            ref={ancarion}
            isAttending={() => document.activeElement === plateField.current}
            onSummon={() => plate.current?.knock()}
            onApproach={() => plate.current?.approach()}
          >
            <SolarPlate ref={plate} ancarion={ancarion} field={plateField} sealed={solarSealed} />
          </RoomPortrait>

          <Archway
            side="right"
            place={PLACES.archR}
            name="Gallery & Hall of Honors"
            describer="The Embassy assembled, and those it has honoured."
            ways={[
              { href: '/gallery', label: 'The Gallery' },
              { href: '/archives/honor', label: 'Hall of Honors' },
            ]}
          />

          <Cabinet sealed={sealed} />

          {/* The Scribe Table, a candle at either hand. */}
          <Candle side="l" />
          <RoomObject
            id="scribe"
            href="/scribe-table"
            name="Scribe Table"
            describer="File reports, bounties and more under your code."
            art={scribeArt}
            place={PLACES.scribe}
          />
          <Candle side="r" />
        </div>
      </div>

      {route.open === 'bookshelf' && (
        <Takeover label="The Bookshelf" closeTo="/" returnFocus='[data-object="bookshelf"]'>
          <Suspense fallback={<p className="loading">Taking the books down…</p>}>
            <Bookshelf book={route.sub} />
          </Suspense>
        </Takeover>
      )}
      {route.open === 'board' && (
        <Takeover label="The Bulletin Board" closeTo="/" returnFocus='[data-object="board"]'>
          <Suspense fallback={<p className="loading">Reading the board…</p>}>
            <Board section={route.sub} />
          </Suspense>
        </Takeover>
      )}
      {route.open === 'cabinet' && (
        <Takeover label="The Cabinet" closeTo="/" returnFocus='[data-object="cabinet"]' className="takeover--cabinet">
          <Suspense fallback={<p className="loading">Unlocking the Cabinet…</p>}>
            <CabinetTakeover letter={route.sub} onSealed={turnBack} />
          </Suspense>
        </Takeover>
      )}
      {route.open === 'scribe' && (
        <Takeover label="The Scribe Table" closeTo="/" returnFocus='[data-object="scribe"]'>
          <Suspense fallback={<p className="loading">Trimming the candles…</p>}>
            <ScribeTable />
          </Suspense>
        </Takeover>
      )}
    </NavContext.Provider>
  );
}

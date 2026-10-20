// The Embassy's room: the archive's front page, laid out after the First
// Emissary's drawing and built on the Bruma Joint Archives' room.
//
//   Bookshelf   Bulletin Board (announcements)        The hour
//      │        ┌──────┐ ┌────────┐ ┌──────┐          + orrery
//      │        │ arch │ │Ancarion│ │ arch │          Scroll Rack
//   Solar door  └──────┘ └────────┘ └──────┘             │
//                   torch  Lectern  torch           pinned note
//
// Every object is a link or a button, so it can be focused, opened with the
// keyboard and addressed by URL. Objects that lead to the archive's existing
// pages navigate there; the room's own surfaces (bookshelf, board, lectern)
// open over it as takeovers with URLs of their own.

import { Suspense, lazy, useMemo, useRef, useState, type ReactNode } from 'react';

import { Register } from '../components/Register';
import type { Navigate, Route } from '../router';
import type { BoardSectionSummary } from '../../../shared/room';
import { Archway } from './Archway';
import { BoardArt, BookshelfArt, LecternArt, SolarDoorArt } from './art';
import { readSeen, unseenCount } from './board-seen';
import { ImageSlot } from './ImageSlot';
import { Link, NavContext } from './nav';
import { RoomClock } from './RoomClock';
import { RoomOrb } from './RoomOrb';
import { RoomPortrait, type AncarionHandle } from './RoomPortrait';
import { useRoomData } from './room-api';
import { ScrollRack } from './ScrollRack';
import { Takeover } from './Takeover';
import '../styles/room.css';

const Bookshelf = lazy(() => import('./takeovers/Bookshelf').then((m) => ({ default: m.Bookshelf })));
const Board = lazy(() => import('./takeovers/Board').then((m) => ({ default: m.Board })));
const Lectern = lazy(() => import('./takeovers/Lectern').then((m) => ({ default: m.Lectern })));

type RoomRoute = Extract<Route, { name: 'room' }>;

interface ObjectProps {
  id: string;
  href: string;
  name: string;
  describer: string;
  art: ReactNode;
  className?: string;
  badge?: ReactNode;
}

function RoomObject({ id, href, name, describer, art, className = '', badge }: ObjectProps) {
  return (
    <Link href={href} className={`object object--${id} ${className}`} data-object={id} aria-label={`${name}: ${describer}`}>
      <ImageSlot name={id} className="object__art">
        {art}
      </ImageSlot>
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

/** A standing torch: footage of a real flame (the Gallery's, before it came here). */
function Torch({ side }: { side: 'l' | 'r' }) {
  return <span className={`torch torch--${side}`} aria-hidden="true" />;
}

/**
 * The door to the Solar, which will hold the map and the clerk's desk. Until
 * it is furnished the door is sealed: it can be found, focused and tried, and
 * it says so, but it leads nowhere and is not dressed as a link.
 */
function SolarDoor() {
  const [trying, setTrying] = useState(false);
  const tryDoor = () => {
    if (trying) return;
    setTrying(true);
    window.setTimeout(() => setTrying(false), 700);
  };
  return (
    <button
      type="button"
      className="area-door object object--door"
      data-trying={trying || undefined}
      aria-disabled="true"
      aria-label="The Solar: the map and the clerk's desk. The door is sealed until the room is furnished."
      onClick={tryDoor}
    >
      <ImageSlot name="solar-door" className="object__art">
        <SolarDoorArt />
      </ImageSlot>
      <span className="plaque">The Solar</span>
      <span className="describer" aria-hidden="true">
        The map and the clerk’s desk. Sealed until the room is furnished.
      </span>
    </button>
  );
}

/** How many sections of the board hold something this reader has not seen. */
function useUnseenNotices(): number {
  const board = useRoomData<{ sections: BoardSectionSummary[] }>('/api/room/board');
  return useMemo(() => (board.state === 'ok' ? unseenCount(board.data.sections, readSeen()) : 0), [board]);
}

export default function Room({ route, navigate }: { route: RoomRoute; navigate: Navigate }) {
  const ancarion = useRef<AncarionHandle>(null);
  const rackField = useRef<HTMLInputElement>(null);
  const unseen = useUnseenNotices();

  return (
    <NavContext.Provider value={navigate}>
      <div className="room">
        <div className="room__wall" aria-hidden="true" />
        <div className="room__light" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <header className="room__title">
          <p>Third Aldmeri Dominion</p>
          <h1>Thalmor Embassy Archives</h1>
        </header>

        <div className="room__grid">
          <RoomObject
            id="bookshelf"
            href="/bookshelf"
            name="Bookshelf"
            describer="The realm's history, the Chronicles, the Arrests, the Penal Code and the White-Gold Concordat."
            art={
              <>
                <BookshelfArt tiers={5} className="shelf-art shelf-art--tall" />
                <BookshelfArt className="shelf-art shelf-art--short" />
              </>
            }
            className="area-shelf"
          />

          <RoomObject
            id="board"
            href="/board"
            name="Bulletin Board"
            describer="Announcements, bounties, new laws, figures of interest, the Embassy agenda and the news."
            art={
              <>
                <BoardArt wide className="board-art board-art--wide" />
                <BoardArt className="board-art board-art--narrow" />
              </>
            }
            className="area-board"
            badge={
              unseen > 0 ? (
                <span className="plaque__badge" aria-label={`${unseen} new`}>
                  {unseen}
                </span>
              ) : undefined
            }
          />

          {/* The hour and the sky read together: one instrument, two faces. */}
          <div className="area-instruments">
            <RoomClock />
            <RoomOrb />
          </div>

          <div className="area-arch-l">
            <Archway
              side="left"
              name="Roster & Chain of Command"
              describer="The Embassy's troops, and the order of precedence above them."
              ways={[
                { href: '/archives/roster', label: 'Troops Roster' },
                { href: '/archives/statistics', label: 'Chain of Command' },
              ]}
            />
          </div>

          <div className="area-portrait">
            <RoomPortrait ref={ancarion} isAttending={() => document.activeElement === rackField.current} />
          </div>

          <div className="area-arch-r">
            <Archway
              side="right"
              name="Gallery & Hall of Honors"
              describer="The Embassy assembled, and those it has honoured."
              ways={[
                { href: '/gallery', label: 'The Gallery' },
                { href: '/archives/honor', label: 'Hall of Honors' },
              ]}
            />
          </div>

          <div className="area-rack">
            <ScrollRack ancarion={ancarion} field={rackField} />
          </div>

          <SolarDoor />

          {/* The lectern stands between two torches, the room's brightest
              place after Ancarion: it is where a reader acts. */}
          <div className="area-lectern">
            <Torch side="l" />
            <RoomObject
              id="lectern"
              href="/lectern"
              name="Lectern"
              describer="File reports, bounties and more under your code."
              art={<LecternArt />}
            />
            <Torch side="r" />
          </div>

          <aside className="area-note note" aria-label="How to file">
            <span className="note__pin" aria-hidden="true" />
            <h2>To file at the Lectern</h2>
            <ol>
              <li>
                Give your <strong>code</strong>. It names your rank and the office you file from.
              </li>
              <li>Choose what you are filing: a report, a bounty, or more.</li>
            </ol>
            <p className="note__sign">By order of the First Emissary</p>
          </aside>
        </div>

        <footer className="room__foot">
          <Register />
        </footer>

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
      {route.open === 'lectern' && (
        <Takeover label="The Lectern" closeTo="/" returnFocus='[data-object="lectern"]'>
          <Suspense fallback={<p className="loading">Lighting the torches…</p>}>
            <Lectern />
          </Suspense>
        </Takeover>
      )}
    </NavContext.Provider>
  );
}

// The Solar: High Command's room behind Ancarion, after the First Emissary's
// sketch (2026-10-23), and since 2026-11-03 a pixel room with depth like the
// front page: the same hall (the room's scene), the Dominion's hanging between
// two windows on the back wall, the notes pinned on the left wall, the war
// table in the middle of the floor with the realm map laid open on it, and the
// Clerk Table and Canonreeve's Desk at the foot of the room. Pressing the table
// takes up the map (MapViewer). Placed in art pixels by SOLAR (pixel/layout.ts)
// and scaled like the room (usePixelStage); phones stack the same pieces.
//
// The map and its pieces work now, shared by everyone admitted (usePins), and
// so does the Clerk Table, where High Command stamps what the Scribe has filed
// (solar/ClerkTable.tsx). Its plaque counts what waits, and a slip at the top
// of the screen announces anything filed since the reader last opened it,
// checked every minute (solar/useClerk.ts, ClerkAlert.tsx). Canonreeve's Desk
// is furnished but not yet consecrated: its work (decrees, books, new pieces
// for the table) is to come.
//
// It is reached only through Ancarion's plate. A reader who arrives without
// the Solar's writ is sent back to the room, where the plate waits for them.

import { Suspense, lazy, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import canonreeveDeskArt from '../assets/pixel/canonreeve-desk.png';
import clerkTableArt from '../assets/pixel/clerk-table.png';
import scene from '../assets/pixel/scene.png';
import sconceArt from '../assets/pixel/sconce.png';
import hangingArt from '../assets/pixel/solar-hanging.png';
import windowLeftArt from '../assets/pixel/solar-window-l.png';
import windowRightArt from '../assets/pixel/solar-window-r.png';
import { solarIsOpen } from '../api';
import type { Navigate } from '../router';
import { Consulting } from '../components/Notice';
import { PANELS, PLACES, SOLAR, type Place } from '../pixel/layout';
import { at } from '../pixel/place';
import { usePixelStage } from '../pixel/scale';
import { Sprite } from '../pixel/Sprite';
import { clear, markSolarSealed, peek } from '../solar-sealed';
import { Fleuron } from '../room/art';
import { ClerkAlert } from './solar/ClerkAlert';
import { latestFiled, markClerkSeen, readClerkSeen, unseenFilings } from './solar/clerk-seen';
import { ClerkTable } from './solar/ClerkTable';
import { useClerk } from './solar/useClerk';
import { Notes } from './solar/Notes';
import { usePins } from './solar/usePins';
import { WarTable } from './solar/WarTable';
import '../styles/solar.css';

const MapViewer = lazy(() => import('./solar/MapViewer').then((m) => ({ default: m.MapViewer })));

/**
 * A piece of the Solar's furniture: its sprite and plaque, which open the card
 * that says what it is for. The Clerk Table's opening is the Solar's to hold
 * (`open`, `onToggle`), so its alert can open it, and its plaque carries a count.
 */
function Furniture({
  id,
  name,
  art,
  place,
  badge,
  open: held,
  onToggle,
  children,
}: {
  id: string;
  name: string;
  art: string;
  place: Place;
  badge?: ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [own, setOwn] = useState(false);
  const open = held ?? own;
  const card = useId();
  return (
    <section className={`solar-furniture solar-furniture--${id} px-at`} style={at(place)} aria-labelledby={`${card}-name`}>
      <button
        type="button"
        className="solar-furniture__object"
        aria-expanded={open}
        aria-controls={card}
        onClick={() => (onToggle ? onToggle(!open) : setOwn((o) => !o))}
      >
        <Sprite src={art} className="solar-furniture__art" />
        <span className="plaque" id={`${card}-name`}>
          {name}
          {badge}
        </span>
      </button>
      <div className="solar-card parchment" id={card} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

function Chamber({ navigate }: { navigate: Navigate }) {
  const root = useRef<HTMLDivElement>(null);
  usePixelStage(root);
  const pins = usePins();
  const [open, setOpen] = useState<{ focus: string | null } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const take = (focus: string | null = null) => {
    const from = document.activeElement;
    opener.current = from instanceof HTMLElement && from !== document.body ? from : null;
    setOpen({ focus });
  };
  // Back to whatever opened the map, or to the map on the table.
  const lay = () => {
    setOpen(null);
    window.requestAnimationFrame(() =>
      (opener.current ?? document.querySelector<HTMLElement>('[data-solar="map"]'))?.focus({ preventScroll: true }),
    );
  };

  // The writ lapsed while the reader was here: back to Ancarion.
  useEffect(() => {
    if (pins.status !== 'sealed') return;
    markSolarSealed();
    navigate('/', { replace: true });
  }, [pins.status, navigate]);

  // The Clerk Table: what waits there, counted on its plaque, and an alert for
  // anything filed since this reader last opened it.
  const clerk = useClerk();
  const [clerkOpen, setClerkOpen] = useState(false);
  const [seen, setSeen] = useState(() => readClerkSeen());
  const waiting = typeof clerk.table === 'object' ? clerk.table.waiting : [];
  const fresh = unseenFilings(waiting, seen);
  const look = () => setSeen(markClerkSeen(latestFiled(waiting)));
  const toggleClerk = (next: boolean) => {
    setClerkOpen(next);
    if (next) look();
  };
  // While the table lies open, whatever arrives is seen as it arrives.
  useEffect(() => {
    if (clerkOpen && fresh.length) look();
  }, [clerkOpen, fresh.length]);
  const goToClerk = () => {
    toggleClerk(true);
    window.requestAnimationFrame(() =>
      document.querySelector('.solar-furniture--clerk')?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  };

  return (
    <div ref={root} className="solar" data-map-open={open ? true : undefined}>
      <div className="solar__stage">
        <img className="solar__scene sprite" src={scene} alt="" draggable={false} />
        <span className="solar__fitting px-at" style={at(SOLAR.windowL)} aria-hidden="true">
          <Sprite src={windowLeftArt} />
        </span>
        <span className="solar__fitting px-at" style={at(SOLAR.windowR)} aria-hidden="true">
          <Sprite src={windowRightArt} />
        </span>
        <span className="solar__fitting px-at" style={at(SOLAR.hanging)} aria-hidden="true">
          <Sprite src={hangingArt} />
        </span>
        <span className="solar__fitting solar__sconce px-at" style={at(PLACES.sconceL)} aria-hidden="true">
          <Sprite src={sconceArt} frames={4} />
        </span>
        <span className="solar__fitting solar__sconce px-at" style={at(PLACES.sconceR)} aria-hidden="true">
          <Sprite src={sconceArt} frames={4} />
        </span>

        <header className="solar__title px-at" style={at(PANELS.title)}>
          <p>Thalmor Embassy</p>
          <h1>The Solar</h1>
        </header>

        <Notes pins={pins} onOpen={(id) => take(id)} place={SOLAR.notes} />
        <WarTable pins={pins} onOpen={() => take()} place={SOLAR.table} />

        <Furniture
          id="clerk"
          name="Clerk Table"
          art={clerkTableArt}
          place={SOLAR.clerk}
          open={clerkOpen}
          onToggle={toggleClerk}
          badge={
            waiting.length > 0 ? (
              <span className="solar-furniture__badge" data-new={fresh.length > 0 || undefined} aria-label={`, ${waiting.length} waiting`}>
                {waiting.length}
              </span>
            ) : null
          }
        >
          <ClerkTable clerk={clerk} />
        </Furniture>

        <Furniture id="desk" name="Canonreeve’s Desk" art={canonreeveDeskArt} place={SOLAR.desk}>
          <Fleuron />
          <h3>Where the Embassy writes</h3>
          <ul>
            <li>Announcements, and notices nailed to the bulletin board</li>
            <li>Decrees under the Embassy’s seal</li>
            <li>Books for the shelf</li>
            <li>New pieces for the war table</li>
          </ul>
          <p className="solar-card__wait">The desk is furnished; its pens are not yet cut.</p>
        </Furniture>
      </div>

      {open && (
        <Suspense fallback={<p className="loading solar__loading">Spreading the map…</p>}>
          <MapViewer pins={pins} focus={open.focus} onClose={lay} />
        </Suspense>
      )}

      {!open && !clerkOpen && <ClerkAlert fresh={fresh} onOpen={goToClerk} onLater={look} />}
    </div>
  );
}

export function SolarView({ navigate }: { navigate: Navigate }) {
  // Ancarion has just let the reader through: open at once, so his portrait
  // can open out into the chamber, and confirm with the server meanwhile.
  const [admitted, setAdmitted] = useState<boolean | null>(() => (peek('admitted') ? true : null));

  useEffect(() => {
    clear('admitted');
    let live = true;
    void solarIsOpen().then((open) => {
      if (!live) return;
      if (open) setAdmitted(true);
      else {
        markSolarSealed();
        navigate('/', { replace: true });
      }
    });
    return () => {
      live = false;
    };
  }, [navigate]);

  return (
    <div className="solar-page">
      <button className="volume__back" type="button" onClick={() => navigate('/')}>
        Return to the Embassy
      </button>
      {admitted ? <Chamber navigate={navigate} /> : <Consulting />}
    </div>
  );
}

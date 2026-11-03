// The Solar: High Command's room behind Ancarion, after the First Emissary's
// sketch (2026-10-23), and since 2026-11-03 a pixel room with depth like the
// front page: the same hall (the room's scene), the Dominion's hanging between
// two windows on the back wall, the notes pinned on the left wall, the war
// table in the middle of the floor with the realm map laid open on it, and the
// Clerk Table and Canonreeve's Desk at the foot of the room. Pressing the table
// takes up the map (MapViewer). Placed in art pixels by SOLAR (pixel/layout.ts)
// and scaled like the room (usePixelStage); phones stack the same pieces.
//
// The map and its pieces work now, shared by everyone admitted (usePins). The
// Clerk Table and Canonreeve's Desk are furnished but not yet consecrated:
// their work (filings stamped, notices nailed up, decrees, books, new pieces
// for the table) comes with the Librarian backend, as the Scribe Table's does.
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
import { Notes } from './solar/Notes';
import { usePins } from './solar/usePins';
import { WarTable } from './solar/WarTable';
import '../styles/solar.css';

const MapViewer = lazy(() => import('./solar/MapViewer').then((m) => ({ default: m.MapViewer })));

/**
 * A piece of the Solar's furniture: its sprite and plaque, which open the card
 * that says what it is for.
 */
function Furniture({ id, name, art, place, children }: { id: string; name: string; art: string; place: Place; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const card = useId();
  return (
    <section className={`solar-furniture solar-furniture--${id} px-at`} style={at(place)} aria-labelledby={`${card}-name`}>
      <button type="button" className="solar-furniture__object" aria-expanded={open} aria-controls={card} onClick={() => setOpen((o) => !o)}>
        <Sprite src={art} className="solar-furniture__art" />
        <span className="plaque" id={`${card}-name`}>
          {name}
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

        <Furniture id="clerk" name="Clerk Table" art={clerkTableArt} place={SOLAR.clerk}>
          <Fleuron />
          <h3>The stamps await their consecration</h3>
          <p>
            Filings will be stamped here once the Scribe Table opens: <strong>Approved</strong> under the Dominion’s gold
            seal, or <strong>Denied</strong>.
          </p>
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

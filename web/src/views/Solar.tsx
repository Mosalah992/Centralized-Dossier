// The Solar: High Command's room behind Ancarion, laid out after the First
// Emissary's sketch (2026-10-23).
//
//   ┌──────────────────────────────────────────────┐
//   │ Notes │   The war table: the realm map       │
//   │       │   (pawns and points of interest)     │
//   │ Clerk Table + stamps  │  Canonreeve's Desk   │
//   └──────────────────────────────────────────────┘
//
// The map and its pieces work now, shared by everyone admitted (usePins). The
// Clerk Table and Canonreeve's Desk are furnished but not yet consecrated:
// their work (filings stamped, notices nailed up, decrees, books, new pieces
// for the table) comes with the Librarian backend, as the Scribe Table's does.
//
// It is reached only through Ancarion's plate. A reader who arrives without
// the Solar's writ is sent back to the room, where the plate waits for them.

import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import { solarIsOpen } from '../api';
import type { Navigate } from '../router';
import { Consulting } from '../components/Notice';
import { markSolarSealed } from '../solar-sealed';
import { Fleuron } from '../room/art';
import { Stamp } from '../room/takeovers/Stamp';
import { CanonreeveDeskArt, ClerkTableArt } from './solar/art';
import { Notes } from './solar/Notes';
import { usePins } from './solar/usePins';
import { WarTable } from './solar/WarTable';
import '../styles/solar.css';

const MapViewer = lazy(() => import('./solar/MapViewer').then((m) => ({ default: m.MapViewer })));

function Chamber({ navigate }: { navigate: Navigate }) {
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
    <div className="solar" data-map-open={open ? true : undefined}>
      <header className="solar__title">
        <p>Thalmor Embassy</p>
        <h1>The Solar</h1>
      </header>

      <div className="solar__chamber">
        <Notes pins={pins} onOpen={(id) => take(id)} />
        <WarTable pins={pins} onOpen={() => take()} />

        <section className="solar-furniture solar-furniture--clerk" aria-labelledby="clerk-title">
          <div className="solar-furniture__art">
            <ClerkTableArt />
            <span className="solar-furniture__stamps" aria-hidden="true">
              <Stamp mark="aldmeri" size={46} />
              <Stamp mark="denied" size={40} />
            </span>
          </div>
          <span className="plaque" id="clerk-title">
            Clerk Table
          </span>
          <div className="solar-card parchment">
            <Fleuron />
            <h3>The stamps await their consecration</h3>
            <p>
              Filings will be stamped here once the Scribe Table opens: <strong>Approved</strong> under the Dominion’s
              gold seal, or <strong>Denied</strong>.
            </p>
          </div>
        </section>

        <section className="solar-furniture solar-furniture--desk" aria-labelledby="desk-title">
          <div className="solar-furniture__art">
            <CanonreeveDeskArt />
          </div>
          <span className="plaque" id="desk-title">
            Canonreeve’s Desk
          </span>
          <div className="solar-card parchment">
            <Fleuron />
            <h3>Where the Embassy writes</h3>
            <ul>
              <li>Announcements, and notices nailed to the bulletin board</li>
              <li>Decrees under the Embassy’s seal</li>
              <li>Books for the shelf</li>
              <li>New pieces for the war table</li>
            </ul>
            <p className="solar-card__wait">The desk is furnished; its pens are not yet cut.</p>
          </div>
        </section>
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
  const [admitted, setAdmitted] = useState<boolean | null>(null);

  useEffect(() => {
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

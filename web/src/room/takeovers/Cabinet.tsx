// The Cabinet, opened: a card catalogue of four drawers (Fresh!, New, Old,
// Archive) holding High Command's letters by how long ago they came. Pull a
// drawer and its letters stand in it like index cards, each under its wing's
// seal with its title written on it; take one out and it opens (Letter.tsx).
//
// It replaced the Reports register on 2026-10-22 and keeps its addresses:
// /reports is the Cabinet, /reports/:id a letter in it. It reads the register
// exactly as that page did (GET /api/reports by date range, thirty at a time,
// and GET /api/reports/:id) behind the same Reports-only writ. A reader
// without the writ is handed back to the room (`onSealed`), where Ancarion
// hears their word.

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import { reportsIsOpen, useDrawer, useReport, type DrawerState, type Report } from '../../api';
import { openedFromRoom } from '../../router';
import { DRAWERS, DRAWER_INFO, drawerOf, drawerRange, type Drawer } from '../cabinet-drawers';
import { plainClick, useNavigate } from '../nav';
import { Emblem } from './cabinet/Emblem';
import { Letter, filedOn, waxOf } from './cabinet/Letter';
import { WING_INFO, wingOf } from '../../../../shared/wings';
import '../../styles/cabinet.css';

function useDrawers(unlocked: boolean, now: number): Record<Drawer, DrawerState> {
  const read = (d: Drawer) => useDrawer(unlocked, drawerRange(d, now), (r: Report) => drawerOf(r.timestamp, now) === d);
  // A fixed four, in a fixed order: the rules of hooks hold.
  return { fresh: read('fresh'), new: read('new'), old: read('old'), archive: read('archive') };
}

const countOf = (drawer: DrawerState) =>
  drawer.state === 'loading' && drawer.letters.length === 0 ? '…' : `${drawer.letters.length}${drawer.more ? '+' : ''}`;

function Envelope({ report, onTake }: { report: Report; onTake: (report: Report, from: DOMRect) => void }) {
  const wing = WING_INFO[wingOf(report.category)];
  const take = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    onTake(report, event.currentTarget.getBoundingClientRect());
  };
  return (
    <li className="envelope-slot">
      <a
        href={`/reports/${report.id}`}
        className="envelope"
        style={waxOf(report)}
        onClick={take}
        aria-label={`${report.title}. ${wing.name}, ${filedOn(report.timestamp)}.`}
        data-letter={report.id}
      >
        <span className="envelope__title">{report.title}</span>
        <span className="envelope__foot">
          <span className="envelope__wing">{wing.name}</span>
          <span className="envelope__date">{filedOn(report.timestamp)}</span>
        </span>
        <span className="envelope__seal" aria-hidden="true">
          <Emblem name={wing.emblem} size={16} />
        </span>
        <span className="describer describer--letter" aria-hidden="true">
          {report.title}
        </span>
      </a>
    </li>
  );
}

export function Cabinet({ letter, onSealed }: { letter?: string; onSealed: () => void }) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const drawers = useDrawers(unlocked, now);
  const [open, setOpen] = useState<Drawer | null>(null);
  const origin = useRef<DOMRect | null>(null);
  const tookOut = useRef(false);

  // The writ, once: without it the reader goes back to Ancarion.
  useEffect(() => {
    let live = true;
    void reportsIsOpen().then((ok) => {
      if (!live) return;
      if (ok) setUnlocked(true);
      else onSealed();
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The letter asked for by address: from its drawer if it is already read, or
  // straight from the register (a deep link, or a letter further back).
  const held = useMemo(
    () => (letter ? DRAWERS.flatMap((d) => drawers[d].letters).find((r) => r.id === letter) : undefined),
    [letter, drawers],
  );
  const fetched = useReport(unlocked && Boolean(letter) && !held, letter ?? null);
  const report = held ?? (fetched.state === 'ready' ? fetched.value.report : undefined);

  // A letter opened by address opens its drawer beneath it.
  useEffect(() => {
    if (report && !open) setOpen(drawerOf(report.timestamp, now));
  }, [report, open, now]);

  // Escape shuts an open drawer before the Cabinet itself (the letter answers first).
  useEffect(() => {
    if (!open || letter) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, letter]);

  const take = (r: Report, from: DOMRect) => {
    origin.current = from;
    tookOut.current = true;
    navigate(`/reports/${r.id}`);
  };

  const fold = () => {
    const id = letter;
    // Taken out here: Back puts it away. Opened by address: there is nothing
    // behind it to go back to, so the Cabinet replaces it.
    if (tookOut.current && openedFromRoom()) window.history.back();
    else navigate('/reports', { replace: true });
    tookOut.current = false;
    origin.current = null;
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-letter="${id}"]`)?.focus({ preventScroll: true }),
    );
  };

  const pull = (d: Drawer) => setOpen((current) => (current === d ? null : d));
  const drawer = open ? drawers[open] : null;

  return (
    <div className="cabinet-view">
      <h2 className="takeover__heading">The Cabinet</h2>
      <p className="takeover__sub">Letters to High Command, filed by when they came</p>

      {!unlocked ? (
        <p className="loading">Ancarion turns the key…</p>
      ) : (
        <>
          <div className="cabinet-front">
            {DRAWERS.map((d) => (
              <button
                key={d}
                type="button"
                className="drawer-front"
                data-drawer={d}
                aria-expanded={open === d}
                aria-controls="cabinet-drawer"
                onClick={() => pull(d)}
              >
                <span className="drawer-front__holder">
                  <span className="drawer-front__label">{DRAWER_INFO[d].label}</span>
                </span>
                <span className="drawer-front__pull" aria-hidden="true" />
                <span className="drawer-front__count">
                  {countOf(drawers[d])} <span className="sr-only">letters</span>
                </span>
                <span className="drawer-front__describer">{DRAWER_INFO[d].describer}</span>
              </button>
            ))}
          </div>

          <section className="drawer" id="cabinet-drawer" data-open={open ?? undefined} aria-label={open ? `${DRAWER_INFO[open].label} drawer` : undefined} hidden={!open}>
            {drawer && open && (
              <>
                {drawer.letters.length === 0 && drawer.state !== 'loading' && (
                  <p className="drawer__empty">
                    {drawer.state === 'error' ? 'This drawer could not be read. Try again shortly.' : 'No letters lie in this drawer.'}
                  </p>
                )}
                <ul className="drawer__letters">
                  {drawer.letters.map((r) => (
                    <Envelope key={r.id} report={r} onTake={take} />
                  ))}
                </ul>
                {drawer.state === 'loading' && <p className="loading">Leafing through the drawer…</p>}
                {drawer.more && drawer.state === 'ready' && (
                  <button type="button" className="btn drawer__more" onClick={drawer.loadMore}>
                    More letters
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}

      {letter && report && <Letter key={report.id} report={report} origin={origin.current} onFold={fold} />}
      {letter && !report && fetched.state === 'error' && (
        <p className="drawer__empty">No letter in the Cabinet answers to that number.</p>
      )}
    </div>
  );
}

// A router small enough not to warrant a dependency: the archive has one room
// and a dozen pages. History API so URLs are shareable, with a Pages _redirects
// rule serving index.html for every path.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VolumeSlug } from '../../shared/types';
import { ALL_SLUGS } from '../../shared/volumes';
import { transition, type Direction } from './transitions';

/**
 * The room's own surfaces, which open over it rather than replacing it. Each
 * has a real URL so it can be shared and reloaded, but the room stays mounted
 * beneath (see web/src/room/Takeover.tsx).
 */
export type RoomSurface = 'bookshelf' | 'board' | 'scribe' | 'cabinet';

export type Route =
  | { name: 'room'; open?: RoomSurface; sub?: string }
  | { name: 'gallery' }
  | { name: 'solar' }
  | { name: 'penalcode' }
  | { name: 'volume'; slug: VolumeSlug }
  | { name: 'editor' }
  | { name: 'missing' };

/** A book's slug or a board section: lower-case words joined by hyphens. */
const SUB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parse(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '');
  if (path === '' || path === '/') return { name: 'room' };
  if (path === '/gallery') return { name: 'gallery' };
  // High Command's room, behind Ancarion's plate (web/src/views/Solar.tsx).
  if (path === '/solar') return { name: 'solar' };
  // The Cabinet keeps the reports: its address is still /reports, and one
  // report's is still /reports/:id, which opens that letter unfolded.
  if (path === '/reports') return { name: 'room', open: 'cabinet' };
  const filing = /^\/reports\/(\d{1,24})$/.exec(path);
  if (filing) return { name: 'room', open: 'cabinet', sub: filing[1]! };
  // The Code is asked for as "/Penalcode" as often as not; any casing opens it.
  if (path.toLowerCase() === '/penalcode') return { name: 'penalcode' };

  // The Scribe Table was the Lectern until 2026-10-22; its old address still opens it.
  if (path === '/scribe-table' || path === '/lectern') return { name: 'room', open: 'scribe' };
  const surface = /^\/(bookshelf|board)(?:\/([^/]{1,80}))?$/.exec(path);
  if (surface) {
    const open = surface[1] as RoomSurface;
    const sub = surface[2];
    if (sub === undefined) return { name: 'room', open };
    if (SUB.test(sub)) return { name: 'room', open, sub };
    return { name: 'missing' };
  }

  /*
   * The Archives Editor, and ONLY while the dev server is running.
   *
   * import.meta.env.DEV is a compile-time constant, so in a production build
   * this whole branch is `if (false)` and Rollup removes it along with the
   * import it guards. The route does not merely 404 in production — it does
   * not exist, which is the only guarantee worth having about a surface that
   * writes files.
   */
  if (import.meta.env.DEV && path === '/editor') return { name: 'editor' };

  const match = /^\/archives\/([a-z]+)$/.exec(path);
  const slug = match?.[1];
  if (slug && (ALL_SLUGS as readonly string[]).includes(slug)) {
    return { name: 'volume', slug: slug as VolumeSlug };
  }

  return { name: 'missing' };
}

export const hrefFor = (slug: VolumeSlug) => `/archives/${slug}`;

export interface NavigateOptions {
  /** Replace the current entry instead of adding one. */
  replace?: boolean;
}

export type Navigate = (href: string, options?: NavigateOptions) => void;

/**
 * Set on a history entry pushed from inside the room. Closing a takeover goes
 * back through history when it was opened from the room (so Back and the close
 * seal agree), and replaces the URL with "/" when it was a deep link — there
 * is no room entry behind a deep link to go back to.
 */
export const FROM_ROOM = 'thalmor:room';

export function openedFromRoom(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[FROM_ROOM] === true;
}

/** Old addresses that still open, and the address they now go by. */
const RENAMED: Record<string, string> = { '/lectern': '/scribe-table' };

/*
 * Getting the next place ready before the scene changes.
 *
 * Every place but the room's surfaces is its own lazy chunk. Changing scene
 * before its code has arrived would animate into a loading notice and then cut
 * to the place, which is the stiffness the transitions exist to remove. App
 * registers how to fetch each place; a change waits for it, but never long:
 * past the patience below it goes on regardless.
 */
type Preparer = (route: Route) => Promise<unknown> | undefined;
let prepare: Preparer = () => undefined;
export const setRoutePreparer = (fn: Preparer) => {
  prepare = fn;
};
const PATIENCE_MS = 700;
const ready = (route: Route): Promise<unknown> => {
  const loading = prepare(route);
  if (!loading) return Promise.resolve();
  return Promise.race([loading.catch(() => undefined), new Promise((resolve) => window.setTimeout(resolve, PATIENCE_MS))]);
};

/**
 * Out to the room is coming back and anywhere else is going deeper, except
 * the Solar, which is entered through Ancarion's portrait and left by it.
 */
export const directionOf = (from: Route, next: Route): Direction => {
  if (next.name === 'solar') return 'through';
  if (from.name === 'solar' && next.name === 'room') return 'return';
  return next.name === 'room' ? 'back' : 'forward';
};

export function useRoute(): [Route, Navigate] {
  const [route, setRoute] = useState<Route>(() => {
    // An old address is shown by its new name, without a history entry.
    const renamed = RENAMED[window.location.pathname.replace(/\/+$/, '')];
    if (renamed) window.history.replaceState(window.history.state, '', renamed);
    return parse(window.location.pathname);
  });
  // The place on screen, for the Back button's handler (the URL has already
  // moved on by the time it runs).
  const shown = useRef(route);
  shown.current = route;
  // Only the latest request changes the scene: a second click while the first
  // place is still loading wins.
  const latest = useRef(0);

  useEffect(() => {
    const onPop = () => {
      const next = parse(window.location.pathname);
      const from = shown.current;
      if (from.name === 'room' && next.name === 'room') return setRoute(next);
      const ticket = ++latest.current;
      void ready(next).then(() => {
        if (ticket !== latest.current) return;
        transition(() => setRoute(parse(window.location.pathname)), directionOf(from, next));
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<Navigate>((href, options = {}) => {
    if (href === window.location.pathname) return;
    const from = parse(window.location.pathname);
    const next = parse(href);
    // Within the room — opening or closing one of its surfaces — the reader
    // stays where they are on the wall, and the takeover animates itself.
    const withinRoom = from.name === 'room' && next.name === 'room';
    const state = withinRoom && next.open ? { [FROM_ROOM]: true } : null;
    const go = () => {
      if (options.replace) window.history.replaceState(state, '', href);
      else window.history.pushState(state, '', href);
      setRoute(next);
    };
    const ticket = ++latest.current;
    if (withinRoom) return go();
    // Anywhere else is a new place, entered at its top, as one scene.
    void ready(next).then(() => {
      if (ticket !== latest.current) return;
      transition(() => {
        go();
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, directionOf(from, next));
    });
  }, []);

  return [route, navigate];
}

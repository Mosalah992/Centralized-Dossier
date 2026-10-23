// A router small enough not to warrant a dependency: the archive has one room
// and a dozen pages. History API so URLs are shareable, with a Pages _redirects
// rule serving index.html for every path.

import { useCallback, useEffect, useState } from 'react';
import type { VolumeSlug } from '../../shared/types';
import { ALL_SLUGS } from '../../shared/volumes';

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

export function useRoute(): [Route, Navigate] {
  const [route, setRoute] = useState<Route>(() => {
    // An old address is shown by its new name, without a history entry.
    const renamed = RENAMED[window.location.pathname.replace(/\/+$/, '')];
    if (renamed) window.history.replaceState(window.history.state, '', renamed);
    return parse(window.location.pathname);
  });

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<Navigate>((href, options = {}) => {
    if (href === window.location.pathname) return;
    const from = parse(window.location.pathname);
    const next = parse(href);
    // Within the room — opening or closing one of its surfaces — the reader
    // stays where they are on the wall; anywhere else is a new page.
    const withinRoom = from.name === 'room' && next.name === 'room';
    const state = withinRoom && next.open ? { [FROM_ROOM]: true } : null;
    if (options.replace) window.history.replaceState(state, '', href);
    else window.history.pushState(state, '', href);
    setRoute(next);
    if (withinRoom) return;
    // A new volume is a new page: start it at the top, but respect a reader
    // who has asked for less motion.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  return [route, navigate];
}

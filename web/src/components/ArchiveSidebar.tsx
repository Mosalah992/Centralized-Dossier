import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ARCHIVE_NAVIGATION,
  filterArchiveNavigation,
  navigationItemIsActive,
} from '../archive-navigation';
import { COVERS, COVER_H, COVER_W } from '../covers';
import type { Route } from '../router';
import reportsSealUrl from '../assets/gate-seal.webp';

interface Props {
  route: Route;
  onNavigate: (href: string) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

// The rail opens on intent, not on contact: a cursor crossing the left edge on
// its way to the page should not throw a panel over the shelf, and one slipping
// off the panel for a moment should not snap it shut under the reader's hand.
const OPEN_DELAY = 90;
const CLOSE_DELAY = 220;

export function ArchiveSidebar({ route, onNavigate }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const hoverTimer = useRef<number>();
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const visibleItems = useMemo(() => filterArchiveNavigation(query), [query]);
  // The rail slides over the page rather than pushing it, so there is no pinned
  // state to remember. Keyboard readers open it simply by tabbing into it.
  const expanded = hovered || focused;

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // A filter left behind in a collapsed rail would hide registers behind bare
  // marks for no visible reason, so the search clears as the rail closes.
  useEffect(() => {
    if (!expanded && !drawerOpen) setQuery('');
  }, [expanded, drawerOpen]);

  const hover = (next: boolean) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(next), next ? OPEN_DELAY : CLOSE_DELAY);
  };

  const collapse = () => {
    window.clearTimeout(hoverTimer.current);
    setHovered(false);
    setFocused(false);
    const active = document.activeElement;
    if (active instanceof HTMLElement && drawer.current?.contains(active)) active.blur();
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [route]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const first = drawer.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerOpen(false);
        menuButton.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !drawer.current) return;
      const focusable = Array.from(drawer.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const firstItem = focusable[0];
      const lastItem = focusable.at(-1);
      if (!firstItem || !lastItem) return;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const follow = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setDrawerOpen(false);
    collapse();
    onNavigate(href);
  };

  const groups = visibleItems.reduce<Map<string, typeof visibleItems>>((result, item) => {
    const current = result.get(item.group) ?? [];
    result.set(item.group, [...current, item]);
    return result;
  }, new Map());

  return (
    <>
      <button
        ref={menuButton}
        className="archive-menu"
        type="button"
        aria-expanded={drawerOpen}
        aria-controls="archive-sidebar"
        onClick={() => setDrawerOpen(true)}
      >
        <span aria-hidden>☰</span>
        <span>Archive navigation</span>
      </button>

      {drawerOpen && (
        <button
          className="archive-sidebar__backdrop"
          type="button"
          aria-label="Close archive navigation"
          onClick={() => {
            setDrawerOpen(false);
            menuButton.current?.focus();
          }}
        />
      )}

      <aside
        ref={drawer}
        id="archive-sidebar"
        className="archive-sidebar"
        data-expanded={expanded}
        data-open={drawerOpen}
        aria-label="Archive navigation panel"
        onMouseEnter={() => hover(true)}
        onMouseLeave={() => hover(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !drawerOpen && expanded) {
            event.preventDefault();
            collapse();
          }
        }}
      >
        <div className="archive-sidebar__head">
          <a
            className="archive-sidebar__identity"
            href="/"
            title={!expanded ? 'Thalmor Archives' : undefined}
            onClick={(event) => follow(event, '/')}
          >
            <img src="/seal.webp" alt="" width={42} height={42} />
            <span>Thalmor Archives</span>
          </a>
        </div>

        <div className="archive-sidebar__search">
          <button
            type="button"
            aria-label="Expand and find a register"
            title="Find a register"
            onClick={() => search.current?.focus()}
          >
            <span aria-hidden>⌕</span>
          </button>
          <label>
            <span className="sr-only">Find a register</span>
            <span aria-hidden>⌕</span>
            <input
              ref={search}
              type="search"
              value={query}
              placeholder="Find a register…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <nav id="archive-sidebar-navigation" aria-label="Volumes of the archive">
          {[...groups].map(([group, items]) => (
            <section className="archive-sidebar__group" key={group} aria-label={group}>
              <h2>{group}</h2>
              <ul>
                {items.map((item) => {
                  const active = navigationItemIsActive(route, item);
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={!expanded ? item.label : undefined}
                        title={!expanded ? item.label : undefined}
                        onClick={(event) => follow(event, item.href)}
                      >
                        <span className="archive-sidebar__mark" aria-hidden>
                          {item.slug ? (
                            <img
                              className="archive-sidebar__cover"
                              src={COVERS[item.slug]}
                              alt=""
                              width={COVER_W}
                              height={COVER_H}
                              decoding="async"
                              draggable={false}
                            />
                          ) : item.href === '/reports' ? (
                            // High Command's own golden seal, as on the hall.
                            <img
                              className="archive-sidebar__seal"
                              src={reportsSealUrl}
                              alt=""
                              width={512}
                              height={512}
                              decoding="async"
                              draggable={false}
                            />
                          ) : item.mark}
                        </span>
                        <span className="archive-sidebar__label">{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {visibleItems.length === 0 && (
            <p className="archive-sidebar__empty">No register bears that name.</p>
          )}
        </nav>
      </aside>
    </>
  );
}

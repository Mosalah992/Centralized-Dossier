// Links inside the room. A room link keeps a real href (middle-click and
// "copy link" work) but routes in-app, and remembers the rectangle it was
// clicked from so a takeover can grow out of it. Ported from the Bruma Joint
// Archives (src/nav.tsx).

import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent } from 'react';

import type { Navigate } from '../router';

export const NavContext = createContext<Navigate>(() => {});

export const useNavigate = () => useContext(NavContext);

/** Where the last takeover was opened from, in viewport pixels. */
let origin: DOMRect | null = null;
export const takeOrigin = () => origin;
export const setOrigin = (r: DOMRect | null) => {
  origin = r;
};

/** A plain left click, not a reader asking for a new tab or window. */
export const plainClick = (e: MouseEvent) =>
  !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = useNavigate();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (!plainClick(e)) return;
    e.preventDefault();
    setOrigin(e.currentTarget.getBoundingClientRect());
    navigate(href);
  };
  return <a href={href} onClick={handle} {...rest} />;
}

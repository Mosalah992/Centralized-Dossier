// A router small enough not to warrant a dependency: the archive has one index
// and six volumes. History API so URLs are shareable, with a Pages _redirects
// rule serving index.html for every path.

import { useCallback, useEffect, useState } from 'react';
import type { VolumeSlug } from '../../shared/types';
import { VOLUME_SLUGS } from '../../shared/volumes';

export type Route =
  | { name: 'shelf' }
  | { name: 'volume'; slug: VolumeSlug }
  | { name: 'missing' };

export function parse(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '');
  if (path === '' || path === '/') return { name: 'shelf' };

  const match = /^\/archives\/([a-z]+)$/.exec(path);
  const slug = match?.[1];
  if (slug && (VOLUME_SLUGS as readonly string[]).includes(slug)) {
    return { name: 'volume', slug: slug as VolumeSlug };
  }

  return { name: 'missing' };
}

export const hrefFor = (slug: VolumeSlug) => `/archives/${slug}`;

export function useRoute(): [Route, (href: string) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((href: string) => {
    if (href === window.location.pathname) return;
    window.history.pushState(null, '', href);
    setRoute(parse(href));
    // A new volume is a new page: start it at the top, but respect a reader
    // who has asked for less motion.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  return [route, navigate];
}

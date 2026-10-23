// A lazily loaded view that can also be fetched ahead of time.
//
// React.lazy suspends on its first render even when its chunk has long since
// arrived, which would put a loading notice between the old place and the new
// one in every scene change (transitions.ts). A view made here can be
// `preload`ed first; once it has arrived it renders at once, without going
// near Suspense. Before then it behaves exactly as React.lazy does.

import { createElement, lazy, type ComponentType } from 'react';

export type LazyView<P> = ComponentType<P> & { preload: () => Promise<unknown> };

export function lazyView<P extends object>(load: () => Promise<ComponentType<P>>): LazyView<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const fetch = () =>
    (pending ??= load().then(
      (component) => {
        loaded = component;
        return { default: component };
      },
      (error: unknown) => {
        // Let a later attempt try again, rather than failing forever.
        pending = null;
        throw error;
      },
    ));
  const Lazy = lazy(fetch);
  const View = (props: P) => createElement((loaded ?? Lazy) as ComponentType<P>, props);
  return Object.assign(View, { preload: fetch });
}

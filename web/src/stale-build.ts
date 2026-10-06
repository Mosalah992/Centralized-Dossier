// Recovering a tab that is running an older build than the server.
//
// Every volume is a lazy chunk with a content-hashed name. A tab opened before
// a deploy still asks for the OLD names, which the new deployment no longer
// has; and a request that lands mid-deploy can miss a NEW name for a moment.
// Either way the import fails, and a failed lazy import stays failed for the
// life of the tab — the reader is left with "could not be set out" until they
// think to reload. So the archive reloads for them, once.
//
// ONCE is the whole safety of this. A chunk that is genuinely broken would
// otherwise reload forever, so a reload is allowed only if the last one was
// more than a window ago, and never at all where sessionStorage is unavailable:
// a guard that cannot remember is no guard.

const KEY = 'thalmor.stale-build-reload';
const WINDOW_MS = 30_000;

/** True for the messages browsers give a failed dynamic import or preload. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS/i
    .test(message);
}

/** Whether a reload may happen now; records it if so. */
export function claimReload(storage: Pick<Storage, 'getItem' | 'setItem'>, now: number): boolean {
  const last = Number(storage.getItem(KEY) ?? 0);
  if (now - last < WINDOW_MS) return false;
  storage.setItem(KEY, String(now));
  return true;
}

/** Reload to pick up the current build, unless that was just tried. */
export function reloadForNewBuild(): boolean {
  let allowed = false;
  try {
    allowed = claimReload(window.sessionStorage, Date.now());
  } catch {
    return false;
  }
  if (allowed) window.location.reload();
  return allowed;
}

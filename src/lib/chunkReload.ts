import { lazy as reactLazy, type ComponentType } from 'react';

// After a new deploy, open tabs can ask for code files that no longer exist
// (Safari: "Importing a module script failed"). Reload once to pick up the new build.
const RELOAD_KEY = 'bookify-chunk-reload';
const CHUNK_ERROR = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk|Unable to preload CSS/i;

export const isChunkLoadError = (error: unknown) =>
  CHUNK_ERROR.test(String((error as Error)?.message || error || ''));

/** Reloads the page unless it already did so in the last 10s. Returns true when a reload started. */
export const reloadOnce = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage unavailable: still try once */ }
  window.location.reload();
  return true;
};

/** Drop-in replacement for React.lazy that recovers from stale deploy chunks. */
export function lazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return reactLazy(() =>
    factory().catch((error) => {
      // Keep Suspense pending while the page reloads instead of blanking the screen.
      if (isChunkLoadError(error) && reloadOnce()) return new Promise<{ default: T }>(() => {});
      throw error;
    }),
  );
}

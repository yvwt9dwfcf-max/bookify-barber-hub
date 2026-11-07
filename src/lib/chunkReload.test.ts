import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isChunkLoadError, reloadOnce } from './chunkReload';

describe('chunk reload recovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('recognises the Safari stale-deploy error', () => {
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads only once within 10 seconds to avoid a reload loop', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
    expect(reloadOnce()).toBe(true);
    expect(reloadOnce()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

import { useCallback, useEffect, useState } from 'react';
import { BUILD } from './stamp.generated';
import {
  compareBuilds,
  type BuildStamp,
  type BuildState,
} from './build-status';

/** Written by scripts/stamp-build.mjs into public/, so it ships with the deploy. */
const VERSION_URL = '/version.json';

/**
 * What this app is running, and whether the server has something newer.
 *
 * `BUILD` is compiled into the bundle, so it describes the code actually
 * executing - cached shell, old chunks and all. `version.json` is fetched from
 * the network every time, so it describes what the server would hand out to a
 * fresh visitor. The two together are the only honest answer to "am I looking
 * at the latest?", because the service worker never skipWaiting: a phone can
 * sit on an old bundle for days and look completely normal.
 */
export function useBuildStatus() {
  const [server, setServer] = useState<BuildStamp | null>(null);
  const [checking, setChecking] = useState(true);
  const [waiting, setWaiting] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      // no-store, and the service worker lets this URL past its cache-first
      // rule: a cached answer here would defeat the entire point.
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      setServer(res.ok ? ((await res.json()) as BuildStamp) : null);
    } catch {
      setServer(null);
    } finally {
      setChecking(false);
    }

    // Ask the browser to look for a new service worker too, so "update now"
    // has something to apply rather than only a red light.
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      setWaiting(!!reg?.waiting);
    } catch {
      /* no service worker (dev, or an unsupported browser) - not a failure */
    }
  }, []);

  useEffect(() => {
    void check();
    // Coming back to the app is exactly when the answer may have changed.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  const state: BuildState = compareBuilds(BUILD, server, { checking });

  /**
   * Take the newer version now.
   *
   * The service worker never calls skipWaiting on its own - that is what stops
   * a deploy swapping the app out mid-session, and what lets a migration land
   * safely one session ahead of the code. Asking for it BY HAND is a different
   * thing: it only ever moves forward, and the reload right after means no
   * half-old session is left running.
   */
  const update = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      const next = reg?.waiting;
      if (next) {
        const swapped = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => resolve(),
            { once: true }
          );
          // Never hang on a browser that does not fire it.
          window.setTimeout(resolve, 2000);
        });
        next.postMessage({ type: 'SKIP_WAITING' });
        await swapped;
      }
    } catch {
      /* fall through to the reload - it is the useful half anyway */
    }
    window.location.reload();
  }, []);

  return { local: BUILD, server, state, waiting, check, update };
}

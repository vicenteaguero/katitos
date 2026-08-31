import { useEffect, useRef, useState } from 'react';
import { shouldAutoUpdate, useBuildStatus } from '@kernel/build';
import { Spinner } from '@kernel/ui';

/** The version we already tried to apply, so a bad one cannot loop forever. */
const TRIED = 'katitos:update-tried';

/**
 * Take the newest version, without being asked.
 *
 * The service worker installs a new build and then waits for every tab to
 * close — which on an installed phone app is close to never. So the app could
 * run a bundle from days ago while the database had moved on, and the only clue
 * was something quietly not working. Now: on launch, if the server is serving a
 * different build, it applies it and reloads. Two seconds under the splash.
 *
 * Only on launch — and that is enforced, not just intended. The status hook
 * asks the server again every time the app comes back to the foreground, so
 * without a window the first "stale" could arrive an hour into a session and
 * reload the lesson she was half-way through writing. A version found later is
 * left for the Version row in Settings, because reloading someone mid-sentence
 * to save them four seconds is not a trade worth making.
 */
export function AutoUpdate() {
  const { state, server, update } = useBuildStatus();
  const [applying, setApplying] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    // Never in dev: the stamp changes with every commit, and reloading the app
    // out from under a test run or a hot reload helps nobody.
    if (!import.meta.env.PROD || fired.current) return;
    // performance.now() counts from this page's own load, so it is exactly
    // "how long since launch" — a backgrounded-and-resumed app keeps counting.
    if (
      !shouldAutoUpdate(
        state,
        server,
        sessionStorage.getItem(TRIED),
        performance.now()
      )
    )
      return;
    fired.current = true;
    try {
      sessionStorage.setItem(TRIED, server!.sha);
    } catch {
      /* private mode — the worst case is one extra attempt */
    }
    setApplying(true);
    void update();
  }, [state, server, update]);

  if (!applying) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[101] flex flex-col items-center justify-center gap-4"
      style={{
        background:
          'radial-gradient(90% 70% at 50% 40%, rgba(110,20,35,.35), transparent 70%), linear-gradient(168deg,#1a0b13 0%,#100408 60%,#0b0306 100%)',
      }}
    >
      <Spinner className="h-6 w-6" />
      <p className="font-display text-lg italic text-[#fbf5f0]">
        Updating Katitos…
      </p>
    </div>
  );
}

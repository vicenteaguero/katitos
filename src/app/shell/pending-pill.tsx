import { useEffect, useSyncExternalStore } from 'react';
import { onlineManager, useMutationState } from '@tanstack/react-query';

/**
 * The honest line about what has not reached the server.
 *
 * A write made offline waits in memory until the connection is back, and is
 * lost if the tab is closed or reloaded before then. So while there is one
 * waiting the app says so, in one line under the top bar, and asks before
 * the page is thrown away. Nothing else here pretends.
 */
export function PendingPill() {
  const online = useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline()
  );
  const paused = useMutationState({
    filters: { status: 'pending' },
    select: (m) => m.state.isPaused,
  }).filter(Boolean).length;

  // A reload would drop them. The browser asks; the wording is its own.
  useEffect(() => {
    if (!paused) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [paused]);

  if (online && !paused) return null;
  return (
    <p
      role="status"
      className="shrink-0 bg-warning/15 px-3 py-1 text-center font-sans text-xs text-fg"
    >
      {online ? 'Back online' : 'Offline'}
      {paused
        ? ` · ${paused} ${paused === 1 ? 'change' : 'changes'} not saved yet — keep the app open`
        : ' — what you see is from last time'}
    </p>
  );
}

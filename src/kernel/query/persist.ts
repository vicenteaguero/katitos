import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query';

/**
 * A tiny, dependency-free cache persister. React-Query keeps its cache in
 * memory only, so every PWA reload starts cold and re-fetches everything —
 * which is what made screens like Know-Me feel like they "take years" on a
 * fresh open. We snapshot the successful queries to localStorage and rehydrate
 * them on boot, so a reload paints last-known data instantly and revalidates in
 * the background.
 */
const KEY = 'katitos:rq-cache:v1';
const MAX_AGE = 24 * 60 * 60 * 1000; // a day — older snapshots are dropped
const WRITE_DEBOUNCE = 1000;

interface Snapshot {
  at: number;
  state: ReturnType<typeof dehydrate>;
}

/** Paint from the last snapshot, if it's fresh enough. Safe to call once on boot. */
export function hydrateFromStorage(qc: QueryClient): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const snap = JSON.parse(raw) as Snapshot;
    if (!snap?.at || Date.now() - snap.at > MAX_AGE) {
      localStorage.removeItem(KEY);
      return;
    }
    hydrate(qc, snap.state);
  } catch {
    // Corrupt/oversized snapshot — start cold rather than crash the boot.
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Begin mirroring successful queries to localStorage (debounced). Returns an unsubscribe. */
export function startPersisting(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    try {
      const state = dehydrate(qc, {
        // Only durable, successful reads — never pending/errored queries.
        shouldDehydrateQuery: (q) =>
          q.state.status === 'success' && q.state.data !== undefined,
      });
      const snap: Snapshot = { at: Date.now(), state };
      localStorage.setItem(KEY, JSON.stringify(snap));
    } catch {
      // Quota or serialization issue — drop the snapshot, keep the app alive.
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    }
  };

  const schedule = () => {
    if (timer) return;
    timer = setTimeout(flush, WRITE_DEBOUNCE);
  };

  const unsub = qc.getQueryCache().subscribe(schedule);
  return () => {
    unsub();
    if (timer) clearTimeout(timer);
  };
}

import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query';

/**
 * A tiny, dependency-free cache persister. React-Query keeps its cache in
 * memory only, so every PWA reload starts cold and re-fetches everything -
 * which is what made screens like Know-Me feel like they "take years" on a
 * fresh open. We snapshot the successful queries to localStorage and rehydrate
 * them on boot, so a reload paints last-known data instantly and revalidates in
 * the background.
 */
// The key MOVES WITH THE SHAPE of what we cache, because hydration bypasses
// the queryFn entirely: a stale snapshot is painted straight into new code.
//   v2 - the Long-Distance release (polaroids gained user_id/is_shared and
//        regroup by day; album books gained columns).
//   v3 - the album's pages stopped carrying `photos` and now carry `stickers`
//        (placements). A v2 snapshot would paint a page with no `stickers`
//        array at all, and the book iterates it during render - so the first
//        open after the update would throw instead of showing the album.
//   v4 - the albums were wiped and rebuilt: placements gained a shape, a crop
//        and a mount, books gained a material and a paper. A v3 snapshot would
//        paint the deleted books back onto the shelf, with pages made of
//        columns that no longer describe how anything looks.
//   v5 - the language keys moved: attempts and reviews left their parents'
//        prefixes. A v4 snapshot would keep copies under the old keys that
//        nothing invalidates any more.
const KEY = 'katitos:rq-cache:v5';
const MAX_AGE = 24 * 60 * 60 * 1000; // a day - older snapshots are dropped
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
    // Corrupt/oversized snapshot - start cold rather than crash the boot.
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Drop the snapshot - on sign-out, or when a different person signs in.
 *
 * The snapshot is painted before the server is asked, for whoever opens the
 * app next. On a shared computer that was the previous person's data, hidden
 * gifts included.
 */
export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Begin mirroring successful queries to localStorage (debounced). Returns an unsubscribe. */
export function startPersisting(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    try {
      const state = dehydrate(qc, {
        // Only durable, successful reads - never pending/errored queries, and
        // never signed URLs: they expire in an hour (so they'd rehydrate dead)
        // and they're long strings, two per photo. Persisting them pushed the
        // single snapshot toward the ~5 MB localStorage quota, at which point
        // the catch below drops the ENTIRE cache - losing the instant-paint we
        // came here for. Excluding them is what keeps the snapshot small.
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== 'success' || q.state.data === undefined) {
            return false;
          }
          const root = q.queryKey[0];
          return root !== 'signed-url' && root !== 'signed-urls';
        },
        // Never a mutation. The default keeps PAUSED ones - an answer given
        // offline - and on the next open rebuilds them with no function to
        // run, so they fail on the first reconnect and the homework is gone
        // while the snapshot had made it look safe. Until there is a real
        // outbox, offline writes are honestly in memory only.
        shouldDehydrateMutation: () => false,
      });
      const snap: Snapshot = { at: Date.now(), state };
      localStorage.setItem(KEY, JSON.stringify(snap));
    } catch {
      // Quota or serialization issue - drop the snapshot, keep the app alive.
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

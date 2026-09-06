/**
 * Run a batch of jobs a few at a time, reporting as each one lands.
 *
 * Emptying a camera roll into an album means twenty or thirty photos at once.
 * All at once is not an option: `createImageBitmap` on a handful of 12-megapixel
 * HEICs simultaneously is how an iOS tab gets killed. One at a time is a minute
 * of staring. So: a small window, and every result reported the moment it is
 * ready so the strip fills in while the rest are still going.
 *
 * A job that throws does NOT take the batch down with it - the one bad photo is
 * recorded as failed and the other twenty still arrive.
 */
export type JobState = 'queued' | 'working' | 'done' | 'failed';

export interface JobProgress<T> {
  index: number;
  item: T;
  state: JobState;
  error?: string;
}

export interface Settled<R> {
  index: number;
  value?: R;
  error?: string;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (p: JobProgress<T>) => void
): Promise<Settled<R>[]> {
  const results: Settled<R>[] = items.map((_, index) => ({ index }));
  if (!items.length) return results;
  // A limit of zero would spawn no workers and hang forever.
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;

  const worker = async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      onProgress?.({ index, item, state: 'working' });
      try {
        results[index] = { index, value: await fn(item, index) };
        onProgress?.({ index, item, state: 'done' });
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed';
        results[index] = { index, error };
        onProgress?.({ index, item, state: 'failed', error });
      }
    }
  };

  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

/** How far along a batch is, for one thin progress bar. */
export function batchProgress(states: readonly JobState[]): {
  done: number;
  failed: number;
  total: number;
  pct: number;
} {
  const done = states.filter((s) => s === 'done').length;
  const failed = states.filter((s) => s === 'failed').length;
  const total = states.length;
  return {
    done,
    failed,
    total,
    // Failures count as finished: the bar is "how much is left to wait for",
    // not "how much worked".
    pct: total ? Math.round(((done + failed) / total) * 100) : 0,
  };
}

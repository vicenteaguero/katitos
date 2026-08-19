import { describe, expect, it, vi } from 'vitest';
import {
  batchProgress,
  mapWithConcurrency,
  type JobState,
} from './upload-queue';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('returns every result in the original order', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      await tick(4 - n); // finish out of order on purpose
      return n * 10;
    });
    expect(out.map((r) => r.value)).toEqual([10, 20, 30, 40]);
  });

  it('never runs more than the limit at once', async () => {
    let live = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      live++;
      peak = Math.max(peak, live);
      await tick(1);
      live--;
    });
    expect(peak).toBe(2);
  });

  it('keeps going when one job fails, and says which', async () => {
    const out = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('bad photo');
      return n;
    });
    expect(out[0].value).toBe(1);
    expect(out[1].error).toBe('bad photo');
    expect(out[2].value).toBe(3);
  });

  it('reports each job as it starts and finishes', async () => {
    const seen: string[] = [];
    await mapWithConcurrency(
      ['a', 'b'],
      1,
      async (s) => s,
      (p) => seen.push(`${p.item}:${p.state}`)
    );
    expect(seen).toEqual(['a:working', 'a:done', 'b:working', 'b:done']);
  });

  it('does not hang on an empty batch or a nonsense limit', async () => {
    expect(await mapWithConcurrency([], 3, async (x) => x)).toEqual([]);
    const out = await mapWithConcurrency([1, 2], 0, async (n) => n);
    expect(out.map((r) => r.value)).toEqual([1, 2]);
  });

  it('does not start more workers than there are jobs', async () => {
    const fn = vi.fn(async (n: number) => n);
    await mapWithConcurrency([1], 8, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('batchProgress', () => {
  it('counts a failure as finished — the bar is about waiting, not success', () => {
    const states: JobState[] = ['done', 'failed', 'working', 'queued'];
    expect(batchProgress(states)).toEqual({
      done: 1,
      failed: 1,
      total: 4,
      pct: 50,
    });
  });

  it('is zero, not NaN, with nothing to do', () => {
    expect(batchProgress([]).pct).toBe(0);
  });
});

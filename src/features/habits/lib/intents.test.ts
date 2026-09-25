import { beforeEach, describe, expect, it } from 'vitest';
import { commit, useIntents, withIntents, type Write } from './intents';

/**
 * The tap, under abuse.
 *
 * The bug this file exists for: mark and unmark as fast as a thumb allows, the
 * screen looked right, and the row in the database did not match it. These tests
 * are the claim that the wrong answer is now unreachable rather than unlikely, so
 * they are written as abuse - three hundred taps, replies coming back out of
 * order, and a server snapshot from before the write.
 */

const KEY = 'habit:2026-09-26';

/** A database that is slow, and slower some times than others. */
function fakeDb(delays: number[] = [0]) {
  const state = { rows: new Set<string>(), writes: 0, inFlight: 0, peak: 0 };
  let nth = 0;
  const write: Write = async (on) => {
    state.writes += 1;
    state.inFlight += 1;
    state.peak = Math.max(state.peak, state.inFlight);
    const wait = delays[nth++ % delays.length];
    await new Promise((r) => setTimeout(r, wait));
    // Idempotent in both directions, exactly like the real one.
    if (on) state.rows.add(KEY);
    else state.rows.delete(KEY);
    state.inFlight -= 1;
  };
  return { state, write };
}

/** What the screen would show right now. */
function shown(server: Set<string> = new Set()): boolean {
  return withIntents(server, useIntents.getState().wanted).has(KEY);
}

/**
 * One press. `fallback` is what the render that drew the button believed you
 * wanted, which is where the old bug lived: on a fast second tap that belief is
 * stale, so it is only ever a fallback.
 */
function tap(fallback = true): boolean {
  return useIntents.getState().flip(KEY, fallback);
}

beforeEach(() => {
  useIntents.setState({ wanted: {} });
});

describe('the wish', () => {
  it('flips from itself, not from a render that is a beat behind', () => {
    // All three happen inside one frame, so all three pass the same stale hint.
    expect(tap(true)).toBe(true);
    expect(tap(true)).toBe(false);
    expect(tap(true)).toBe(true);
  });

  it('is never dropped by a snapshot taken before the write', () => {
    tap(); // on, and still pending
    // A refetch that started before the insert lands comes back without the row.
    useIntents.getState().settle(new Set());
    expect(useIntents.getState().wanted[KEY]?.on).toBe(true);
    expect(shown(new Set())).toBe(true);
  });

  it('is dropped once the write is confirmed and the server agrees', () => {
    tap();
    useIntents.getState().confirm(KEY, true);
    useIntents.getState().settle(new Set([KEY]));
    expect(useIntents.getState().wanted[KEY]).toBeUndefined();
    expect(shown(new Set([KEY]))).toBe(true);
  });

  it('survives a confirmation of something it no longer wants', () => {
    tap(); // on
    tap(); // off again, while the "on" is in the air
    useIntents.getState().confirm(KEY, true); // the old write lands
    const wish = useIntents.getState().wanted[KEY];
    expect(wish).toEqual({ on: false, pending: true });
  });
});

describe('the writer', () => {
  it('lands on the last tap, and only writes twice, for 300 taps', async () => {
    const { state, write } = fakeDb([5]);
    const refused: unknown[] = [];

    let last = false;
    for (let i = 0; i < 300; i++) {
      last = tap();
      void commit(KEY, write, (e) => refused.push(e));
      // The screen always shows the tap that just happened.
      expect(shown()).toBe(last);
    }

    await Promise.all([commit(KEY, write, (e) => refused.push(e))]);
    // The loop may still owe one more turn; give it room to finish.
    await new Promise((r) => setTimeout(r, 40));

    expect(refused).toEqual([]);
    expect(state.rows.has(KEY)).toBe(last);
    expect(shown(state.rows)).toBe(last);
    // One write in the air for the first wish, one for wherever it ended up.
    expect(state.writes).toBeLessThanOrEqual(2);
    expect(state.peak).toBe(1);
  });

  it('never has two writes in the air for one square', async () => {
    const { state, write } = fakeDb([20, 1, 15, 2]);
    const runs: Promise<unknown>[] = [];
    for (let i = 0; i < 40; i++) {
      tap();
      runs.push(commit(KEY, write, () => {}));
      await new Promise((r) => setTimeout(r, 1));
    }
    await Promise.all(runs);
    await new Promise((r) => setTimeout(r, 60));
    expect(state.peak).toBe(1);
    expect(state.rows.has(KEY)).toBe(wishNow());
  });

  it('ends where the thumb ended even when the wish moves mid-flight', async () => {
    const { state, write } = fakeDb([30]);
    tap(); // on
    const first = commit(KEY, write, () => {});
    await new Promise((r) => setTimeout(r, 5)); // the insert is in the air
    tap(); // off, before it lands
    void commit(KEY, write, () => {});
    await first;
    await new Promise((r) => setTimeout(r, 60));
    expect(state.rows.has(KEY)).toBe(false);
    expect(state.writes).toBe(2);
  });

  it('gives the square back to the server when the database refuses', async () => {
    const refused: unknown[] = [];
    const write: Write = async () => {
      throw { hint: 'day_closed' };
    };
    tap();
    await commit(KEY, write, (e) => refused.push(e));
    expect(refused).toHaveLength(1);
    expect(useIntents.getState().wanted[KEY]).toBeUndefined();
    expect(shown(new Set())).toBe(false);
  });

  it('reports the state it wrote once, and null to whoever joined it', async () => {
    const { write } = fakeDb([10]);
    tap();
    const owner = commit(KEY, write, () => {});
    const joiner = commit(KEY, write, () => {});
    expect(await owner).toBe(true);
    expect(await joiner).toBe(null);
  });
});

/** Whatever the store ended up wanting, for the assertions above. */
function wishNow(): boolean {
  const wish = useIntents.getState().wanted[KEY];
  return wish ? wish.on : true;
}

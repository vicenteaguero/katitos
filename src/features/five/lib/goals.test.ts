import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIVE_OPEN, GOAL_IDS, GOALS, goalById } from './goals';

/**
 * The five live in two files - this one, and the scheduler's copy in
 * `supabase/functions/_shared/five-goals.ts`, which runs in Deno and cannot
 * import anything from the bundle. Two copies of a constant is a drift waiting
 * to happen, and the drift would be expensive: a goal id the app writes and the
 * scheduler never settles is three dollars that vanish, and a FIVE_OPEN that is
 * true on one side is a push landing on her phone before she has been told this
 * exists.
 *
 * So the copy is read from disk and compared, rather than trusted.
 */
const scheduler = readFileSync(
  resolve(__dirname, '../../../../supabase/functions/_shared/five-goals.ts'),
  'utf8'
);

describe('the app and the scheduler agree', () => {
  it('on the same five goals, in the same order', () => {
    const ids = [...scheduler.matchAll(/^\s{4}id: '([a-z]+)',$/gm)].map(
      (m) => m[1]
    );
    expect(ids).toEqual(GOAL_IDS);
  });

  it('on their labels', () => {
    const labels = [...scheduler.matchAll(/^\s{4}label: '([^']+)',$/gm)].map(
      (m) => m[1]
    );
    expect(new Set(labels)).toEqual(new Set(GOALS.map((g) => g.label)));
  });

  it('on whether she can see any of this yet', () => {
    const open = /export const FIVE_OPEN = (true|false);/.exec(scheduler)?.[1];
    expect(open).toBe(String(FIVE_OPEN));
  });

  it("on there being no window of the Five's own", () => {
    // A goal is a habit and a tick is a habit entry, so the only window is the
    // streak's. Neither copy may quietly grow a second one.
    expect(scheduler).not.toMatch(/GRACE_HOUR/);
  });

  it('gives every goal the same window, and that window is one day', () => {
    // All five share it now: the nudges land at random hours across her whole
    // day rather than each inside the slot where its goal "belongs".
    const shared = scheduler.match(/window: \[DAY_FROM, DAY_TO\]/g) ?? [];
    expect(shared).toHaveLength(GOAL_IDS.length);

    const from = Number(
      /export const DAY_FROM = ([\d.]+);/.exec(scheduler)?.[1]
    );
    const to = Number(/export const DAY_TO = ([\d.]+);/.exec(scheduler)?.[1]);
    expect(from).toBeGreaterThanOrEqual(0);
    expect(to).toBeLessThan(24);
    expect(to).toBeGreaterThan(from);
    // Wide enough that five spaced stretches are still more than an hour each.
    expect((to - from) / GOAL_IDS.length).toBeGreaterThan(1);
  });

  it('gives every goal more than one thing to say', () => {
    const pools = scheduler.match(/nudges: \[/g) ?? [];
    expect(pools).toHaveLength(GOAL_IDS.length);
  });
});

describe('the five themselves', () => {
  it('are five', () => {
    expect(GOALS).toHaveLength(5);
  });

  it('are the ones she asked for', () => {
    expect(GOAL_IDS).toEqual(['sleep', 'work', 'study', 'eat', 'move']);
  });

  it('each have a hint that says what counts', () => {
    for (const goal of GOALS) {
      expect(goal.hint.length).toBeGreaterThan(8);
      expect(goal.emoji).not.toBe('');
    }
  });

  it('are looked up by id, and unknown ids are simply unknown', () => {
    expect(goalById('move')?.label).toBe('Walk or train');
    expect(goalById('yoga')).toBeUndefined();
  });
});

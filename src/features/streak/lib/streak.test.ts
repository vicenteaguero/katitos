import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  activeOn,
  computeStreak,
  dayStatus,
  daysToNextSlot,
  longestStreak,
  slotsAllowed,
  tickKey,
  weeklyProgress,
  type HabitLike,
} from './streak';

const SCL = 'America/Santiago';
const NSK = 'Asia/Novosibirsk';
const NOW = DateTime.fromISO('2026-09-07T20:00:00Z'); // Mon in Curicó, Tue in Novosibirsk
const FURTHEST = '2026-09-08';
const V = 'vicente';
const A = 'anastasia';

function habit(over: Partial<HabitLike> & { id: string }): HabitLike {
  return {
    user_id: null,
    kind: 'personal',
    schedule: 'daily',
    target_per_week: 1,
    effective_from: '2026-08-01',
    archived_at: null,
    ...over,
  };
}

const CALL = habit({ id: 'call', kind: 'shared', user_id: null });
const HIS = habit({ id: 'his', user_id: V });
const HERS = habit({ id: 'hers', user_id: A });
const DAILY = [CALL, HIS, HERS];

function ticks(
  days: string[],
  habits: string[] = ['call', 'his', 'hers']
): Set<string> {
  const set = new Set<string>();
  for (const d of days) for (const h of habits) set.add(tickKey(h, d));
  return set;
}

function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (
    let d = from;
    d <= to;
    d = DateTime.fromISO(`${d}T00:00:00Z`, { zone: 'utc' })
      .plus({ days: 1 })
      .toISODate()!
  ) {
    out.push(d);
  }
  return out;
}

const base = {
  selfId: V,
  partnerId: A,
  selfZone: SCL,
  partnerZone: NSK,
  furthest: FURTHEST,
  now: NOW,
};

describe('a day', () => {
  it('is complete only when both of us and the call are in', () => {
    const done = ticks(['2026-09-05']);
    expect(dayStatus('2026-09-05', DAILY, done, V, A).complete).toBe(true);
  });

  it('is his fault or hers, and the calendar can tell which', () => {
    const done = ticks(['2026-09-05'], ['call', 'his']);
    const st = dayStatus('2026-09-05', DAILY, done, V, A);
    expect(st.complete).toBe(false);
    expect(st.mine).toEqual({ required: 1, done: 1 });
    expect(st.theirs).toEqual({ required: 1, done: 0 });
    expect(st.shared).toBe(true);
  });

  it('does not ask for a habit that had not started yet', () => {
    const late = habit({
      id: 'late',
      user_id: V,
      effective_from: '2026-09-08',
    });
    expect(activeOn(late, '2026-09-07')).toBe(false);
    const done = ticks(['2026-09-07']);
    expect(dayStatus('2026-09-07', [...DAILY, late], done, V, A).complete).toBe(
      true
    );
  });

  it('does not retroactively fail the days before a habit was put away', () => {
    const gone = habit({
      id: 'gone',
      user_id: V,
      archived_at: '2026-09-03T10:00:00Z',
    });
    expect(activeOn(gone, '2026-09-02')).toBe(true);
    expect(activeOn(gone, '2026-09-03')).toBe(false);
  });
});

describe('the streak', () => {
  it('counts the days in a row', () => {
    const done = ticks(range('2026-09-01', '2026-09-07'));
    expect(computeStreak({ ...base, habits: DAILY, done }).days).toBe(7);
  });

  it('does not die every morning just because today is not done yet', () => {
    const done = ticks(range('2026-09-01', '2026-09-06'));
    // 07 and 08 are still open and empty. Neither counts nor breaks.
    expect(computeStreak({ ...base, habits: DAILY, done }).days).toBe(6);
  });

  it('is lost by both when one of us misses a single day', () => {
    const done = ticks(range('2026-09-01', '2026-09-07'));
    done.delete(tickKey('hers', '2026-09-04'));
    expect(computeStreak({ ...base, habits: DAILY, done }).days).toBe(3);
  });

  it('is lost when nobody marked the call', () => {
    const done = ticks(range('2026-09-01', '2026-09-07'));
    done.delete(tickKey('call', '2026-09-05'));
    expect(computeStreak({ ...base, habits: DAILY, done }).days).toBe(2);
  });

  it('starts at zero with nothing ticked', () => {
    expect(
      computeStreak({ ...base, habits: DAILY, done: new Set() }).days
    ).toBe(0);
  });

  it('does not count the days before there was anything to keep', () => {
    // Every habit starts today, so yesterday had nothing due on it. A day with
    // no habits must not read as a perfect day, or the streak is infinite.
    const fresh = DAILY.map((h) => ({ ...h, effective_from: '2026-09-07' }));
    const done = ticks(['2026-09-07']);
    expect(dayStatus('2026-09-06', fresh, done, V, A).complete).toBe(false);
    expect(computeStreak({ ...base, habits: fresh, done }).days).toBe(1);
  });

  it('remembers the best run we ever had', () => {
    const done = ticks(range('2026-08-10', '2026-08-20'));
    for (const d of range('2026-09-01', '2026-09-07')) {
      for (const h of ['call', 'his', 'hers']) done.add(tickKey(h, d));
    }
    expect(longestStreak(DAILY, done, V, A, FURTHEST)).toBe(11);
  });
});

describe('a habit done three times a week', () => {
  const GYM = habit({
    id: 'gym',
    user_id: V,
    schedule: 'weekly',
    target_per_week: 3,
    effective_from: '2026-09-07',
  });
  const habits = [...DAILY, GYM];

  it('counts up as you go', () => {
    const done = ticks(['2026-09-07'], ['gym']);
    expect(weeklyProgress(GYM, '2026-09-08', done)).toMatchObject({
      done: 1,
      target: 3,
      met: false,
    });
  });

  it('never breaks a single day', () => {
    const done = ticks(range('2026-09-01', '2026-09-07'));
    expect(dayStatus('2026-09-07', habits, done, V, A).complete).toBe(true);
  });

  it('holds this week at stake until the third one is in', () => {
    const done = ticks(range('2026-09-01', '2026-09-08'));
    done.add(tickKey('gym', '2026-09-07'));
    const r = computeStreak({ ...base, habits, done });
    // Mon 07 and Tue 08 are lived but not banked; the week before is clean.
    expect(r.days).toBe(6);
    expect(r.atStake).toBe(2);
  });

  it('banks the week the moment the count is made', () => {
    const done = ticks(range('2026-09-01', '2026-09-08'));
    for (const d of ['2026-09-07', '2026-09-08']) done.add(tickKey('gym', d));
    done.add(tickKey('gym', '2026-09-09'));
    const r = computeStreak({ ...base, habits, done });
    expect(r.days).toBe(8);
    expect(r.atStake).toBe(0);
  });

  it('ends the streak at a week that closed short', () => {
    const older = habit({
      id: 'gym',
      user_id: V,
      schedule: 'weekly',
      target_per_week: 3,
      effective_from: '2026-08-01',
    });
    const done = ticks(range('2026-09-01', '2026-09-08'));
    // Nothing at the gym in the week of 31 Aug, and that week is over: the run
    // cannot reach back past it, however clean those six days look.
    const r = computeStreak({ ...base, habits: [...DAILY, older], done });
    expect(r.days).toBe(0);
    expect(r.atStake).toBe(2);
    expect(r.from).toBe('2026-09-07');
  });
});

describe('the slots', () => {
  it('opens one at a time, at seven, fourteen and twenty-one', () => {
    expect(slotsAllowed(0)).toBe(1);
    expect(slotsAllowed(6)).toBe(1);
    expect(slotsAllowed(7)).toBe(2);
    expect(slotsAllowed(13)).toBe(2);
    expect(slotsAllowed(14)).toBe(3);
    expect(slotsAllowed(21)).toBe(4);
    expect(slotsAllowed(400)).toBe(4);
  });

  it('says how far away the next one is', () => {
    expect(daysToNextSlot(0, 1)).toBe(7);
    expect(daysToNextSlot(9, 2)).toBe(5);
    expect(daysToNextSlot(30, 3)).toBe(0);
    expect(daysToNextSlot(30, 4)).toBeNull();
  });
});

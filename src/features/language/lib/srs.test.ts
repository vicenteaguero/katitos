import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { ReviewState } from './srs';
import { buildSession, isDue, mastery, schedule, type Schedule } from './srs';

const TODAY = DateTime.fromISO('2026-08-11T12:00:00Z', { zone: 'utc' });

function sched(over: Partial<Schedule> = {}): Schedule {
  return {
    ease: 2.5,
    interval_days: 0,
    due_on: '2026-08-11',
    reps: 0,
    lapses: 0,
    ...over,
  };
}

function review(over: Partial<ReviewState> = {}): ReviewState {
  return {
    ease: 2.5,
    interval_days: 0,
    due_on: '2026-08-11',
    reps: 0,
    lapses: 0,
    last_grade: null,
    last_seen_at: null,
    ...over,
  } as ReviewState;
}

describe('schedule', () => {
  it('brings a blanked card straight back today', () => {
    const next = schedule(sched({ interval_days: 30, reps: 5 }), 0, TODAY);
    expect(next.interval_days).toBe(0);
    expect(next.due_on).toBe('2026-08-11');
    expect(next.reps).toBe(0);
    expect(next.lapses).toBe(1);
  });

  it('makes a forgotten card easier to trigger next time', () => {
    const next = schedule(sched({ ease: 2.5 }), 0, TODAY);
    expect(next.ease).toBeLessThan(2.5);
  });

  it('walks a new card 1 day, then 3, then by ease', () => {
    const first = schedule(null, 2, TODAY);
    expect(first.interval_days).toBe(1);
    const second = schedule(first, 2, TODAY);
    expect(second.interval_days).toBe(3);
    const third = schedule(second, 2, TODAY);
    // 3 days × ease (2.6 after two good answers) ≈ 8
    expect(third.interval_days).toBeGreaterThan(3);
  });

  it('never gives a long gap for a shaky answer', () => {
    const next = schedule(sched({ interval_days: 30, reps: 6 }), 1, TODAY);
    expect(next.interval_days).toBeLessThan(30);
    expect(next.interval_days).toBeGreaterThan(0);
  });

  it('keeps ease inside its bounds however badly it goes', () => {
    let s = sched();
    for (let i = 0; i < 30; i++) s = schedule(s, 0, TODAY);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);

    let good = sched();
    for (let i = 0; i < 30; i++) good = schedule(good, 2, TODAY);
    expect(good.ease).toBeLessThanOrEqual(3.5);
  });

  it('caps the interval so she can always reteach something', () => {
    let s = sched();
    for (let i = 0; i < 40; i++) s = schedule(s, 2, TODAY);
    expect(s.interval_days).toBeLessThanOrEqual(180);
  });

  it('always sets due_on to match the interval it just chose', () => {
    const next = schedule(sched({ interval_days: 3, reps: 2 }), 2, TODAY);
    expect(next.due_on).toBe(
      TODAY.plus({ days: next.interval_days }).toISODate()
    );
  });

  it('counts a lapse only when the card was actually blanked', () => {
    expect(schedule(sched(), 1, TODAY).lapses).toBe(0);
    expect(schedule(sched(), 2, TODAY).lapses).toBe(0);
    expect(schedule(sched(), 0, TODAY).lapses).toBe(1);
  });
});

describe('isDue', () => {
  it('treats a card you have never seen as due', () => {
    expect(isDue(null, TODAY)).toBe(true);
  });

  it('is due on the day itself, not the day after', () => {
    expect(isDue(review({ due_on: '2026-08-11' }), TODAY)).toBe(true);
  });

  it('is not due tomorrow', () => {
    expect(isDue(review({ due_on: '2026-08-12' }), TODAY)).toBe(false);
  });

  it('is still due when overdue', () => {
    expect(isDue(review({ due_on: '2026-07-01' }), TODAY)).toBe(true);
  });
});

describe('mastery', () => {
  it('calls an unseen card new', () => {
    expect(mastery(null)).toBe('new');
    expect(mastery(review({ reps: 0 }))).toBe('new');
  });

  it('calls a card known once it survives a week', () => {
    expect(mastery(review({ reps: 3, interval_days: 7 }))).toBe('known');
    expect(mastery(review({ reps: 3, interval_days: 6 }))).toBe('learning');
  });
});

describe('buildSession', () => {
  const cards = [
    { id: 'unseen' },
    { id: 'forgotten' },
    { id: 'steady' },
    { id: 'not-yet' },
  ];
  const reviews = new Map<string, ReviewState>([
    [
      'forgotten',
      review({
        reps: 4,
        lapses: 2,
        due_on: '2026-08-01',
      }),
    ],
    ['steady', review({ reps: 4, due_on: '2026-08-10' })],
    ['not-yet', review({ reps: 4, due_on: '2026-09-01' })],
  ]);

  it('leaves out what is not due yet', () => {
    const s = buildSession(cards, reviews, { today: TODAY });
    expect(s.map((c) => c.id)).not.toContain('not-yet');
  });

  it('puts the ones he has forgotten before the ones he knows', () => {
    const s = buildSession(cards, reviews, { today: TODAY });
    expect(s[0].id).toBe('forgotten');
  });

  it('saves brand-new cards for last so revision comes first', () => {
    const s = buildSession(cards, reviews, { today: TODAY });
    expect(s[s.length - 1].id).toBe('unseen');
  });

  it('keeps a session short enough to finish', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` }));
    expect(buildSession(many, new Map(), { today: TODAY })).toHaveLength(20);
  });

  it('returns nothing when everything is scheduled ahead', () => {
    const ahead = new Map([['a', review({ due_on: '2026-12-01' })]]);
    expect(buildSession([{ id: 'a' }], ahead, { today: TODAY })).toEqual([]);
  });
});

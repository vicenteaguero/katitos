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
    // EXACTLY 3 × ease. `toBeGreaterThan(3)` passed just as well when the
    // interval was multiplied by a flat constant instead of by the card's own
    // ease, which is the whole idea of spaced repetition.
    expect(third.interval_days).toBe(Math.round(3 * second.ease));
  });

  it('halves the gap for a shaky answer — not a quarter, not a third', () => {
    const next = schedule(sched({ interval_days: 30, reps: 6 }), 1, TODAY);
    expect(next.interval_days).toBe(15);
  });

  it('keeps ease inside its bounds however badly it goes', () => {
    let s = sched();
    for (let i = 0; i < 30; i++) s = schedule(s, 0, TODAY);
    // Pinned to the floor exactly — this is the value the database CHECK has
    // to accept, and it once didn't.
    expect(s.ease).toBe(1.3);

    let good = sched();
    for (let i = 0; i < 30; i++) good = schedule(good, 2, TODAY);
    expect(good.ease).toBe(3.5);
  });

  it('caps the interval so she can always reteach something', () => {
    let s = sched();
    for (let i = 0; i < 40; i++) s = schedule(s, 2, TODAY);
    expect(s.interval_days).toBe(180);
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
        last_grade: 0,
        due_on: '2026-08-01',
      }),
    ],
    ['steady', review({ reps: 4, due_on: '2026-08-10' })],
    ['not-yet', review({ reps: 4, due_on: '2026-09-01' })],
  ]);

  it('lets a word forgotten long ago back into the normal band', () => {
    const healed = new Map(reviews);
    healed.set(
      'forgotten',
      review({ reps: 4, lapses: 2, last_grade: 2, due_on: '2026-08-01' })
    );
    const s = buildSession(cards, healed, { today: TODAY });
    // Still due, still in — but ordered by its date like any other review.
    expect(s.map((c) => c.id).indexOf('forgotten')).toBeGreaterThanOrEqual(0);
    expect(s[0].id).toBe('forgotten'); // the longest overdue of the band
  });

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

describe('a course keeps teaching', () => {
  const many = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));

  it('always makes room for a few new words', () => {
    // Twenty-five words already due, and five she has just taught. Ranking
    // unseen cards last meant the new ones never appeared at all.
    const seen = many(25, 'old');
    const fresh = many(5, 'new');
    const reviews = new Map(
      seen.map((c) => [c.id, review({ reps: 3, due_on: '2026-08-01' })])
    );
    const out = buildSession([...seen, ...fresh], reviews, { today: TODAY });
    expect(out).toHaveLength(20);
    expect(out.filter((c) => c.id.startsWith('new'))).toHaveLength(5);
  });

  it('fills a whole session when there is nothing else to review', () => {
    // A beginner with an empty history should get a full session, not five
    // words — the reservation exists to stop reviews CROWDING OUT new words,
    // not to ration them.
    const out = buildSession(many(50, 'new'), new Map(), { today: TODAY });
    expect(out).toHaveLength(20);
  });

  it('lets a few new words in even when reviews could fill the session', () => {
    // A deliberate trade: five reviews wait until tomorrow so that what she
    // taught today is actually seen. Reviews still take the large majority.
    const seen = many(18, 'old');
    const reviews = new Map(
      seen.map((c) => [c.id, review({ reps: 3, due_on: '2026-08-01' })])
    );
    const out = buildSession([...seen, ...many(30, 'new')], reviews, {
      today: TODAY,
    });
    expect(out).toHaveLength(20);
    expect(out.filter((c) => c.id.startsWith('new'))).toHaveLength(5);
    expect(out.filter((c) => c.id.startsWith('old'))).toHaveLength(15);
  });

  it('lets her ask for a different number of new words', () => {
    const seen = many(30, 'old');
    const reviews = new Map(
      seen.map((c) => [c.id, review({ reps: 3, due_on: '2026-08-01' })])
    );
    const out = buildSession([...seen, ...many(10, 'new')], reviews, {
      today: TODAY,
      newPerSession: 0,
    });
    // Nothing new at all when the schedule is what matters.
    expect(out.filter((c) => c.id.startsWith('new'))).toHaveLength(0);
  });

  it('still puts what he forgot first', () => {
    const cards = [{ id: 'fresh' }, { id: 'lapsed' }, { id: 'steady' }];
    const reviews = new Map([
      ['lapsed', review({ reps: 4, lapses: 2, due_on: '2026-08-01' })],
      ['steady', review({ reps: 4, due_on: '2026-08-05' })],
    ]);
    const out = buildSession(cards, reviews, { today: TODAY });
    expect(out[0].id).toBe('lapsed');
    expect(out[out.length - 1].id).toBe('fresh');
  });
});

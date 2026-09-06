import { DateTime } from '@kernel/lib';

/**
 * The scheduling state of one word for one person.
 *
 * Structural on purpose: the same maths served the old `phrase_reviews` table
 * and now serves `lang_vocab_reviews`, and it should keep working for whatever
 * the next table is called.
 */
export interface ReviewState {
  ease: number;
  interval_days: number;
  due_on: string;
  reps: number;
  lapses: number;
  last_grade?: number | null;
  last_seen_at?: string | null;
}

/** What you did with a card. Three buttons, not six - this is a phone. */
export type Grade =
  | 0 // blank - no idea
  | 1 // shaky - got there, slowly
  | 2; // knew it

/** The scheduling state we care about; the rest of the row is bookkeeping. */
export interface Schedule {
  ease: number;
  interval_days: number;
  due_on: string;
  reps: number;
  lapses: number;
}

const MIN_EASE = 1.3;
const MAX_EASE = 3.5;
/** Never push a card further out than this - she may reteach it any time. */
const MAX_INTERVAL = 180;

const FRESH: Schedule = {
  ease: 2.5,
  interval_days: 0,
  due_on: '',
  reps: 0,
  lapses: 0,
};

/**
 * SM-2, trimmed to what a couple actually needs.
 *
 * The full algorithm has six grades and a fussy ease formula; almost all of its
 * value comes from two ideas - get it right and the gap grows, get it wrong and
 * you see it again today. That's what this keeps.
 *
 * Pure and injectable so the intervals are unit-tested rather than hoped at.
 */
export function schedule(
  prev: Schedule | null,
  grade: Grade,
  today: DateTime = DateTime.now()
): Schedule {
  const base = prev ?? FRESH;
  const day = (n: number) => today.plus({ days: n }).toISODate()!;

  // Blanked: it comes back today, and the card is marked as harder.
  if (grade === 0) {
    return {
      ease: clampEase(base.ease - 0.2),
      interval_days: 0,
      due_on: day(0),
      reps: 0,
      lapses: base.lapses + 1,
    };
  }

  // Shaky: a short step, and slightly harder. Never a long gap on a maybe.
  if (grade === 1) {
    const next =
      base.interval_days <= 1 ? 1 : Math.ceil(base.interval_days / 2);
    return {
      ease: clampEase(base.ease - 0.05),
      interval_days: next,
      due_on: day(next),
      reps: base.reps + 1,
      lapses: base.lapses,
    };
  }

  // Knew it: 1 day, then 3, then multiply by ease. Standard, and it works.
  const reps = base.reps + 1;
  const next =
    reps === 1
      ? 1
      : reps === 2
        ? 3
        : Math.min(MAX_INTERVAL, Math.round(base.interval_days * base.ease));

  return {
    ease: clampEase(base.ease + 0.1),
    interval_days: next,
    due_on: day(next),
    reps,
    lapses: base.lapses,
  };
}

function clampEase(v: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(v * 100) / 100));
}

/** Is this card waiting to be studied today? An unseen card always is. */
export function isDue(
  review: Pick<ReviewState, 'due_on'> | null | undefined,
  today: DateTime = DateTime.now()
): boolean {
  if (!review) return true;
  return review.due_on <= today.toISODate()!;
}

/**
 * How well a card is known, for the progress ring.
 * A card is "learned" once it survives a week between reviews.
 */
export type Mastery = 'new' | 'learning' | 'known';

export function mastery(
  review: Pick<ReviewState, 'interval_days' | 'reps'> | null | undefined
): Mastery {
  if (!review || review.reps === 0) return 'new';
  return review.interval_days >= 7 ? 'known' : 'learning';
}

/**
 * Today's session, hardest first.
 *
 * Cards you have never seen come last on purpose: clearing what you already
 * half-know is what actually makes it stick, and it stops a big new deck from
 * burying yesterday's mistakes.
 */
export function buildSession<T extends { id: string }>(
  cards: T[],
  reviews: Map<string, ReviewState>,
  {
    limit = 20,
    newPerSession = 5,
    today = DateTime.now(),
  }: { limit?: number; newPerSession?: number; today?: DateTime } = {}
): T[] {
  const due = cards.filter((c) => isDue(reviews.get(c.id), today));
  const isNew = (c: T) => {
    const r = reviews.get(c.id);
    return !r || r.reps === 0;
  };
  const rank = (c: T) => {
    const r = reviews.get(c.id);
    if (isNew(c)) return 2; // unseen - last
    // Forgotten RECENTLY - the last answer was a blank, or it lapsed and has
    // not yet been got right three times since. A word forgotten once in
    // March used to be pinned to the front of every session for good.
    if (r!.last_grade === 0 || (r!.lapses > 0 && r!.reps < 3)) return 0;
    return 1;
  };
  const byUrgency = (a: T, b: T) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    // Within a band, the longest overdue first.
    const ra = reviews.get(a.id)?.due_on ?? '9999-12-31';
    const rb = reviews.get(b.id)?.due_on ?? '9999-12-31';
    return ra < rb ? -1 : ra > rb ? 1 : 0;
  };

  /**
   * A few new words ALWAYS get in.
   *
   * Ranking unseen cards last is right for remembering, but it starves a
   * course: once twenty reviews come due each day, nothing she teaches ever
   * enters the rotation. So a handful of places are held for new words, and
   * the rest of the session is the schedule as before.
   */
  const fresh = due.filter(isNew).sort(byUrgency);
  const seen = due.filter((c) => !isNew(c)).sort(byUrgency);

  // Hold a few places for new words BEFORE filling up with reviews…
  const held = fresh.slice(0, Math.min(newPerSession, limit));
  const out = [...held, ...seen.slice(0, limit - held.length)];
  // …and if the reviews didn't fill the session, keep going with new ones
  // rather than handing back a short session.
  if (out.length < limit) {
    out.push(...fresh.slice(held.length, held.length + (limit - out.length)));
  }
  return out.sort(byUrgency);
}

import { GOAL_IDS, type GoalId } from './goals';

/**
 * Where a day's money goes.
 *
 * The rule is one sentence and it is lopsided on purpose: a goal she held puts a
 * dollar in her gift pot, a goal she missed puts three in the pot he bets on
 * sport. A miss costs three times what a win pays, so what pulls is the loss and
 * not the prize - which is the only reason a tracker like this works on someone
 * who is already tired of being scored.
 *
 * Two things stop the money entirely, and they are the reason this file exists
 * separately from the screen: a hard day, and a paused Five. Neither is a zero
 * day. Nothing moves at all - no gift, no burn, no row in the ledger - because a
 * day she called hard is not a day she failed, and a switch she turned off is not
 * consent she withdrew from halfway.
 *
 * The scheduler (`supabase/functions/five/index.ts`) and `five_reconcile_day()`
 * write the ledger from exactly this rule. This is the copy the screen projects
 * today's split with, before any of it is real.
 */

export interface Stakes {
  /** Cents to her gift pot, per goal held. */
  giftCents: number;
  /** Cents to the bookmaker, per goal missed. */
  betCents: number;
}

export const DEFAULT_STAKES: Stakes = { giftCents: 100, betCents: 300 };

export interface DayInput {
  /** The goals with a live, unrevoked mark on this day. */
  done: Iterable<GoalId | string>;
  hardDay?: boolean;
  paused?: boolean;
  stakes?: Stakes;
}

export interface DaySplit {
  done: GoalId[];
  missed: GoalId[];
  giftCents: number;
  betCents: number;
  /** True when this day is deliberately outside the money. */
  free: boolean;
}

/** What a day is worth, to each pot. */
export function splitDay(input: DayInput): DaySplit {
  const held = new Set(input.done);
  const done = GOAL_IDS.filter((id) => held.has(id));
  const missed = GOAL_IDS.filter((id) => !held.has(id));
  const free = !!input.hardDay || !!input.paused;
  const stakes = input.stakes ?? DEFAULT_STAKES;
  return {
    done,
    missed,
    giftCents: free ? 0 : done.length * stakes.giftCents,
    betCents: free ? 0 : missed.length * stakes.betCents,
    free,
  };
}

/** What the goals still open are about to cost him, if the day ends like this. */
export function atStake(split: DaySplit): number {
  return split.free ? 0 : split.betCents;
}

/**
 * Money, the way it should be said out loud: $9, never $9.00, and $12.50 when
 * the cents are real. Used for the pots, the bets and every push.
 */
export function money(cents: number, currency = 'USD'): string {
  const whole = cents % 100 === 0;
  const value = (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === 'USD' ? `$${value}` : `${value} ${currency}`;
}

export interface Pots {
  giftCents: number;
  betCents: number;
  stakedCents: number;
  lostCents: number;
  wonCents: number;
  openCents: number;
}

export const EMPTY_POTS: Pots = {
  giftCents: 0,
  betCents: 0,
  stakedCents: 0,
  lostCents: 0,
  wonCents: 0,
  openCents: 0,
};

/**
 * What the bet pot is actually doing.
 *
 * `bet` is what her missed goals condemned; `staked` is what he has since handed
 * to a bookmaker, and it trails, because he places them in his own time. The
 * difference is money he owes the pot, and the screen says so rather than
 * quietly rounding it into "burned" - the whole mechanic rests on that number
 * being true.
 */
export function unplaced(pots: Pots): number {
  return Math.max(0, pots.betCents - pots.stakedCents);
}

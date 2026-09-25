/**
 * Where a day's money goes.
 *
 * The rule is one sentence and it is lopsided on purpose: a habit of hers held
 * puts a dollar in her gift pot, one missed puts three in the pot he bets on
 * sport. A miss costs three times what a win pays, so what pulls is the loss and
 * not the prize - which is the only reason a tracker like this works on someone
 * who is already tired of being scored.
 *
 * Two things change the arithmetic, and they are the reason this file exists
 * separately from the screen.
 *
 * A HARD DAY stops the burn and nothing else. It used to stop both, and that was
 * the worst bug in the feature: on a day she managed two of the five and was
 * drowning, pressing the one button meant for her worst days took away the two
 * dollars she had already earned and greyed out the rows, so the valve had a
 * price on it and she would learn not to press it. Now a hard day keeps every
 * dollar she held and forgives every one she did not.
 *
 * A PAUSED Five stops everything, because a switch she turned off is not consent
 * she withdrew from halfway. The scheduler also never settles a day she was
 * paused through, so coming back is never a bill.
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

/**
 * One of her habits on one day: was it held?
 *
 * Deliberately not a list of names. The money used to ride on five hard-coded
 * ids; it rides on whatever habits he has given her, so a day is described by
 * the habits that were in force on it.
 */
export interface HabitDay {
  habitId: string;
  held: boolean;
}

export interface DayInput {
  habits: HabitDay[];
  hardDay?: boolean;
  paused?: boolean;
  stakes?: Stakes;
}

export interface DaySplit {
  held: string[];
  missed: string[];
  giftCents: number;
  betCents: number;
  /** Nothing she missed costs anything today. */
  forgiven: boolean;
  /** Nothing moves at all, in either direction: she has it switched off. */
  free: boolean;
}

/** What a day is worth, to each pot. */
export function splitDay(input: DayInput): DaySplit {
  const held = input.habits.filter((h) => h.held).map((h) => h.habitId);
  const missed = input.habits.filter((h) => !h.held).map((h) => h.habitId);
  const paused = !!input.paused;
  const forgiven = paused || !!input.hardDay;
  const stakes = input.stakes ?? DEFAULT_STAKES;
  return {
    held,
    missed,
    giftCents: paused ? 0 : held.length * stakes.giftCents,
    betCents: forgiven ? 0 : missed.length * stakes.betCents,
    forgiven,
    free: paused,
  };
}

/** What the habits still open are about to cost him, if the day ends like this. */
export function atStake(split: DaySplit): number {
  return split.forgiven ? 0 : split.betCents;
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

/**
 * Where a day's money goes.
 *
 * The rule is one sentence and it is lopsided on purpose: a habit of hers held
 * puts a dollar in her gift, one missed puts three in the money he bets on
 * sport. A miss costs three times what a win pays, so what pulls is the loss and
 * not the prize - which is the only reason a tracker like this works on someone
 * who is already tired of being scored.
 *
 * Two things change the arithmetic, and they are the reason this file exists
 * separately from the screen.
 *
 * A HARD DAY stops the burn and nothing else. It used to stop both, and that was
 * the worst bug in the feature: on a day she managed two of her five and was
 * drowning, pressing the one button meant for her worst days took away the two
 * dollars she had already earned and greyed out the rows, so the valve had a
 * price on it and she would learn not to press it. Now a hard day keeps every
 * dollar she held and forgives every one she did not.
 *
 * A PAUSED pot stops everything, because a switch she turned off is not consent
 * she withdrew from halfway. The scheduler also never settles a day she was
 * paused through, so coming back is never a bill.
 *
 * The clock (`supabase/functions/habits-tick/index.ts`) and
 * `money_reconcile_day()` write the ledger from exactly this rule. This is the
 * copy the screen projects today's split with, before any of it is real.
 */

export interface Stakes {
  /** Cents to her gift, per habit held. */
  giftCents: number;
  /** Cents to the betting money, per habit missed. */
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

/**
 * Pesos, the way Chile writes them: 9.569 CLP.
 *
 * The pots are in dollars, because the stakes are a dollar held and three
 * missed. The BETS are in pesos, because that is what he actually hands over at
 * a bookmaker in Santiago, and a screen that makes him convert is a screen he
 * fills in wrong on a Thursday morning.
 */
export function clp(pesos: number): string {
  return `${Math.round(pesos).toLocaleString('es-CL')} CLP`;
}

/** Dollars in cents, at the rate of the day, to whole pesos. */
export function toPesos(cents: number, rate: number): number {
  return Math.round((cents / 100) * rate);
}

/** And back, which is the figure the pot is settled against. */
export function toCents(pesos: number, rate: number): number {
  return Math.max(1, Math.round((pesos / rate) * 100));
}

/** If the rates have not loaded yet. Close enough to place a bet on. */
export const USD_CLP_FALLBACK = 950;

/**
 * What a bet may be.
 *
 * He never backs anything under 1.01 or over 4, so the wheel does not offer it;
 * 2 is where it opens because that is the shape of the bets he actually places.
 * The stake moves in 500s: a bet slip is not an invoice.
 */
export const ODDS = { min: 1.01, max: 4, step: 0.01, start: 2 } as const;
export const STAKE = { min: 500, max: 150_000, step: 500 } as const;

/** Every value the wheel offers, built once. */
export function oddsLadder(): number[] {
  const out: number[] = [];
  for (let v = ODDS.min; v <= ODDS.max + 1e-9; v += ODDS.step) {
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

export function stakeLadder(): number[] {
  const out: number[] = [];
  for (let v = STAKE.min; v <= STAKE.max; v += STAKE.step) out.push(v);
  return out;
}

/** The nearest stake the wheel can actually hold. */
export function nearestStake(pesos: number): number {
  const snapped = Math.round(pesos / STAKE.step) * STAKE.step;
  return Math.min(STAKE.max, Math.max(STAKE.min, snapped));
}

/**
 * The two pots, and the periods that make them pots rather than totals.
 *
 * The plain figures are lifetime: every dollar her habits have ever earned or
 * burned. The `*Period` ones are what the screen leads with, because a pot you
 * never empty is a scoreboard: the betting money is one week, Monday to Sunday,
 * and her gift is one calendar month. `money_windows()` works the dates out
 * (including the first one, which swallows the stub) and hands them back here,
 * so the screen prints a calendar it does not own.
 */
export interface Pots {
  giftCents: number;
  betCents: number;
  stakedCents: number;
  lostCents: number;
  wonCents: number;
  openCents: number;
  /** This month's gift, and this week's burn. */
  giftPeriodCents: number;
  betPeriodCents: number;
  /** Of that week's burn, what he has already put on a match. */
  betPeriodStakedCents: number;
  /** What the bets themselves did, in the money they were placed in. */
  lostClp: number;
  wonClp: number;
  giftFrom: string | null;
  giftTo: string | null;
  betFrom: string | null;
  betTo: string | null;
}

export const EMPTY_POTS: Pots = {
  giftCents: 0,
  betCents: 0,
  stakedCents: 0,
  lostCents: 0,
  wonCents: 0,
  openCents: 0,
  giftPeriodCents: 0,
  betPeriodCents: 0,
  betPeriodStakedCents: 0,
  lostClp: 0,
  wonClp: 0,
  giftFrom: null,
  giftTo: null,
  betFrom: null,
  betTo: null,
};

/**
 * What the bet pot is actually doing.
 *
 * `bet` is what her missed habits condemned; `staked` is what he has since put
 * on a match, and it trails, because he places them in his own time. The
 * difference is money he owes the pot, and the screen says so rather than
 * quietly rounding it into "burned" - the whole mechanic rests on that number
 * being true.
 */
export function unplaced(pots: Pots): number {
  return Math.max(0, pots.betCents - pots.stakedCents);
}

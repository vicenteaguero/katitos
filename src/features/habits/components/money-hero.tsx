import { DateTime } from 'luxon';
import { Card, Kicker, StatPill } from '@kernel/ui';
import { clp, money, type Pots } from '../lib/money';

/**
 * The two numbers the page opens on, and the two under them that never reset.
 *
 * Her gift is the big one, in gold on the wine wash, because that is the number
 * the whole thing is for. The betting money is beside it and deliberately
 * smaller: it is the consequence, not the point, and a burn pile rendered bigger
 * than the present would turn this into a scoreboard about failure.
 *
 * Both have a DEADLINE under them, and that is what makes them pots rather than
 * totals. The gift is a month, so it is a real present with a date on it; the
 * betting money is a week, so a bad Tuesday is settled by Sunday and does not
 * hang over her in March. `money_windows()` owns those dates, including the
 * first pair, which are stretched so neither pot opens with a two-day stub.
 *
 * Under the card, the two figures that DO run forever: what the bets have
 * actually lost, and what she has actually been given. Everything else that used
 * to be printed here - riding, still to place, came back - was bookkeeping said
 * out loud.
 */
export function MoneyHero({ pots }: { pots: Pots }) {
  return (
    <>
      <Card tone="hero" className="flex flex-col gap-1.5 rounded-lg">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <Kicker tone="gold">Surprise gift pot 🎁</Kicker>
            <p className="gilt-text gilt-figures font-display text-[2.75rem] font-semibold leading-none tracking-tight">
              {money(pots.giftPeriodCents)}
            </p>
            {/* Each figure carries its own date, under itself. One line holding
                both read as though the second date belonged to the gift.
                Person-neutral wording, because both of them read this card: "hers
                on 31 Oct" is a sentence about her, to her. */}
            {pots.giftTo && (
              <p className="mt-1 font-sans text-[11px] leading-none text-gold/70">
                ready on {on(pots.giftTo)}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <StatPill
              value={money(pots.betPeriodCents)}
              label="Betting money 🤑"
              tone="fg"
            />
            {pots.betTo && (
              <p className="mt-1 font-sans text-[11px] leading-none text-muted">
                goes in {weekday(pots.betTo)} {on(pots.betTo)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* The running total, which is the part she is meant to remember. */}
      <Card tone="flat" className="flex items-end justify-between gap-3 py-3">
        <StatPill
          value={clp(pots.lostClp)}
          label="Lost on bets"
          tone="fg"
          align="left"
        />
        <StatPill value={money(pots.giftCents)} label="Earned in gifts" />
      </Card>
    </>
  );
}

/** A day, said the short way: 31 Oct. */
function on(day: string): string {
  return DateTime.fromISO(day, { zone: 'utc' }).toFormat('d LLL');
}

/** Sun, not Sunday: it sits beside a date in a column half a screen wide. */
function weekday(day: string): string {
  return DateTime.fromISO(day, { zone: 'utc' }).toFormat('ccc');
}

import { DateTime } from 'luxon';
import { Card, Kicker, StatPill } from '@kernel/ui';
import { money, unplaced, type Pots } from '../lib/money';

/**
 * The two numbers the page opens on.
 *
 * Her gift is the big one, in gold on the wine wash, because that is the number
 * the whole thing is for. The betting money is beside it and deliberately
 * smaller: it is the consequence, not the point, and a burn pile rendered bigger
 * than the present would turn this into a scoreboard about failure.
 *
 * Both have a DEADLINE under them, and that is what makes them pots. The gift is
 * a month, so it is a real present with a date on it rather than a number that
 * creeps up forever; the betting money is a week, so a bad Tuesday is settled by
 * Sunday and does not hang over her in March. `money_windows()` owns the dates,
 * including the first pair, which are stretched so neither pot opens with a
 * two-day stub.
 *
 * The last line is the honesty, and it is lifetime rather than this week: `bet`
 * is what her missed habits condemned, `staked` is what he has actually put on a
 * match, and it trails him. Folding the two into one figure would be the single
 * most tempting lie on this screen, so the gap is printed.
 */
export function MoneyHero({ pots }: { pots: Pots }) {
  const waiting = unplaced(pots);
  const earlier = pots.giftCents - pots.giftPeriodCents;
  const notes = [
    waiting > 0 ? `${money(waiting)} still to place` : null,
    pots.openCents > 0 ? `${money(pots.openCents)} riding` : null,
    pots.lostCents > 0 ? `${money(pots.lostCents)} lost for good` : null,
    pots.wonCents > 0 ? `${money(pots.wonCents)} came back to you` : null,
    earlier > 0 ? `${money(earlier)} from the months before` : null,
  ].filter(Boolean);

  return (
    <Card tone="hero" className="flex flex-col gap-1.5 rounded-lg">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Kicker tone="gold">Your surprise gift 🎁</Kicker>
          <p className="gilt-text gilt-figures font-display text-[2.75rem] font-semibold leading-none tracking-tight">
            {money(pots.giftPeriodCents)}
          </p>
          {/* Each figure carries its own date, under itself. One line holding
              both read as though the second date belonged to the gift. */}
          {pots.giftTo && (
            <p className="mt-1 font-sans text-[11px] leading-none text-gold/70">
              yours on {on(pots.giftTo)}
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
      {notes.length > 0 && (
        <p className="font-sans text-xs leading-relaxed tabular-nums text-muted">
          {notes.join(', ')}
        </p>
      )}
    </Card>
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

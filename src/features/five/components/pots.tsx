import { Card, Kicker } from '@kernel/ui';
import { money, unplaced, type Pots as PotsShape } from '../lib/money';

/**
 * The two numbers the screen opens on.
 *
 * Her gift is the big one, in gold on the wine wash, because that is the number
 * the whole thing is for. The bookmaker's is beside it and deliberately smaller:
 * it is the consequence, not the point, and a burn pile rendered bigger than the
 * present would turn this into a scoreboard about failure.
 *
 * The third line is the honesty. `bet` is what her missed goals condemned;
 * `staked` is what he has actually handed over, and it trails him. Folding the
 * two into one figure would be the single most tempting lie on this screen, so
 * the gap is printed.
 */
export function Pots({ pots }: { pots: PotsShape }) {
  const waiting = unplaced(pots);
  const notes = [
    waiting > 0 ? `${money(waiting)} still to place` : null,
    pots.openCents > 0 ? `${money(pots.openCents)} riding` : null,
    pots.lostCents > 0 ? `${money(pots.lostCents)} lost for good` : null,
    pots.wonCents > 0 ? `${money(pots.wonCents)} came back to you` : null,
  ].filter(Boolean);

  return (
    <Card tone="hero" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Kicker tone="gold">Your gift</Kicker>
          <p className="font-display text-[2.75rem] font-semibold leading-none tracking-tight text-gold tabular-nums">
            {money(pots.giftCents)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <Kicker tone="muted">To the bookmaker</Kicker>
          <p className="font-display text-2xl font-semibold leading-none tracking-tight text-muted tabular-nums">
            {money(pots.betCents)}
          </p>
        </div>
      </div>
      {notes.length > 0 && (
        <p className="font-sans text-xs leading-relaxed text-muted">
          {notes.join(', ')}
        </p>
      )}
    </Card>
  );
}

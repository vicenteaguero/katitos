import { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@kernel/lib';
import {
  Badge,
  Button,
  Card,
  CardRows,
  Dialog,
  Empty,
  Field,
  Input,
  Roller,
  SectionLabel,
} from '@kernel/ui';
import {
  ODDS,
  clp,
  nearestStake,
  oddsLadder,
  stakeLadder,
  toPesos,
} from '../lib/money';
import type { Bet, BetStatus } from '../types';

/**
 * Every bet her missed habits paid for, kept forever.
 *
 * This list is the memory of the whole feature. A pot that goes down is abstract;
 * "Thursday, Bayern to win, 9.500 CLP, lost" is not, and it is still here in
 * March. It is shown to both of them - she is the one who is meant to remember
 * it - and only he can write to it, which the database enforces rather than this
 * screen.
 *
 * Every figure here is in pesos, because pesos are what he actually hands over.
 */

/** What he put on it. Pesos, falling back to the dollars on a row that predates them. */
function stakeOf(bet: Bet, rate: number): number {
  return bet.stake_clp ?? toPesos(bet.stake_cents, rate);
}

function payoutOf(bet: Bet, rate: number): number | null {
  if (bet.payout_clp != null) return bet.payout_clp;
  if (bet.payout_cents != null) return toPesos(bet.payout_cents, rate);
  return null;
}

/** A bet that has been played and never settled. The clock chases him for these. */
function needsResult(bet: Bet): boolean {
  return (
    (bet.status ?? 'open') === 'open' &&
    !!bet.kickoff &&
    DateTime.fromISO(bet.kickoff) < DateTime.now()
  );
}

export function BetList({
  bets,
  isKeeper,
  rate,
  onSettle,
  onAdd,
}: {
  bets: Bet[];
  isKeeper: boolean;
  /** A dollar in pesos, for the few old rows that predate pesos. */
  rate: number;
  onSettle: (bet: Bet) => void;
  onAdd?: () => void;
}) {
  const waiting = bets.filter(needsResult).length;
  return (
    <section>
      <SectionLabel
        note={
          waiting > 0
            ? `${waiting} waiting on a result`
            : bets.length > 0
              ? `${bets.length} so far`
              : undefined
        }
        action={
          isKeeper && onAdd ? (
            <Button variant="quiet" size="xs" onClick={onAdd}>
              Add a bet
            </Button>
          ) : undefined
        }
      >
        Where the money went
      </SectionLabel>
      {bets.length === 0 ? (
        <Empty
          icon="🎟️"
          title="No bets yet"
          hint="Each week's betting money goes on a match, and every one of them stays here."
        />
      ) : (
        <Card tone="flat" className="p-0">
          <CardRows>
            {bets.map((bet) => {
              const status = (bet.status as BetStatus) ?? 'open';
              const stake = stakeOf(bet, rate);
              const payout = payoutOf(bet, rate);
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-fg">
                      {bet.pick}
                    </span>
                    <span className="block truncate font-sans text-xs text-muted">
                      {[when(bet), bet.odds ? `at ${bet.odds}` : null]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </span>

                  {/* What went in, and what came out, in one column: "lost" is
                      a label, "-11.500 CLP" is the thing. The badge sits under
                      them rather than beside them, because a word as wide as
                      UPCOMING out here eats the name of what he backed. */}
                  <span className="shrink-0 text-right">
                    <span className="block font-sans text-[12px] tabular-nums text-muted">
                      Bet {clp(stake)}
                    </span>
                    {status === 'won' && payout != null && (
                      <span className="block font-sans text-[13px] font-semibold tabular-nums text-success">
                        Won +{clp(payout)}
                      </span>
                    )}
                    {status === 'lost' && (
                      <span className="block font-sans text-[13px] font-semibold tabular-nums text-danger">
                        Lost -{clp(stake)}
                      </span>
                    )}
                    {status !== 'won' && status !== 'lost' && (
                      <Badge tone="warning" className="mt-0.5">
                        {needsResult(bet) ? 'result?' : 'upcoming'}
                      </Badge>
                    )}
                  </span>
                </>
              );
              const shape =
                'flex w-full items-center gap-3 px-3.5 py-3 text-left';

              // Hers to read, his to settle. A disabled <button> would take the
              // whole list out of her tab order and out of a screen reader's
              // reach, and this list is written for her.
              return isKeeper ? (
                <button
                  key={bet.id}
                  type="button"
                  onClick={() => onSettle(bet)}
                  className={cn(shape, 'lift-press active:bg-fg/5')}
                >
                  {body}
                </button>
              ) : (
                <span key={bet.id} className={shape}>
                  {body}
                </span>
              );
            })}
          </CardRows>
        </Card>
      )}
    </section>
  );
}

/**
 * When it plays, or when it was placed.
 *
 * The kickoff is the more useful of the two dates every time it exists: it is
 * the one that tells you whether this is tonight's match or one nobody has
 * settled since Thursday.
 */
function when(bet: Bet): string {
  if (bet.kickoff) {
    return DateTime.fromISO(bet.kickoff).toFormat('ccc d LLL, HH:mm');
  }
  return DateTime.fromISO(bet.day, { zone: 'utc' }).toFormat('d LLL');
}

/** Built once, at module load: a few hundred rows each, and they never change. */
const ODDS_LADDER = oddsLadder();
const STAKE_LADDER = stakeLadder();

/**
 * He places one.
 *
 * Three things and no more: what he backed, the two numbers on the slip, and
 * when it plays. The sport is always football, so it is not a question. The odds
 * and the stake are wheels, so they cannot be half-typed and cannot hold a
 * number he would never actually bet - and a wheel is one flick on a phone,
 * where a decimal keypad is four taps and a mistake.
 */
export function BetForm({
  open,
  day,
  owedClp,
  zone,
  onClose,
  onSave,
}: {
  open: boolean;
  day: string;
  /** What this week's betting money says he owes, in pesos. */
  owedClp: number;
  /** His clock, so "Thursday 09:00" means nine in the morning where he is. */
  zone?: string | null;
  onClose: () => void;
  onSave: (draft: {
    day: string;
    pick: string;
    stakeClp: number;
    odds: number;
    kickoff: string | null;
  }) => void;
}) {
  const [pick, setPick] = useState('');
  const [odds, setOdds] = useState<number>(ODDS.start);
  const [stake, setStake] = useState(() => nearestStake(owedClp));
  // The next full hour, his time. An empty datetime field renders as today's
  // date on iOS and then saves nothing, which is a control that lies; and a bet
  // with a kickoff is a bet the clock can chase him about.
  const [kickoff, setKickoff] = useState(() => nextHour(zone));

  const valid = pick.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} title="Add a bet">
      <div className="flex flex-col gap-3">
        <Input
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          placeholder="Bet name"
          aria-label="Bet name"
          autoFocus
        />

        <div className="flex items-start gap-3">
          <Roller
            className="flex-1"
            label="Odds"
            values={ODDS_LADDER}
            value={odds}
            onChange={setOdds}
            format={(v) => v.toFixed(2)}
          />
          <Roller
            className="flex-1"
            label={owedClp > 0 ? `Stake, ${clp(owedClp)} owed` : 'Stake'}
            values={STAKE_LADDER}
            value={stake}
            onChange={setStake}
            format={(v) => clp(v)}
          />
        </div>

        {/* The whole reason the result ever gets filled in: two hours after this
            the clock asks him for it, and keeps asking. */}
        <Field label="When it plays">
          <Input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
          />
        </Field>

        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave({
              day,
              pick: pick.trim(),
              stakeClp: stake,
              odds,
              kickoff: toInstant(kickoff, zone),
            });
            setPick('');
            setKickoff(nextHour(zone));
          }}
        >
          Place it
        </Button>
      </div>
    </Dialog>
  );
}

/** The next full hour on his clock, as the field wants it written. */
function nextHour(zone?: string | null): string {
  const now = zone ? DateTime.now().setZone(zone) : DateTime.now();
  return now.plus({ hours: 1 }).startOf('hour').toFormat("yyyy-LL-dd'T'HH:mm");
}

/**
 * A wall-clock time in HIS zone, as an instant.
 *
 * "Thursday at 9" is nine in Santiago, not nine wherever the browser thinks it
 * is - and this app is opened from two countries. Luxon reads the local string
 * in the zone we name, so the stored instant is the same one either phone typed.
 */
function toInstant(local: string, zone?: string | null): string | null {
  if (!local) return null;
  const dt = DateTime.fromISO(local, zone ? { zone } : undefined);
  return dt.isValid ? dt.toUTC().toISO() : null;
}

/**
 * It came in, or it did not.
 *
 * A win pays her, so the payout is asked for, in pesos, starting at whatever the
 * odds say it should be. The third button DELETES: a bet logged by mistake is
 * not history, it is a mistake, and keeping it in the log as "void" was a row
 * that said nothing forever.
 */
export function SettleBet({
  bet,
  rate,
  onClose,
  onSettle,
  onDelete,
}: {
  bet: Bet | null;
  rate: number;
  onClose: () => void;
  onSettle: (status: 'won' | 'lost', payoutClp?: number) => void;
  onDelete: () => void;
}) {
  const [payout, setPayout] = useState('');
  if (!bet) return null;
  const stake = stakeOf(bet, rate);
  const suggested = bet.odds ? Math.round(stake * Number(bet.odds)) : stake;
  // Pesos have no cents, so anything that is not a digit is a slip of the thumb.
  const typed = Number(payout.replace(/\D/g, ''));
  const pesos = payout.trim() ? typed : suggested;
  const payable = Number.isFinite(pesos) && pesos > 0;

  return (
    <Dialog open onClose={onClose} title={bet.pick}>
      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm leading-relaxed text-muted">
          {clp(stake)}, {when(bet)}. A win goes straight into her gift, not back
          to you.
        </p>
        <Input
          value={payout}
          onChange={(e) => setPayout(e.target.value)}
          inputMode="numeric"
          placeholder={`It paid ${clp(suggested)}`}
          aria-label="What it paid"
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="affirm"
            disabled={!payable}
            onClick={() => payable && onSettle('won', pesos)}
          >
            It came in
          </Button>
          <Button variant="destructive" onClick={() => onSettle('lost')}>
            Gone
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete it, this was a mistake
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

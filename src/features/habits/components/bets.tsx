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
  FieldRow,
  Input,
  SectionLabel,
} from '@kernel/ui';
import { money } from '../lib/money';
import type { Bet, BetStatus } from '../types';

/**
 * Every bet her missed habits paid for, kept forever.
 *
 * This list is the memory of the whole feature. A pot that goes down is abstract;
 * "Sunday, Bayern to win, $9, lost" is not, and it is still here in March. So
 * nothing is deleted - a mistake is voided and stays visible - and the list is
 * shown to both of them, because she is the one who is meant to remember it.
 */
const TONE: Record<
  BetStatus,
  { label: string; tone: 'neutral' | 'danger' | 'success' | 'warning' }
> = {
  open: { label: 'riding', tone: 'warning' },
  lost: { label: 'lost', tone: 'danger' },
  // 'won', not 'came back': the gold +$28.80 beside it already says where the
  // money went, and a wide badge eats the name of the thing he backed.
  won: { label: 'won', tone: 'success' },
  void: { label: 'void', tone: 'neutral' },
};

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
  onSettle,
  onAdd,
}: {
  bets: Bet[];
  isKeeper: boolean;
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
              const played = needsResult(bet);
              const look = played
                ? { label: 'result?', tone: 'warning' as const }
                : TONE[(bet.status as BetStatus) ?? 'open'];
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
                  <span className="w-20 shrink-0 text-right">
                    <span className="block font-sans text-sm font-semibold tabular-nums text-fg">
                      {money(bet.stake_cents)}
                    </span>
                    {bet.status === 'won' && bet.payout_cents ? (
                      <span className="block font-sans text-xs font-semibold tabular-nums text-gold">
                        +{money(bet.payout_cents)}
                      </span>
                    ) : null}
                  </span>
                  <Badge tone={look.tone} className="shrink-0">
                    {look.label}
                  </Badge>
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

/** He places one. Dollars in the field, cents in the database. */
export function BetForm({
  open,
  day,
  owed,
  zone,
  onClose,
  onSave,
}: {
  open: boolean;
  day: string;
  /** What the week's pot says he owes, so the stake starts there. */
  owed: number;
  /** His clock, so "Thursday 09:00" means nine in the morning where he is. */
  zone?: string | null;
  onClose: () => void;
  onSave: (draft: {
    day: string;
    sport: string | null;
    pick: string;
    stakeCents: number;
    odds: number | null;
    kickoff: string | null;
    note: string | null;
  }) => void;
}) {
  const [pick, setPick] = useState('');
  const [sport, setSport] = useState('');
  const [stake, setStake] = useState(() =>
    owed > 0 ? String(owed / 100) : ''
  );
  const [odds, setOdds] = useState('');
  const [kickoff, setKickoff] = useState('');

  const cents = Math.round(Number(stake.replace(',', '.')) * 100);
  const valid = pick.trim().length > 0 && Number.isFinite(cents) && cents > 0;

  return (
    <Dialog open={open} onClose={onClose} title="A bet">
      <div className="flex flex-col gap-3">
        <Field label="What you backed">
          <Input
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            placeholder="Bayern to win"
            autoFocus
          />
        </Field>
        <FieldRow>
          <Field label="Sport">
            <Input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="Football"
            />
          </Field>
          <Field label="Odds">
            <Input
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              inputMode="decimal"
              placeholder="2.10"
            />
          </Field>
        </FieldRow>
        <Field
          label="Stake"
          hint={owed > 0 ? `${money(owed)} still to place` : undefined}
        >
          <Input
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            inputMode="decimal"
            placeholder="9"
          />
        </Field>
        {/* The whole reason the result ever gets filled in: two hours after this
            the clock asks him for it, and keeps asking. */}
        <Field label="When it plays" hint="Your time. Optional">
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
              sport: sport.trim() || null,
              pick: pick.trim(),
              stakeCents: cents,
              odds: odds ? Number(odds.replace(',', '.')) : null,
              kickoff: toInstant(kickoff, zone),
              note: null,
            });
            setPick('');
            setSport('');
            setOdds('');
            setKickoff('');
          }}
        >
          Place it
        </Button>
      </div>
    </Dialog>
  );
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

/** It came in, or it did not. A win pays her, so the payout is asked for. */
export function SettleBet({
  bet,
  onClose,
  onSettle,
}: {
  bet: Bet | null;
  onClose: () => void;
  onSettle: (status: 'won' | 'lost' | 'void', payoutCents?: number) => void;
}) {
  const [payout, setPayout] = useState('');
  if (!bet) return null;
  const suggested = bet.odds
    ? Math.round(bet.stake_cents * Number(bet.odds))
    : bet.stake_cents;
  const cents = payout
    ? Math.round(Number(payout.replace(',', '.')) * 100)
    : suggested;
  // A half-typed figure is not a payout. Without this, "12,5o" marks the bet won
  // with nothing written to her pot and nothing said about it.
  const payable = Number.isFinite(cents) && cents > 0;

  return (
    <Dialog open onClose={onClose} title={bet.pick}>
      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm leading-relaxed text-muted">
          {money(bet.stake_cents)}, {when(bet)}. A win goes straight into her
          gift, not back to you.
        </p>
        <Field label="If it came in, what it paid">
          <Input
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            inputMode="decimal"
            placeholder={String(suggested / 100)}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <Button
            variant="affirm"
            disabled={!payable}
            onClick={() => payable && onSettle('won', cents)}
          >
            It came in
          </Button>
          <Button variant="destructive" onClick={() => onSettle('lost')}>
            Gone
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSettle('void')}>
            Void it, this was a mistake
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

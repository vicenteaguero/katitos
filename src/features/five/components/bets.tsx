import { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@kernel/lib';
import {
  Badge,
  Button,
  Card,
  Dialog,
  Empty,
  Field,
  FieldRow,
  Input,
  SectionLabel,
} from '@kernel/ui';
import { money } from '../lib/money';
import type { BetStatus, FiveBet } from '../types';

/**
 * Every bet her missed goals paid for, kept forever.
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
  won: { label: 'came back', tone: 'success' },
  void: { label: 'void', tone: 'neutral' },
};

export function BetList({
  bets,
  isKeeper,
  onSettle,
  onAdd,
}: {
  bets: FiveBet[];
  isKeeper: boolean;
  onSettle: (bet: FiveBet) => void;
  onAdd?: () => void;
}) {
  return (
    <section>
      <SectionLabel
        note={bets.length > 0 ? `${bets.length} so far` : undefined}
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
          title="Nothing burned yet"
          hint="Every bet a missed goal pays for lands here, and stays here."
        />
      ) : (
        <Card tone="flat" className="p-0">
          <div className="divide-y divide-fg/5">
            {bets.map((bet) => {
              const look = TONE[(bet.status as BetStatus) ?? 'open'];
              return (
                <button
                  key={bet.id}
                  type="button"
                  disabled={!isKeeper}
                  onClick={() => onSettle(bet)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3.5 py-3 text-left',
                    isKeeper && 'lift-press active:bg-fg/5'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-fg">
                      {bet.pick}
                    </span>
                    <span className="block truncate font-sans text-xs text-muted">
                      {[
                        DateTime.fromISO(bet.day).toFormat('d LLL'),
                        bet.sport,
                        bet.odds ? `at ${bet.odds}` : null,
                      ]
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
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </section>
  );
}

/** He places one. Dollars in the field, cents in the database. */
export function BetForm({
  open,
  day,
  owed,
  onClose,
  onSave,
}: {
  open: boolean;
  day: string;
  /** What the pot says he owes the bookmaker, so the stake starts there. */
  owed: number;
  onClose: () => void;
  onSave: (draft: {
    day: string;
    sport: string | null;
    pick: string;
    stakeCents: number;
    odds: number | null;
    note: string | null;
  }) => void;
}) {
  const [pick, setPick] = useState('');
  const [sport, setSport] = useState('');
  const [stake, setStake] = useState(() =>
    owed > 0 ? String(owed / 100) : ''
  );
  const [odds, setOdds] = useState('');

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
          hint={
            owed > 0 ? `${money(owed)} still owed to the bookmaker` : undefined
          }
        >
          <Input
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            inputMode="decimal"
            placeholder="9"
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
              note: null,
            });
            setPick('');
            setSport('');
            setOdds('');
          }}
        >
          Place it
        </Button>
      </div>
    </Dialog>
  );
}

/** It came in, or it did not. A win pays her, so the payout is asked for. */
export function SettleBet({
  bet,
  onClose,
  onSettle,
}: {
  bet: FiveBet | null;
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

  return (
    <Dialog open onClose={onClose} title={bet.pick}>
      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm leading-relaxed text-muted">
          {money(bet.stake_cents)} on{' '}
          {DateTime.fromISO(bet.day).toFormat('d LLL')}. A win goes straight
          into her gift pot, not back to you.
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
          <Button variant="affirm" onClick={() => onSettle('won', cents)}>
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

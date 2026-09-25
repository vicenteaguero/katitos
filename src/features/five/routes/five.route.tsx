import { useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { Settings2 } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  Card,
  Desk,
  Dialog,
  Empty,
  Field,
  Input,
  Kicker,
  SectionLabel,
  Switch,
  TopBarButton,
  useDesk,
  useScreenChrome,
} from '@kernel/ui';
import { GOALS, type GoalId } from '../lib/goals';
import { useFiveVisible } from '../lib/visible';
import { money } from '../lib/money';
import {
  addDays,
  canMark as canMarkDay,
  liveDays,
  localDay,
  recentDays,
} from '../lib/five-days';
import {
  stripStart,
  useFiveBets,
  useFiveDays,
  useFiveMarks,
  useFivePots,
  useFiveSettings,
  useFiveWho,
} from '../api/five.queries';
import {
  useAddBet,
  useHardDay,
  useMarkGoal,
  useSaveFiveSettings,
  useSettleBet,
  useUndoHardDay,
  useUnmarkGoal,
} from '../api/five.mutations';
import { Pots } from '../components/pots';
import { DayCard } from '../components/day-card';
import { DayStrip } from '../components/day-strip';
import { BetForm, BetList, SettleBet } from '../components/bets';
import type { FiveBet } from '../types';

/** How much of the past the strip shows. Three weeks fits a phone width. */
const STRIP_DAYS = 21;

/**
 * The Five.
 *
 * The same screen for both of them, which is the whole design: she is not being
 * watched through a window, they are looking at one page. Two pots, today, the
 * night before while it is still hers to fix, the pattern of the last three
 * weeks, and every bet her missed goals ever paid for.
 *
 * The only thing that differs by who is holding the phone is what may be
 * changed - he can reach any day and take a tap back, she has her own day and
 * until 3AM - and the one place that is decided is `canMarkDay`, mirrored by a
 * trigger in the database.
 */
export function FiveRoute() {
  // Every hour is enough: the grace window shuts at 3AM, and nothing on this
  // screen counts down. A minute ticker here would re-render five cards for
  // nothing.
  const now = useNow(60 * 60 * 1000);
  const { subject, zone, isKeeper, isLoading } = useFiveWho();
  // Hidden means hidden, including from a typed URL. See lib/visible.ts.
  const visible = useFiveVisible();
  const subjectId = subject?.user_id ?? null;

  const from = useMemo(() => stripStart(zone, STRIP_DAYS), [zone]);
  const { stakes, active, startedOn } = useFiveSettings(subjectId);
  const { data: marks } = useFiveMarks(subjectId, from);
  const { data: dayRows } = useFiveDays(subjectId, from);
  const { pots } = useFivePots(subjectId);
  const { data: bets } = useFiveBets();

  useTableSync('five_marks', qk.five.all());
  useTableSync('five_days', qk.five.all());
  useTableSync('five_ledger', qk.five.all());
  useTableSync('five_bets', qk.five.all());
  useDesk();

  const mark = useMarkGoal();
  const unmark = useUnmarkGoal();
  const hardDay = useHardDay();
  const undoHardDay = useUndoHardDay();
  const saveSettings = useSaveFiveSettings();
  const addBet = useAddBet();
  const settleBet = useSettleBet();

  const [dials, setDials] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [settling, setSettling] = useState<FiveBet | null>(null);
  /** A day he opened from the strip, to put right. */
  const [opened, setOpened] = useState<string | null>(null);

  useScreenChrome(
    {
      title: 'The Five',
      stage: 'house',
      action: (
        <TopBarButton label="Stakes" onClick={() => setDials(true)}>
          <Settings2 className="h-[18px] w-[18px]" />
        </TopBarButton>
      ),
    },
    []
  );

  if (isLoading) return null;
  if (!visible) return <Navigate to="/" replace />;
  if (!subject || !subjectId) {
    return (
      <Desk narrow>
        <Empty
          icon="🤍"
          title="Nobody to keep"
          hint="The Five belongs to one person, and this login is not part of the couple."
        />
      </Desk>
    );
  }

  const today = localDay(zone, now);
  const live = liveDays(zone, now);
  // A day he opened from the strip goes FIRST: he tapped it, so it is the thing
  // he came to change, and appending it under today hid it below the fold.
  const cards = opened && !live.includes(opened) ? [opened, ...live] : live;

  const allMarks = marks ?? [];
  const allDays = dayRows ?? [];
  const hardDays = allDays.filter((d) => d.hard_day).map((d) => d.day);
  // One a week, counted the same way the trigger counts it.
  const hardDaySpent = hardDays.some((d) => d > addDays(today, -7));

  const toggle = (day: string, goalId: GoalId, done: boolean) => {
    if (!done) {
      mark.mutate({ userId: subjectId, day, goalId });
      return;
    }
    unmark.mutate({ userId: subjectId, day, goalId, asKeeper: isKeeper });
  };

  return (
    <Desk narrow>
      <div className="curtain-reveal flex flex-col gap-4 pb-2">
        <Pots pots={pots} />

        {!active && (
          <Card tone="flat" className="flex items-center justify-between gap-3">
            <p className="min-w-0 font-sans text-sm leading-relaxed text-muted">
              The Five is paused. Nothing is asked of you, and nothing moves.
            </p>
            <Button
              variant="quiet"
              size="xs"
              onClick={() =>
                saveSettings.mutate({ userId: subjectId, active: true })
              }
            >
              Start again
            </Button>
          </Card>
        )}

        {opened && !live.includes(opened) && (
          <div className="flex items-baseline justify-between gap-3">
            <Kicker tone="gold">Putting a day right</Kicker>
            <Button variant="quiet" size="xs" onClick={() => setOpened(null)}>
              Done
            </Button>
          </div>
        )}

        {cards.map((day) => (
          <DayCard
            key={day}
            day={day}
            zone={zone}
            marks={allMarks}
            hardDay={hardDays.includes(day)}
            paused={!active}
            stakes={stakes}
            canMark={active && canMarkDay(day, zone, isKeeper, now)}
            isToday={day === today}
            onToggle={(goalId, done) => toggle(day, goalId, done)}
            onHardDay={() => hardDay.mutate({ userId: subjectId, day })}
            onUndoHardDay={
              hardDays.includes(day)
                ? () => undoHardDay.mutate({ userId: subjectId, day })
                : undefined
            }
            hardDaySpent={hardDaySpent && !hardDays.includes(day)}
            now={now}
          />
        ))}

        <section>
          {/* No number here on purpose: today's stake is already on today's
              card, and saying it twice turns a shape into a scoreboard. */}
          <SectionLabel
            note={isKeeper ? 'tap a day to put it right' : undefined}
          >
            The last three weeks
          </SectionLabel>
          <DayStrip
            days={recentDays(zone, STRIP_DAYS, now).filter(
              // Days before the Five began are not misses, so the strip does
              // not draw them as five empty segments.
              (d) => !startedOn || d >= startedOn
            )}
            marks={allMarks}
            dayRows={allDays}
            zone={zone}
            now={now}
            onPick={isKeeper ? (day) => setOpened(day) : undefined}
          />
        </section>

        <BetList
          bets={bets ?? []}
          isKeeper={isKeeper}
          onSettle={(bet) => setSettling(bet)}
          onAdd={() => setPlacing(true)}
        />
      </div>

      <BetForm
        open={placing}
        day={today}
        owed={Math.max(0, pots.betCents - pots.stakedCents)}
        onClose={() => setPlacing(false)}
        onSave={(draft) => {
          addBet.mutate(draft);
          setPlacing(false);
        }}
      />

      <SettleBet
        bet={settling}
        onClose={() => setSettling(null)}
        onSettle={(status, payoutCents) => {
          if (!settling) return;
          settleBet.mutate({ bet: settling, status, payoutCents, subjectId });
          setSettling(null);
        }}
      />

      <Dials
        // Remounted when the stakes arrive, so the fields are never showing
        // the defaults after the real row has loaded behind them.
        key={`${stakes.giftCents}:${stakes.betCents}`}
        open={dials}
        onClose={() => setDials(false)}
        isKeeper={isKeeper}
        active={active}
        giftCents={stakes.giftCents}
        betCents={stakes.betCents}
        onSave={(next) => saveSettings.mutate({ userId: subjectId, ...next })}
      />
    </Desk>
  );
}

/**
 * Her switch and his two dials, in one panel.
 *
 * Hers is first and it is a switch, not a menu: whatever else this feature is, it
 * has to be one tap to stop. His dials are below it, and only he sees them - not
 * because the numbers are a secret, but because they are his money and a screen
 * that invited her to lower her own stakes would be asking her to negotiate with
 * herself on a bad day.
 */
function Dials({
  open,
  onClose,
  isKeeper,
  active,
  giftCents,
  betCents,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  isKeeper: boolean;
  active: boolean;
  giftCents: number;
  betCents: number;
  onSave: (next: {
    active?: boolean;
    giftCents?: number;
    betCents?: number;
  }) => void;
}) {
  const [gift, setGift] = useState(String(giftCents / 100));
  const [bet, setBet] = useState(String(betCents / 100));
  // An empty or half-typed field is not a stake of NaN dollars.
  const asCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
  const giftCentsNext = asCents(gift);
  const betCentsNext = asCents(bet);

  return (
    <Dialog open={open} onClose={onClose} title="The Five">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-fg">
              Keep going
            </p>
            <p className="font-sans text-xs leading-relaxed text-muted">
              Turn it off and nothing is asked of you, and neither pot moves.
            </p>
          </div>
          <Switch
            checked={active}
            onChange={(next) => onSave({ active: next })}
            label="Keep the Five going"
          />
        </div>

        {isKeeper && (
          <div className="flex flex-col gap-3">
            <Field label="A goal held, to her gift" hint="dollars">
              <Input
                value={gift}
                onChange={(e) => setGift(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="A goal missed, to the bookmaker" hint="dollars">
              <Input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <p className="font-sans text-xs leading-relaxed text-muted">
              A perfect day costs you{' '}
              {money(Math.round(Number(gift) * 100) * GOALS.length)}, a lost one{' '}
              {money(Math.round(Number(bet) * 100) * GOALS.length)}. Days
              already settled keep the stakes they were settled at.
            </p>
            <Button
              disabled={
                !Number.isFinite(giftCentsNext) ||
                !Number.isFinite(betCentsNext)
              }
              onClick={() => {
                if (
                  !Number.isFinite(giftCentsNext) ||
                  !Number.isFinite(betCentsNext)
                ) {
                  return;
                }
                onSave({ giftCents: giftCentsNext, betCents: betCentsNext });
                onClose();
              }}
            >
              Save the stakes
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

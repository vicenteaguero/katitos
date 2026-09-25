import { useEffect, useMemo, useState } from 'react';
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
  Skeleton,
  Textarea,
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
import { FIVE_OPEN } from '../lib/goals';
import {
  stripStart,
  useFiveBets,
  useFiveDays,
  useGoalHabits,
  useGoalTicks,
  useFivePauses,
  useFivePots,
  useFiveSettings,
  useFiveWho,
  pausedOn,
} from '../api/five.queries';
import {
  useAddBet,
  useAdoptGoalHabits,
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
  // A minute, not an hour.
  //
  // `useNow` does not refresh on focus, and this is a PWA that lives open on a
  // phone for days: on an hourly tick, for up to an hour after her midnight the
  // card headed "Today" still carried yesterday's date, so a tap put the dollar
  // on the wrong day - and after 3AM the server refused a card that said Today.
  // The tree under here is five rows and a bar chart; a minute costs nothing.
  const now = useNow(60_000);
  const { subject, zone, partnerZone, isKeeper, isLoading } = useFiveWho();
  // Hidden means hidden, including from a typed URL. See lib/visible.ts.
  const visible = useFiveVisible();
  const subjectId = subject?.user_id ?? null;

  const from = useMemo(() => stripStart(zone, STRIP_DAYS), [zone]);
  const { stakes, active, startedOn } = useFiveSettings(subjectId);
  const { data: ticks } = useGoalTicks(subjectId, from);
  const { data: goalHabits } = useGoalHabits(subjectId);
  const { data: dayRows } = useFiveDays(subjectId, from);
  const { pots } = useFivePots(subjectId);
  const { data: bets } = useFiveBets();
  const { data: pauses } = useFivePauses(subjectId, from);

  // Narrow on purpose. One correction on a settled day is eleven events - the
  // mark, then five ledger deletes and five inserts - and pointed at `five.all`
  // every one of them refetched all seven queries on the screen, pots RPC
  // included. The ledger only ever changes the pots; the bets only the list.
  // One table of ticks, so this is the streak's table too.
  useTableSync('habit_entries', qk.five.all());
  useTableSync('five_days', qk.five.all());
  useTableSync('five_ledger', qk.five.pots(subjectId ?? 'none'));
  useTableSync('five_bets', qk.five.bets());
  useDesk();

  const mark = useMarkGoal();
  const unmark = useUnmarkGoal();
  const hardDay = useHardDay();
  const undoHardDay = useUndoHardDay();
  const saveSettings = useSaveFiveSettings();
  const adopt = useAdoptGoalHabits();
  const addBet = useAddBet();
  const settleBet = useSettleBet();

  /**
   * The day he tells her, her five become habits in the streak.
   *
   * Done here rather than by hand, on his device only, and idempotent, so
   * opening the Five is still the one constant and nothing appears in her
   * streak a day early.
   */
  useEffect(() => {
    if (!FIVE_OPEN || !isKeeper || !subjectId) return;
    if (goalHabits === undefined) return;
    if (goalHabits.length >= GOALS.length) return;
    adopt.mutate(subjectId);
    // `adopt` is a stable mutation object; the guard above is what stops a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKeeper, subjectId, goalHabits?.length]);

  const [dials, setDials] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [settling, setSettling] = useState<FiveBet | null>(null);
  /** A day he opened from the strip, to put right. */
  const [opened, setOpened] = useState<string | null>(null);
  /** The day she is calling hard, while she decides whether to say why. */
  const [calling, setCalling] = useState<string | null>(null);

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

  // A blank flash is worse than a shape: the sibling screen paints skeletons for
  // exactly this beat (streak.route.tsx).
  if (isLoading) {
    return (
      <Desk narrow>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[7.5rem] rounded-lg" />
          <Skeleton className="h-[22rem] rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      </Desk>
    );
  }
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
  const live = liveDays(zone, partnerZone, now);
  // A day he opened from the strip goes FIRST: he tapped it, so it is the thing
  // he came to change, and appending it under today hid it below the fold.
  const cards = opened && !live.includes(opened) ? [opened, ...live] : live;

  const allTicks = ticks ?? [];
  const allDays = dayRows ?? [];
  const hardDays = allDays.filter((d) => d.hard_day).map((d) => d.day);
  // One a rolling week, counted from the day in question and not from today -
  // the trigger counts it that way, and on yesterday's card the two answers
  // differ by exactly one day at the edge.
  const hardDaySpentFor = (day: string) =>
    hardDays.some((d) => d !== day && d > addDays(day, -7));

  /**
   * The habit a goal is.
   *
   * Empty until he has opened the Five to her, and that is not an error state:
   * the screen is his to look at first, and there is simply nothing to tick on
   * it until her five exist as habits.
   */
  const habitOf = (goalId: GoalId) =>
    (goalHabits ?? []).find((h) => h.five_goal_id === goalId);
  const adopted = (goalHabits ?? []).length > 0;

  const toggle = (day: string, goalId: GoalId, done: boolean) => {
    const habit = habitOf(goalId);
    if (!habit) return;
    if (!done) {
      mark.mutate({ userId: subjectId, day, goalId, habitId: habit.id });
      return;
    }
    unmark.mutate({
      userId: subjectId,
      day,
      goalId,
      habitId: habit.id,
      asKeeper: isKeeper,
    });
  };

  return (
    <Desk narrow>
      <div className="curtain-reveal flex flex-col gap-3 pb-2">
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

        {!adopted && (
          <Card tone="flat">
            <p className="font-sans text-sm leading-relaxed text-muted">
              Her five are not habits yet. They appear in her streak, and become
              tappable here, the day you open the Five to her.
            </p>
          </Card>
        )}

        {cards.map((day) => (
          <DayCard
            key={day}
            day={day}
            zone={zone}
            ticks={allTicks}
            hardDay={hardDays.includes(day)}
            hardDayNote={allDays.find((d) => d.day === day)?.note ?? null}
            paused={pausedOn(pauses ?? [], day)}
            stakes={stakes}
            canMark={
              active &&
              adopted &&
              canMarkDay(day, zone, partnerZone, isKeeper, now)
            }
            isToday={day === today}
            isKeeper={isKeeper}
            onToggle={(goalId, done) => toggle(day, goalId, done)}
            onHardDay={() => setCalling(day)}
            onUndoHardDay={
              hardDays.includes(day)
                ? () => undoHardDay.mutate({ userId: subjectId, day })
                : undefined
            }
            hardDaySpent={hardDaySpentFor(day)}
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
            ticks={allTicks}
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

      <HardDay
        day={calling}
        onClose={() => setCalling(null)}
        onSave={(note) => {
          if (!calling) return;
          hardDay.mutate({ userId: subjectId, day: calling, note });
          setCalling(null);
        }}
      />

      <BetForm
        // Keyed to what he owes, so the stake field is never still showing the
        // zero it was mounted with before the pots arrived.
        key={pots.betCents - pots.stakedCents}
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
        // Keyed to the bet, so the payout field does not arrive carrying the
        // figure he typed for a different one.
        key={settling?.id ?? 'none'}
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
 * Calling a day hard, and saying why if she wants to.
 *
 * The note is the reason this is a panel and not a single tap. A hard day with
 * nothing in it is a hole in the data; a hard day with one line in it is a
 * message that reaches his phone, which is the thing she actually asked for when
 * she asked for help. Skipping it is one button and costs nothing.
 */
function HardDay({
  day,
  onClose,
  onSave,
}: {
  day: string | null;
  onClose: () => void;
  onSave: (note: string | null) => void;
}) {
  const [note, setNote] = useState('');
  if (!day) return null;
  return (
    <Dialog open onClose={onClose} title="Today was hard">
      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm leading-relaxed text-muted">
          Nothing more is asked of today, and nothing is owed. Anything you did
          still counts.
        </p>
        <Field label="Want to tell him why?" hint="He gets this, nobody else">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional"
          />
        </Field>
        <Button onClick={() => onSave(note || null)}>
          {note.trim() ? 'Send it, and rest' : 'Just rest'}
        </Button>
      </div>
    </Dialog>
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
            label="The Five is on"
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

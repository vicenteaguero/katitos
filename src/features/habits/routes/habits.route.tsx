import { useState, type ReactNode } from 'react';
import { Eye, Flame, Lock, Pencil, Plus, Settings2 } from 'lucide-react';
import { usePartner, useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Kicker,
  ProgressBar,
  SectionLabel,
  Skeleton,
  Switch,
  TopBarButton,
  confirmDialog,
  useScreenChrome,
} from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useToggleEntry } from '../api/habits.mutations';
import {
  pausedOn,
  useBets,
  useMoneyPauses,
  useMoneyPots,
  useMoneySettings,
  useMoneyWho,
  useUsdToClp,
} from '../api/money.queries';
import {
  useAddBet,
  useDeleteBet,
  useSaveMoneySettings,
  useSeedHerHabits,
  useSettleBet,
} from '../api/money.mutations';
import { maxStake, money, splitDay, toPesos, unplaced } from '../lib/money';
import { MoneyHero } from '../components/money-hero';
import { BetForm, BetList, SettleBet } from '../components/bets';
import { addDays, monthOf } from '../lib/days';
import {
  MAX_HERS,
  MAX_SLOTS,
  SLOT_THRESHOLDS,
  activeOn,
  canAddHabit,
  slotsAllowed,
} from '../lib/streak';
import { petName } from '../lib/names';
import { useStreak } from '../lib/use-streak';
import { HabitButton } from '../components/habit-button';
import { CallPill } from '../components/call-pill';
import { HabitEditor } from '../components/habit-editor';
import { DaySheet } from '../components/day-sheet';
import {
  MonthGrid,
  StateSwatch,
  type DayState,
} from '../components/month-grid';
import type { Bet, Habit } from '../types';
import '../habits.css';

/**
 * Our streak.
 *
 * Top to bottom it answers the three questions in the order they get asked:
 * how are we doing, what is left today, and how has it actually been going.
 * The habits you own come last - you change them once a month and look at
 * everything above them every day.
 */
export function HabitsRoute() {
  useTableSync('habits', qk.habits.list());
  useTableSync('habit_entries', qk.habits.allEntries());
  // The ledger only ever moves the pots; the bets only the list.
  useTableSync('money_ledger', qk.habits.all());
  useTableSync('bets', qk.habits.bets());

  const userId = useUserId();
  const { self, partner } = usePartner();
  const view = useStreak();
  const toggle = useToggleEntry();

  const { subject, isKeeper: isAdmin } = useMoneyWho();
  const subjectId = subject?.user_id ?? null;
  /**
   * His screen, seen as hers.
   *
   * There is no way for him to log in as her, and there should not be. This
   * only drops HIS privileges in the UI - the gear, the pencils, and the bet form - so he can check what she is actually looking at before
   * he shows it to her. The database is not fooled by it and does not need to
   * be: everything it would refuse her is already gone from the screen.
   */
  const [asHer, setAsHer] = useState(false);
  const isKeeper = isAdmin && !asHer;
  /**
   * Her day, whichever of us is holding the phone, and worked out before the
   * loading return because a hook cannot live behind one. The money is hers, and
   * so are the week and the month the pots count in.
   */
  const herDay = isAdmin ? view.partnerToday : view.today;
  const { stakes, active } = useMoneySettings(subjectId);
  const { pots } = useMoneyPots(subjectId, herDay);
  const { data: bets } = useBets();
  // Far enough back to cover the calendar's month.
  const moneyFrom = addDays(new Date().toISOString().slice(0, 10), -45);
  const { data: pauses } = useMoneyPauses(subjectId, moneyFrom);
  const seed = useSeedHerHabits();
  const saveSettings = useSaveMoneySettings();
  const addBet = useAddBet();
  const settleBet = useSettleBet();
  const deleteBet = useDeleteBet();
  const rate = useUsdToClp();

  // Null until touched: then it follows her calendar day, not UTC, which is a
  // month off on the evening of the last day in Chile.
  const [pickedMonth, setMonth] = useState<string | null>(null);
  const month = pickedMonth ?? monthOf(view.today);
  const [dials, setDials] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [settling, setSettling] = useState<Bet | null>(null);

  useScreenChrome(
    {
      title: 'Habits',
      action: (
        <TopBarButton label="The money" onClick={() => setDials(true)}>
          <Settings2 className="h-[18px] w-[18px]" />
        </TopBarButton>
      ),
    },
    []
  );
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    habit: Habit | null;
    /** A new one he is asking of her rather than taking on himself. */
    forHer?: boolean;
  } | null>(null);

  if (view.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" rounded="lg" />
        <Skeleton className="h-32 w-full" rounded="lg" />
        <Skeleton className="h-64 w-full" rounded="lg" />
      </div>
    );
  }

  const { today, partnerToday, shared, mine, theirs, streak } = view;
  const theirName =
    partner?.display_name?.split(' ')[0] ?? petName(partner?.role);

  /**
   * Whose habits are on top, and whose are below.
   *
   * The preview swaps the two SIDES, not just the buttons: bound to `isKeeper`
   * it showed him his own day with the pencils taken off, which is not her page
   * at all - her five were never rendered.
   */
  const ownHabits = asHer ? theirs : mine;
  const ownDay = asHer ? partnerToday : today;
  const otherHabits = asHer ? mine : theirs;
  const otherDay = asHer ? today : partnerToday;
  const otherName = asHer
    ? (self?.display_name?.split(' ')[0] ?? petName(self?.role))
    : theirName;
  const mineToday = ownHabits.filter((h) => activeOn(h, ownDay));
  const theirsToday = otherHabits.filter((h) => activeOn(h, otherDay));

  // The gate counts habits, not slot numbers: what a streak buys you is a
  // NUMBER of habits, and emptying one does not make the next one cheaper.
  const allowed = slotsAllowed(streak.days);
  const canAdd = canAddHabit(streak.days, mine.length);
  const nextNeeds =
    mine.length < MAX_SLOTS ? SLOT_THRESHOLDS[mine.length] : null;

  // A weekly habit that can no longer make its count has already ended the
  // week, and the streak with it. Saying so now beats a surprise on Sunday.
  const lostWeeks = [...mine, ...theirs]
    .filter((h) => h.schedule === 'weekly')
    .map((h) => view.weekly(h, h.user_id === userId ? today : partnerToday))
    .filter((w) => !w.possible);

  // Her habits are what the money rides on. Daily ones only: a weekly habit
  // cannot be missed on any particular day, so putting three dollars on a
  // Tuesday it was never owed would be inventing a debt.
  const hers = (isAdmin ? theirs : mine).filter(
    (h) => h.schedule === 'daily' && activeOn(h, herDay)
  );
  const herSplit = splitDay({
    habits: hers.map((h) => ({
      habitId: h.id,
      held: view.isDone(h.id, herDay),
    })),
    cheatDay: view.statusOf(herDay).cheat,
    paused: !active || pausedOn(pauses ?? [], herDay),
    stakes,
  });

  const callBy = shared ? view.tickedBy(shared.id, today) : null;
  const callByName = !callBy ? null : callBy === userId ? 'you' : theirName;

  /**
   * What the wheel opens on.
   *
   * The LIFETIME debt, not this week's. A day only settles once it is over for
   * both of us, which is two days after it ends, so the last days of every week
   * are written after the week has rolled and appear in no weekly figure at all.
   * Prefilling from the week therefore left money condemned and never placed.
   * The week is the rhythm; this is the obligation.
   */
  const owedClp = toPesos(unplaced(pots), rate);

  return (
    <div className="curtain-reveal space-y-3">
      {asHer && (
        <button
          type="button"
          onClick={() => setAsHer(false)}
          className="lift-press flex w-full items-center justify-center gap-2 rounded-full py-1.5 font-sans text-[11px] font-semibold text-gold"
          style={{
            background: 'rgba(228,195,106,.1)',
            border: '1px solid rgba(228,195,106,.3)',
          }}
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
          Seeing it as {theirName}. Tap to come back
        </button>
      )}

      {/* ── what her days are worth ──────────────────────────────────────── */}
      <MoneyHero pots={pots} />

      {/* ── how are we doing ─────────────────────────────────────────────── */}
      {/* Flat, not a hero: the money above it is the one lit card on this page
          now, and two gilt edges in a row is the law's whole complaint. */}
      <Card tone="flat" className="relative">
        <div className="flex items-center gap-2.5">
          <Flame
            className={cn(
              'h-8 w-8 shrink-0 text-gold',
              streak.days > 0 && 'streak-flame'
            )}
            strokeWidth={1.5}
          />
          <p className="gilt-text gilt-figures m-0 font-display text-[2.9rem] font-semibold leading-none">
            {streak.days}
          </p>
          <div className="min-w-0">
            <Kicker tone="muted" as="p">
              {streak.days === 1 ? 'day' : 'days'} in a row
            </Kicker>
            <p className="m-0 font-sans text-[11px] text-muted">
              {view.longest > streak.days
                ? `best so far ${view.longest}`
                : streak.days > 0
                  ? 'this is our best yet'
                  : 'it starts with today'}
              {streak.atStake > 0 && (
                <span className="text-copper">
                  {' '}
                  , +{streak.atStake} waiting on this week
                </span>
              )}
            </p>
          </div>
        </div>

        {nextNeeds !== null && nextNeeds > 0 && (
          <div className="mt-2.5">
            <ProgressBar
              value={Math.min(streak.days, nextNeeds)}
              max={nextNeeds}
              label="To the next habit"
            />
            <p className="mt-1 font-sans text-[11px] text-muted">
              {canAdd
                ? `A ${ordinal(mine.length + 1)} habit is yours to take`
                : `A ${ordinal(mine.length + 1)} habit in ${nextNeeds - streak.days} ${nextNeeds - streak.days === 1 ? 'day' : 'days'}`}
            </p>
          </div>
        )}
      </Card>

      {/* ── what is left today ───────────────────────────────────────────── */}
      <Card tone="hairline">
        {shared && activeOn(shared, ownDay) && (
          <CallPill
            habit={shared}
            done={view.isDone(shared.id, ownDay)}
            interactive={!asHer}
            byName={callByName}
            today
            onToggle={() =>
              toggle.mutate({
                habitId: shared.id,
                day: ownDay,
                on: !view.isDone(shared.id, today),
                shared: true,
                selfName: self?.display_name,
              })
            }
          />
        )}

        <SectionLabel
          className="mt-3"
          note={view.statusOf(ownDay).complete ? 'all in 🤍' : undefined}
        >
          Yours today
        </SectionLabel>
        {mineToday.length === 0 ? (
          <p className="font-sans text-xs text-muted">Nothing yours yet.</p>
        ) : (
          <HabitRow count={mineToday.length}>
            {mineToday.map((h) => (
              <HabitButton
                key={h.id}
                habit={h}
                done={view.isDone(h.id, ownDay)}
                // Nothing is tappable in the preview: it is there to be read,
                // and a stray thumb there would tick one of HER habits.
                interactive={!asHer}
                fluid={mineToday.length > 4}
                size={mineToday.length > 5 ? 'sm' : 'md'}
                weekly={
                  h.schedule === 'weekly' ? view.weekly(h, ownDay) : undefined
                }
                onToggle={() =>
                  toggle.mutate({
                    habitId: h.id,
                    day: ownDay,
                    on: !view.isDone(h.id, ownDay),
                  })
                }
              />
            ))}
          </HabitRow>
        )}

        {lostWeeks.length > 0 && (
          <p className="mt-2 font-sans text-[11px] text-danger">
            {lostWeeks
              .map((w) => `${w.habit.title} ${w.done}/${w.target}`)
              .join(', ')}{' '}
            , this week is short and the streak ends with it
          </p>
        )}

        {/* What today is worth, said only when it is good news.
            The price of an unfinished day belongs in the pot at the top, not
            under her morning: five copies of what she is about to cost him is
            the one thing a person who is already tired of being measured does
            not need before breakfast. */}
        {herSplit.missed.length === 0 && herSplit.giftCents > 0 && (
          <p className="mt-2 font-sans text-[11px] tabular-nums text-gold">
            {money(herSplit.giftCents)} yours today 🤍
          </p>
        )}

        {theirsToday.length > 0 && (
          <>
            <SectionLabel className="mt-3">{otherName}</SectionLabel>
            <HabitRow count={theirsToday.length}>
              {theirsToday.map((h) => (
                <HabitButton
                  key={h.id}
                  habit={h}
                  done={view.isDone(h.id, otherDay)}
                  interactive={false}
                  fluid={theirsToday.length > 4}
                  size={theirsToday.length > 5 ? 'sm' : 'md'}
                  weekly={
                    h.schedule === 'weekly'
                      ? view.weekly(h, otherDay)
                      : undefined
                  }
                />
              ))}
            </HabitRow>
          </>
        )}
      </Card>

      {/* ── how it has been going ────────────────────────────────────────── */}
      <Card tone="hairline">
        <MonthGrid
          month={month}
          onMonth={setMonth}
          furthest={view.furthest}
          isSettled={view.isSettled}
          statusOf={view.statusOf}
          since={view.since}
          onPick={setSheetDay}
        />
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          <Legend state="complete">both of us</Legend>
          <Legend state="partial">one of us</Legend>
          <Legend state="open">still open</Legend>
          <Legend state="missed">missed</Legend>
        </div>
      </Card>

      {/* ── the habits you own ───────────────────────────────────────────── */}
      {/* Only he may write a habit now, hers or his own, so only he is offered a
          pencil. She used to get one on every row of her own five, and an empty
          slot inviting her to add a sixth - both of which the database refuses.
          A button that cannot work is worse than no button. */}
      <Card tone="hairline">
        <SectionLabel
          note={isKeeper ? `${mine.length} of ${MAX_SLOTS}` : undefined}
        >
          My habits
        </SectionLabel>
        <div className="space-y-1.5">
          {ownHabits.map((h) => (
            <HabitLine
              key={h.id}
              habit={h}
              onEdit={isKeeper ? () => setEditing({ habit: h }) : undefined}
            />
          ))}

          {isKeeper && canAdd && (
            <button
              type="button"
              onClick={() => setEditing({ habit: null })}
              className="lift-press flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-gold"
              style={{ border: '1px dashed rgba(228,195,106,.4)' }}
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="font-sans text-sm">Add a habit</span>
            </button>
          )}

          {isKeeper &&
            Array.from(
              { length: MAX_SLOTS - Math.max(mine.length, allowed) },
              (_, i) => {
                const nth = Math.max(mine.length, allowed) + 1 + i;
                return (
                  <div
                    key={nth}
                    className="flex w-full items-center gap-2.5 rounded px-3 py-2 opacity-40"
                    style={{ border: '1px dashed rgba(251,245,240,.12)' }}
                  >
                    <Lock
                      className="h-3.5 w-3.5 shrink-0 text-muted"
                      strokeWidth={2}
                    />
                    <span className="font-sans text-[13px] text-muted">
                      A {ordinal(nth)} habit, at {SLOT_THRESHOLDS[nth - 1]} days
                    </span>
                  </div>
                );
              }
            )}
        </div>
      </Card>

      {/* ── the habits he is asking of her ───────────────────────────────── */}
      {isKeeper && (
        <Card tone="hairline">
          <SectionLabel
            note={`${theirs.length} of hers`}
            action={
              theirs.length === 0 && subjectId ? (
                <Button
                  variant="quiet"
                  size="xs"
                  onClick={() => seed.mutate(subjectId)}
                >
                  Give her the five
                </Button>
              ) : undefined
            }
          >
            {theirName}&rsquo;s habits
          </SectionLabel>
          <div className="space-y-1.5">
            {theirs.map((h) => (
              <HabitLine
                key={h.id}
                habit={h}
                onEdit={() => setEditing({ habit: h })}
              />
            ))}
            {theirs.length > 0 && theirs.length < MAX_HERS && (
              <button
                type="button"
                onClick={() => setEditing({ habit: null, forHer: true })}
                className="lift-press flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-gold"
                style={{ border: '1px dashed rgba(228,195,106,.4)' }}
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="font-sans text-sm">Ask one more of her</span>
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ── where the money went ─────────────────────────────────────────── */}
      <BetList
        bets={bets ?? []}
        isKeeper={isKeeper}
        rate={rate}
        unplacedCents={unplaced(pots)}
        onSettle={(bet) => setSettling(bet)}
        onAdd={() => setPlacing(true)}
      />

      <BetForm
        open={placing}
        day={today}
        owedClp={owedClp}
        maxClp={maxStake(unplaced(pots), rate)}
        zone={self?.timezone}
        onClose={() => setPlacing(false)}
        onSave={(draft) => {
          addBet.mutate({ ...draft, rate });
          setPlacing(false);
        }}
      />

      <SettleBet
        key={settling?.id ?? 'none'}
        bet={settling}
        rate={rate}
        onClose={() => setSettling(null)}
        onSettle={(status, payoutClp) => {
          if (!settling || !subjectId) return;
          settleBet.mutate({
            bet: settling,
            status,
            payoutClp,
            subjectId,
            day: herDay,
            rate,
          });
          setSettling(null);
        }}
        onDelete={() => {
          const bet = settling;
          if (!bet) return;
          setSettling(null);
          void confirmDialog({
            title: 'Delete this bet?',
            body: `${bet.pick} goes out of the log for good, and anything it paid her goes with it.`,
            confirmLabel: 'Delete it',
            danger: true,
          }).then((ok) => ok && deleteBet.mutate(bet.id));
        }}
      />

      <Dials
        key={`${stakes.giftCents}:${stakes.betCents}`}
        open={dials}
        onClose={() => setDials(false)}
        isKeeper={isKeeper}
        theirName={theirName}
        onSeeAsHer={
          isAdmin && !asHer
            ? () => {
                setAsHer(true);
                setDials(false);
              }
            : undefined
        }
        active={active}
        giftCents={stakes.giftCents}
        betCents={stakes.betCents}
        // The preview is for reading: its switch must not turn her money off.
        onSave={(next) =>
          !asHer &&
          subjectId &&
          saveSettings.mutate({ userId: subjectId, ...next })
        }
      />

      <DaySheet day={sheetDay} view={view} onClose={() => setSheetDay(null)} />
      {editing && (
        <HabitEditor
          open
          habit={editing.habit}
          forUserId={
            editing.forHer || editing.habit?.user_id === subject?.user_id
              ? (subjectId ?? undefined)
              : undefined
          }
          effectiveFrom={mine.length === 0 ? today : addDays(today, 1)}
          startsToday={mine.length === 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/**
 * Her switch and his two dials, in one panel behind the gear.
 *
 * Hers is first and it is a switch, not a menu: whatever else this is, it has
 * to be one tap to stop. His dials are below it and only he sees them - not
 * because the numbers are a secret, but because they are his money, and a screen
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
  theirName,
  onSeeAsHer,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  isKeeper: boolean;
  active: boolean;
  giftCents: number;
  betCents: number;
  theirName: string;
  /** Only he gets this, and only when he is not already looking at her side. */
  onSeeAsHer?: () => void;
  onSave: (next: {
    active?: boolean;
    giftCents?: number;
    betCents?: number;
  }) => void;
}) {
  const [gift, setGift] = useState(String(giftCents / 100));
  const [bet, setBet] = useState(String(betCents / 100));
  const asCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
  const giftNext = asCents(gift);
  const betNext = asCents(bet);
  const valid = Number.isFinite(giftNext) && Number.isFinite(betNext);

  return (
    <Dialog open={open} onClose={onClose} title="The money">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-fg">
              The money is on
            </p>
            <p className="font-sans text-xs leading-relaxed text-muted">
              Turn it off and both pots stop, and so do the reminders. Your
              habits stay exactly where they are.
            </p>
          </div>
          <Switch
            checked={active}
            onChange={(next) => onSave({ active: next })}
            label="The money is on"
          />
        </div>

        {isKeeper && (
          <div className="flex flex-col gap-3">
            <Field label="A habit held, to her gift" hint="dollars">
              <Input
                value={gift}
                onChange={(e) => setGift(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="One missed, to the betting money" hint="dollars">
              <Input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <p className="font-sans text-xs leading-relaxed tabular-nums text-muted">
              Days already settled keep the stakes they were settled at.
            </p>
            <Button
              disabled={!valid}
              onClick={() => {
                if (!valid) return;
                onSave({ giftCents: giftNext, betCents: betNext });
                onClose();
              }}
            >
              Save the stakes
            </Button>
          </div>
        )}

        {/* There is no logging in as her, and there should not be. This drops
            his own buttons for a moment so he can read the page she reads. */}
        {onSeeAsHer && (
          <Button variant="ghost" size="sm" onClick={onSeeAsHer}>
            See this page as {theirName}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/**
 * One habit, as a line in a list: face, name, how often.
 *
 * With a pencil when it is yours to change, and without one when it is not -
 * which for her is always, since he is the one who sets habits now.
 */
function HabitLine({ habit, onEdit }: { habit: Habit; onEdit?: () => void }) {
  const inside = (
    <>
      <span aria-hidden="true" className="text-[18px] leading-none">
        {habit.emoji}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
        {habit.title}
      </span>
      <span className="shrink-0 font-sans text-[11px] text-muted">
        {habit.schedule === 'weekly'
          ? `${habit.target_per_week} per week`
          : 'every day'}
      </span>
      {onEdit && (
        <Pencil className="h-3.5 w-3.5 shrink-0 text-gold/60" strokeWidth={2} />
      )}
    </>
  );
  const shape =
    'flex w-full items-center gap-2.5 rounded bg-surface-2 px-3 py-2 text-left';
  return onEdit ? (
    <button type="button" onClick={onEdit} className={cn(shape, 'lift-press')}>
      {inside}
    </button>
  ) : (
    <div className={shape}>{inside}</div>
  );
}

/**
 * A day's habits, in a row that cannot wrap.
 *
 * Five of hers at a fixed 62px plus their gaps are wider than an iPhone 13, so
 * the fifth dropped onto a line of its own and her day read 4 + 1. A grid with
 * one column each shares out whatever the card has instead: up to four they keep
 * their natural width and sit left, from five they divide the row, and past five
 * the circles come down a size rather than the row breaking.
 */
function HabitRow({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${count}, minmax(0, ${count > 4 ? '1fr' : '62px'}))`,
      }}
    >
      {children}
    </div>
  );
}

function Legend({ state, children }: { state: DayState; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StateSwatch state={state} />
      <span className="font-sans text-[10px] text-muted">{children}</span>
    </span>
  );
}

function ordinal(n: number): string {
  return ['first', 'second', 'third', 'fourth'][n - 1] ?? `${n}th`;
}

import { useState } from 'react';
import { Flame, Lock, Pencil, Plus } from 'lucide-react';
import { usePartner, useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { Card, Kicker, ProgressBar, SectionLabel, Skeleton } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useToggleEntry } from '../api/streak.mutations';
import { addDays, monthOf } from '../lib/days';
import {
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
import { MonthGrid } from '../components/month-grid';
import type { Habit } from '../types';
import '../streak.css';

/**
 * Our streak.
 *
 * Top to bottom it answers the three questions in the order they get asked:
 * how are we doing, what is left today, and how has it actually been going.
 * The habits you own come last - you change them once a month and look at
 * everything above them every day.
 */
export function StreakRoute() {
  useTableSync('habits', qk.streak.all());
  useTableSync('habit_entries', qk.streak.all());

  const userId = useUserId();
  const { self, partner } = usePartner();
  const view = useStreak();
  const toggle = useToggleEntry();

  const [month, setMonth] = useState(() =>
    monthOf(new Date().toISOString().slice(0, 10))
  );
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ habit: Habit | null } | null>(null);

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

  // The gate counts habits, not slot numbers: what a streak buys you is a
  // NUMBER of habits, and emptying one does not make the next one cheaper.
  const allowed = slotsAllowed(streak.days);
  const canAdd = canAddHabit(streak.days, mine.length);
  const nextNeeds =
    mine.length < MAX_SLOTS ? SLOT_THRESHOLDS[mine.length] : null;

  const callBy = shared ? view.tickedBy(shared.id, today) : null;
  const callByName = !callBy ? null : callBy === userId ? 'you' : theirName;

  return (
    <div className="curtain-reveal space-y-3">
      {/* ── how are we doing ─────────────────────────────────────────────── */}
      <Card tone="hero" className="relative">
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
                  · +{streak.atStake} waiting on this week
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
                ? `A ${ordinal(mine.length + 1)} habit is yours to take.`
                : `${nextNeeds - streak.days} more ${nextNeeds - streak.days === 1 ? 'day' : 'days'} and you can add a ${ordinal(mine.length + 1)}.`}
            </p>
          </div>
        )}
      </Card>

      {/* ── what is left today ───────────────────────────────────────────── */}
      <Card tone="hairline">
        {shared && activeOn(shared, today) && (
          <CallPill
            habit={shared}
            done={view.isDone(shared.id, today)}
            interactive
            byName={callByName}
            onToggle={() =>
              toggle.mutate({
                habitId: shared.id,
                day: today,
                on: !view.isDone(shared.id, today),
                shared: true,
                selfName: self?.display_name,
              })
            }
          />
        )}

        <SectionLabel
          className="mt-3"
          note={view.statusOf(today).complete ? 'all in 🤍' : undefined}
        >
          Yours today
        </SectionLabel>
        {mine.length === 0 ? (
          <p className="font-sans text-xs text-muted">
            Nothing of your own yet. Pick one down there and it starts today.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mine
              .filter((h) => activeOn(h, today))
              .map((h) => (
                <HabitButton
                  key={h.id}
                  habit={h}
                  done={view.isDone(h.id, today)}
                  interactive
                  weekly={
                    h.schedule === 'weekly' ? view.weekly(h, today) : undefined
                  }
                  onToggle={() =>
                    toggle.mutate({
                      habitId: h.id,
                      day: today,
                      on: !view.isDone(h.id, today),
                    })
                  }
                />
              ))}
          </div>
        )}

        {theirs.length > 0 && (
          <>
            <SectionLabel className="mt-3">{theirName}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {theirs
                .filter((h) => activeOn(h, partnerToday))
                .map((h) => (
                  <HabitButton
                    key={h.id}
                    habit={h}
                    done={view.isDone(h.id, partnerToday)}
                    interactive={false}
                    weekly={
                      h.schedule === 'weekly'
                        ? view.weekly(h, partnerToday)
                        : undefined
                    }
                  />
                ))}
            </div>
          </>
        )}
      </Card>

      {/* ── how it has been going ────────────────────────────────────────── */}
      <Card tone="hairline">
        <MonthGrid
          month={month}
          onMonth={setMonth}
          furthest={view.furthest}
          statusOf={view.statusOf}
          since={view.since}
          onPick={setSheetDay}
        />
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          <Legend swatch="linear-gradient(150deg,#e4c36a,#b8912f)">
            both of us
          </Legend>
          <Legend swatch="linear-gradient(90deg,#e4c36a 50%,transparent 50%)">
            one of us
          </Legend>
          <Legend border="1.5px dashed rgba(228,195,106,.55)">
            still open
          </Legend>
          <Legend border="1px solid rgba(251,245,240,.09)">missed</Legend>
        </div>
      </Card>

      {/* ── the habits you own ───────────────────────────────────────────── */}
      <Card tone="hairline">
        <SectionLabel note={`${mine.length} of ${MAX_SLOTS}`}>
          My habits
        </SectionLabel>
        <div className="space-y-1.5">
          {mine.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setEditing({ habit: h })}
              className="lift-press flex w-full items-center gap-2.5 rounded bg-surface-2 px-3 py-2 text-left"
            >
              <span aria-hidden="true" className="text-[18px] leading-none">
                {h.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate font-sans text-sm text-fg">
                {h.title}
              </span>
              <span className="shrink-0 font-sans text-[11px] text-muted">
                {h.schedule === 'weekly'
                  ? `${h.target_per_week}× a week`
                  : 'every day'}
              </span>
              <Pencil
                className="h-3.5 w-3.5 shrink-0 text-gold/60"
                strokeWidth={2}
              />
            </button>
          ))}

          {canAdd && (
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

          {Array.from(
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
                    A {ordinal(nth)} habit · at {SLOT_THRESHOLDS[nth - 1]} days
                  </span>
                </div>
              );
            }
          )}
        </div>
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">
          What you earn is yours to keep, even after a broken streak. But the
          gate counts how many you hold: put one away while the streak is down
          and getting back to {mine.length} costs{' '}
          {SLOT_THRESHOLDS[Math.max(0, Math.min(mine.length, MAX_SLOTS) - 1)]}{' '}
          days again.
        </p>
      </Card>

      <DaySheet day={sheetDay} view={view} onClose={() => setSheetDay(null)} />
      {editing && (
        <HabitEditor
          open
          habit={editing.habit}
          effectiveFrom={mine.length === 0 ? today : addDays(today, 1)}
          startsToday={mine.length === 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Legend({
  swatch,
  border,
  children,
}: {
  swatch?: string;
  border?: string;
  children: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full"
        style={{ background: swatch, border }}
      />
      <span className="font-sans text-[10px] text-muted">{children}</span>
    </span>
  );
}

function ordinal(n: number): string {
  return ['first', 'second', 'third', 'fourth'][n - 1] ?? `${n}th`;
}

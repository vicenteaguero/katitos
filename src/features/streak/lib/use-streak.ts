import { useEffect, useMemo } from 'react';
import { usePartner, useUserId } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { useEntries, useHabits } from '../api/streak.queries';
import { useIntents, withIntents } from './intents';
import type { Habit } from '../types';
import { addDays, furthestDay, isDayOpen, isSettled, localDay } from './days';
import {
  activeOn,
  computeStreak,
  dayStatus,
  daysToNextSlot,
  longestStreak,
  slotsAllowed,
  tickKey,
  weeklyProgress,
  type DayStatus,
  type DoneSet,
  type StreakResult,
  type WeeklyProgress,
} from './streak';

/**
 * Everything about the streak, assembled once.
 *
 * The widget and the screen both read from here so that the number on Home and
 * the number on the streak screen can never disagree - which they would the
 * moment two components each did their own arithmetic over the same rows.
 *
 * The clock ticks once a minute: a day rolling over eleven time zones away has
 * to move this UI without anybody reloading.
 */
export interface StreakView {
  isLoading: boolean;
  habits: Habit[];
  /** Live habits only, ordered: the shared one first, then slots. */
  live: Habit[];
  mine: Habit[];
  theirs: Habit[];
  shared: Habit | null;
  done: DoneSet;
  /** My own civil date. */
  today: string;
  /** Theirs, which is a different date for eleven hours out of every day. */
  partnerToday: string;
  /** The later of our two clocks - the day that closes the windows. */
  furthest: string;
  /** Today, and yesterday when it is still open. Newest first. */
  openDays: string[];
  streak: StreakResult;
  longest: number;
  slots: number;
  toNextSlot: number | null;
  isOpen: (day: string) => boolean;
  isSettled: (day: string) => boolean;
  isDone: (habitId: string, day: string) => boolean;
  /** Who put the tick there, for the shared habit where it could be either. */
  tickedBy: (habitId: string, day: string) => string | null;
  statusOf: (day: string) => DayStatus;
  weekly: (habit: Habit, day: string) => WeeklyProgress;
  /** Days I can still tick and have not finished. Drives the amber nudge. */
  unfinished: string[];
  /** The first day anything was due. Before it there was nothing to miss. */
  since: string | null;
}

export function useStreak(): StreakView {
  const now = useNow(60_000);
  const userId = useUserId();
  const { self, partner, isLoading: loadingMembers } = usePartner();
  const { data: habits, isLoading: loadingHabits } = useHabits();

  const today = localDay(self?.timezone, now);
  const partnerToday = localDay(partner?.timezone, now);
  const furthest = furthestDay(self?.timezone, partner?.timezone, now);

  const earliest = useMemo(
    () =>
      (habits ?? []).reduce<string | null>(
        (min, h) =>
          min === null || h.effective_from < min ? h.effective_from : min,
        null
      ),
    [habits]
  );

  const { data: entries, isLoading: loadingEntries } = useEntries(
    earliest ?? '',
    furthest,
    !!habits
  );

  const wanted = useIntents((s) => s.wanted);
  const settle = useIntents((s) => s.settle);

  const server = useMemo(
    () => new Set((entries ?? []).map((e) => tickKey(e.habit_id, e.day))),
    [entries]
  );

  // A wish lives only until the server agrees with it. Doing this in an effect
  // rather than during the read keeps the store out of the render pass.
  useEffect(() => {
    settle(server);
  }, [server, settle]);

  return useMemo(() => {
    const all = habits ?? [];
    // What you asked for, over what the server last said.
    const done: DoneSet = withIntents(server, wanted);
    const by = new Map(
      (entries ?? []).map((e) => [tickKey(e.habit_id, e.day), e.marked_by])
    );
    const live = all.filter((h) => h.archived_at === null);
    const shared = live.find((h) => h.kind === 'shared') ?? null;
    const mine = live.filter(
      (h) => h.kind === 'personal' && h.user_id === userId
    );
    const theirs = live.filter(
      (h) => h.kind === 'personal' && h.user_id !== userId
    );

    const streak = computeStreak({
      habits: all,
      done,
      selfId: userId,
      partnerId: partner?.user_id ?? null,
      selfZone: self?.timezone,
      partnerZone: partner?.timezone,
      furthest,
      now,
    });

    // Today, and yesterday while it is still open. Never more than two: the
    // window is exactly one day of slack, and offering a third would be a lie.
    const open = [today, addDays(today, -1)].filter((d) =>
      isDayOpen(d, self?.timezone, partner?.timezone, now)
    );

    const statusOf = (day: string) =>
      dayStatus(day, all, done, userId, partner?.user_id ?? null);

    return {
      isLoading: loadingMembers || loadingHabits || loadingEntries,
      habits: all,
      live,
      mine,
      theirs,
      shared,
      done,
      today,
      partnerToday,
      furthest,
      openDays: open,
      streak,
      longest: longestStreak(
        all,
        done,
        userId,
        partner?.user_id ?? null,
        furthest
      ),
      slots: slotsAllowed(streak.days),
      toNextSlot: daysToNextSlot(streak.days, mine.length),
      isOpen: (day: string) =>
        isDayOpen(day, self?.timezone, partner?.timezone, now),
      isSettled: (day: string) =>
        isSettled(day, self?.timezone, partner?.timezone, now),
      isDone: (habitId: string, day: string) => done.has(tickKey(habitId, day)),
      tickedBy: (habitId: string, day: string) =>
        by.get(tickKey(habitId, day)) ?? null,
      statusOf,
      weekly: (habit: Habit, day: string) =>
        weeklyProgress(
          habit,
          day,
          done,
          self?.timezone,
          partner?.timezone,
          now
        ),
      unfinished: open.filter((d) => !statusOf(d).complete),
      since: earliest,
    };
  }, [
    habits,
    earliest,
    entries,
    server,
    wanted,
    userId,
    self?.timezone,
    partner?.timezone,
    partner?.user_id,
    today,
    partnerToday,
    furthest,
    now,
    loadingMembers,
    loadingHabits,
    loadingEntries,
  ]);
}

/** Is this habit worth showing on this day at all? */
export { activeOn };

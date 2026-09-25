import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useMembers, useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import { addDays, localDay } from '@kernel/lib';
import {
  DEFAULT_STAKES,
  EMPTY_POTS,
  type Pots,
  type Stakes,
} from '../lib/money';
import type {
  FiveBet,
  FiveDayRow,
  FivePause,
  GoalHabit,
  GoalTick,
} from '../types';

/**
 * Whose five these are, and who is reading them.
 *
 * The five goals are hers. He is not a second player with a second set - he is
 * the one who pays, revokes and places the bets, and the screen he sees is the
 * same screen, which is why this returns both people rather than "me" and
 * "them". `isKeeper` is the only privilege in the feature.
 */
export function useFiveWho() {
  const userId = useUserId();
  const { data: members, isLoading } = useMembers();
  return useMemo(() => {
    const all = members ?? [];
    const keeper = all.find((m) => m.is_admin) ?? null;
    // Hers: the member who is not the keeper. On a one-member database (the QA
    // login) there is nobody, and every query below stays disabled.
    const subject = all.find((m) => !m.is_admin) ?? null;
    return {
      subject,
      keeper,
      zone: subject?.timezone ?? null,
      partnerZone: keeper?.timezone ?? null,
      isKeeper: !!userId && keeper?.user_id === userId,
      isSubject: !!userId && subject?.user_id === userId,
      isLoading,
    };
  }, [members, userId, isLoading]);
}

/**
 * Her five, as habits.
 *
 * A goal of the Five IS a habit in the streak - same row, same tick, same
 * calendar - and `five_goal_id` is what says which goal a habit stands for.
 * Until he opens the Five to her these do not exist, and every screen here
 * copes with an empty list.
 */
export function useGoalHabits(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.five.habits(userId ?? 'none'),
    enabled: !!userId,
    queryFn: async (): Promise<GoalHabit[]> => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId!)
        .not('five_goal_id', 'is', null)
        .is('archived_at', null);
      if (error) throw error;
      return (data ?? []) as GoalHabit[];
    },
  });
}

/** Her stakes and her pause switch, with the defaults the database also uses. */
export function useFiveSettings(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: qk.five.settings(userId ?? 'none'),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('five_settings')
        .select('gift_cents, bet_cents, active, started_on')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const stakes: Stakes = {
    giftCents: query.data?.gift_cents ?? DEFAULT_STAKES.giftCents,
    betCents: query.data?.bet_cents ?? DEFAULT_STAKES.betCents,
  };
  // No row yet means the scheduler has not seen her yet: never paused, and not
  // started, so the strip has nothing to draw. The row is written by the first
  // tick or the first touched dial, never seeded - seed.sql does not run on prod.
  return {
    ...query,
    stakes,
    active: query.data?.active ?? true,
    startedOn: query.data?.started_on ?? null,
  };
}

/** A row of `habit_entries`, read through the goal it belongs to. */
interface EntryRow {
  day: string;
  marked_by: string | null;
  revoked_at: string | null;
  habits: { five_goal_id: string | null } | null;
}

const toTicks = (rows: EntryRow[]): GoalTick[] =>
  rows
    .filter((r) => r.habits?.five_goal_id)
    .map((r) => ({
      day: r.day,
      goalId: r.habits!.five_goal_id!,
      markedBy: r.marked_by,
      revokedAt: r.revoked_at,
    }));

/**
 * Every tick of hers in a window, the revoked ones included.
 *
 * Read from `habit_entries` through the habit, because that is where a tick
 * lives now: the streak's calendar, the home card and this screen are three
 * views of the same rows. The revoked ones are not noise - the strip dims a day
 * he corrected, and they are the only record that she said yes and he took it
 * back.
 */
export function useGoalTicks(userId: string | null | undefined, from: string) {
  return useQuery({
    queryKey: qk.five.ticks(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<EntryRow[]> => {
      const { data, error } = await supabase
        .from('habit_entries')
        .select(
          'day, marked_by, revoked_at, habits!inner(five_goal_id, user_id)'
        )
        .eq('habits.user_id', userId!)
        .not('habits.five_goal_id', 'is', null)
        .gte('day', from)
        .order('day', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntryRow[];
    },
    // Built in `select`, never in the queryFn: the cache is dehydrated to
    // localStorage, and anything richer than JSON comes back broken.
    select: toTicks,
  });
}

/** The days she called hard, in the same window. */
export function useFiveDays(userId: string | null | undefined, from: string) {
  return useQuery({
    queryKey: qk.five.days(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<FiveDayRow[]> => {
      const { data, error } = await supabase
        .from('five_days')
        .select('*')
        .eq('user_id', userId!)
        .gte('day', from)
        .order('day', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Every stretch she had it switched off that could still cover a day on screen.
 *
 * Kept separate from `active`, which only says whether it is off RIGHT NOW. A
 * day inside a pause has no money on it and never will, and a card from last
 * week must not be relabelled by a switch she threw this morning.
 */
export function useFivePauses(userId: string | null | undefined, from: string) {
  return useQuery({
    queryKey: qk.five.pauses(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<FivePause[]> => {
      const { data, error } = await supabase
        .from('five_pauses')
        .select('from_day, to_day')
        .eq('user_id', userId!)
        .or(`to_day.is.null,to_day.gte.${from}`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Was the Five switched off on this day? */
export function pausedOn(pauses: FivePause[], day: string): boolean {
  return pauses.some(
    (p) => p.from_day <= day && (!p.to_day || p.to_day >= day)
  );
}

/** The two pots, summed by the database - one round trip, five integers. */
export function useFivePots(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: qk.five.pots(userId ?? 'none'),
    enabled: !!userId,
    queryFn: async (): Promise<Pots> => {
      const { data, error } = await supabase.rpc('five_pots', {
        p_user: userId!,
      });
      if (error) throw error;
      const row = (data ?? {}) as Record<string, number>;
      return {
        giftCents: row.gift_cents ?? 0,
        betCents: row.bet_cents ?? 0,
        stakedCents: row.staked_cents ?? 0,
        lostCents: row.lost_cents ?? 0,
        wonCents: row.won_cents ?? 0,
        openCents: row.open_cents ?? 0,
      };
    },
  });
  return { ...query, pots: query.data ?? EMPTY_POTS };
}

/** His bets, newest first. Nothing is ever deleted from this list. */
export function useFiveBets(limit = 60) {
  return useQuery({
    queryKey: qk.five.bets(),
    queryFn: async (): Promise<FiveBet[]> => {
      const { data, error } = await supabase
        .from('five_bets')
        .select('*')
        .order('placed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** The first day the screen asks about: far enough back for the strip. */
export function stripStart(
  zone: string | null | undefined,
  days: number
): string {
  return addDays(localDay(zone), -(days - 1));
}

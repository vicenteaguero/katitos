import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useMembers, useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import {
  DEFAULT_STAKES,
  EMPTY_POTS,
  type Pots,
  type Stakes,
} from '../lib/money';
import { addDays, localDay } from '../lib/five-days';
import type { FiveBet, FiveDayRow, FiveMark, FivePause } from '../types';

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
      isKeeper: !!userId && keeper?.user_id === userId,
      isSubject: !!userId && subject?.user_id === userId,
      isLoading,
    };
  }, [members, userId, isLoading]);
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

/**
 * Every tap in a window, live ones and revoked ones both.
 *
 * The revoked rows are not noise: the strip dims a day he corrected, and the
 * history is the only record that she said yes and he took it back.
 */
export function useFiveMarks(userId: string | null | undefined, from: string) {
  return useQuery({
    queryKey: qk.five.marks(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<FiveMark[]> => {
      const { data, error } = await supabase
        .from('five_marks')
        .select('*')
        .eq('user_id', userId!)
        .gte('day', from)
        .order('day', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
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

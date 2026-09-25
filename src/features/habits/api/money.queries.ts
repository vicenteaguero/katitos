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
import type { Bet, HardDayRow, MoneyPause } from '../types';

/**
 * Whose money this is, and who is looking at it.
 *
 * The habits are both of ours; the money is only on hers, and it is his. So
 * this returns both people rather than "me" and "them": `subject` is the one
 * the pot belongs to, `keeper` is the one paying for it, and `isKeeper` is the
 * only privilege in the feature.
 */
export function useMoneyWho() {
  const userId = useUserId();
  const { data: members, isLoading } = useMembers();
  return useMemo(() => {
    const all = members ?? [];
    const keeper = all.find((m) => m.is_admin) ?? null;
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

/** Her stakes and her pause switch, with the defaults the database also uses. */
export function useMoneySettings(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: qk.habits.settings(userId ?? 'none'),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('money_settings')
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
  // No row yet means the clock has not seen her: never paused, not started. The
  // row is written by the first tick or the first touched dial, never seeded -
  // seed.sql does not run on prod.
  return {
    ...query,
    stakes,
    active: query.data?.active ?? true,
    startedOn: query.data?.started_on ?? null,
  };
}

/** The days she called hard, and anything she said about them. */
export function useHardDays(userId: string | null | undefined, from: string) {
  return useQuery({
    queryKey: qk.habits.hardDays(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<HardDayRow[]> => {
      const { data, error } = await supabase
        .from('hard_days')
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
 * Every stretch she had the money switched off that could still cover a day on
 * screen. Kept apart from `active`, which only says whether it is off right
 * now: a day inside a pause has no money on it and never will, and a card from
 * last week must not be relabelled by a switch she threw this morning.
 */
export function useMoneyPauses(
  userId: string | null | undefined,
  from: string
) {
  return useQuery({
    queryKey: qk.habits.pauses(userId ?? 'none', from),
    enabled: !!userId,
    queryFn: async (): Promise<MoneyPause[]> => {
      const { data, error } = await supabase
        .from('money_pauses')
        .select('from_day, to_day')
        .eq('user_id', userId!)
        .or(`to_day.is.null,to_day.gte.${from}`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Was the money switched off on this day? */
export function pausedOn(pauses: MoneyPause[], day: string): boolean {
  return pauses.some(
    (p) => p.from_day <= day && (!p.to_day || p.to_day >= day)
  );
}

/**
 * The two pots, summed by the database - one round trip, and it comes back
 * knowing which week and which month it is talking about.
 *
 * `day` is HER day, because the periods are hers: at 2am in Chile she is already
 * a day into the week he is still finishing, and the pot that empties on Sunday
 * empties on her Sunday.
 */
export function useMoneyPots(userId: string | null | undefined, day: string) {
  const query = useQuery({
    queryKey: qk.habits.pots(userId ?? 'none', day),
    enabled: !!userId && !!day,
    queryFn: async (): Promise<Pots> => {
      const { data, error } = await supabase.rpc('money_pots_periods', {
        p_user: userId!,
        p_day: day,
      });
      if (error) throw error;
      const row = (data ?? {}) as Record<string, number | string | null>;
      const n = (k: string) => {
        const v = row[k];
        return typeof v === 'number' ? v : 0;
      };
      const d = (k: string) => {
        const v = row[k];
        return typeof v === 'string' ? v : null;
      };
      return {
        giftCents: n('gift_cents'),
        betCents: n('bet_cents'),
        stakedCents: n('staked_cents'),
        lostCents: n('lost_cents'),
        wonCents: n('won_cents'),
        openCents: n('open_cents'),
        giftPeriodCents: n('gift_period_cents'),
        betPeriodCents: n('bet_period_cents'),
        betPeriodStakedCents: n('bet_period_staked_cents'),
        giftFrom: d('gift_from'),
        giftTo: d('gift_to'),
        betFrom: d('bet_from'),
        betTo: d('bet_to'),
      };
    },
  });
  return { ...query, pots: query.data ?? EMPTY_POTS };
}

/** His bets, newest first. Nothing is ever deleted from this list. */
export function useBets(limit = 60) {
  return useQuery({
    queryKey: qk.habits.bets(),
    queryFn: async (): Promise<Bet[]> => {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .order('placed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

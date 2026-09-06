import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import {
  buildLoveMap,
  scoreDay,
  type DayRecord,
  type LoveMap,
} from '../lib/love-map';
import {
  parseOptions,
  type KnowMeQuestion,
  type QuestionWithDay,
  type RevealRow,
} from '../types';

/**
 * Every question assigned for the latest couple-day (1 legacy, up to 3 now),
 * ordered by slot. The route renders one block per entry; each is answered and
 * revealed independently (all already keyed by day_id).
 */
export function useTodayAll() {
  return useQuery({
    queryKey: [...qk.knowMe.today(), 'all'],
    queryFn: async (): Promise<QuestionWithDay[]> => {
      const { data: latest, error: lErr } = await supabase
        .from('know_me_days')
        .select('couple_day')
        .order('couple_day', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) throw lErr;
      if (!latest) return [];

      const { data, error } = await supabase
        .from('know_me_days')
        .select('*, question:know_me_questions(*)')
        .eq('couple_day', latest.couple_day)
        // created_at mirrors slot order (slots inserted 0→2) and never 400s if
        // the 3-per-day migration hasn't been applied yet.
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((day) => {
        const question = day.question as KnowMeQuestion;
        return {
          dayId: day.id,
          coupleDay: day.couple_day,
          question,
          options: parseOptions(question.options),
        };
      });
    },
  });
}

/**
 * My OWN answer row only. Anti-peek: never reads the partner's row - explicit
 * columns, filtered to the current user.
 */
export function useMyAnswer(dayId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.knowMe.myAnswer(dayId ?? 'none'),
    enabled: !!dayId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('know_me_answers')
        .select('own_choice, guess_choice, reaction_path, submitted_at')
        .eq('day_id', dayId as string)
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Whether the partner has submitted today - derived ONLY from presence (no
 * choices ever travel over this signal).
 */
export function usePartnerSubmitted(dayId: string | undefined, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...qk.knowMe.reveal(dayId ?? 'none'), 'partner-submitted'],
    // Only poll once I've answered - before that the partner's state is moot
    // and the DailyCard shows regardless.
    enabled: !!dayId && !!userId && enabled,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('know_me_presence')
        .select('user_id', { count: 'exact', head: true })
        .eq('day_id', dayId as string)
        .neq('user_id', userId as string);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

/** The masking reveal RPC. Enable only once both have submitted. */
export function useReveal(dayId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.knowMe.reveal(dayId ?? 'none'),
    enabled: !!dayId && enabled,
    queryFn: async (): Promise<RevealRow[]> => {
      const { data, error } = await supabase.rpc('know_me_reveal', {
        p_day_id: dayId as string,
      });
      if (error) throw error;
      return (data ?? []) as RevealRow[];
    },
  });
}

interface RevealedRow {
  day_id: string | null;
  user_id: string | null;
  own_choice: string | null;
  guess_choice: string | null;
  day: {
    couple_day: string;
    question: {
      category: string;
      prompt: string;
      options: KnowMeQuestion['options'];
    } | null;
  } | null;
}

/** A history row enriched with the prompt + resolved option labels for display. */
export interface HistoryEntry {
  coupleDay: string;
  prompt: string;
  selfOwnLabel: string;
  partnerOwnLabel: string;
  selfRight: boolean;
  partnerRight: boolean;
}

/**
 * Raw revealed rows (both-submitted days) - the single source shared by the
 * love-map AND the history archive, so they hit ONE fetch + cache entry instead
 * of two duplicate queries against the same view.
 */
function useRevealedRows() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.knowMe.history(),
    enabled: !!userId,
    queryFn: async (): Promise<RevealedRow[]> => {
      const { data, error } = await supabase
        .from('know_me_revealed')
        .select(
          'day_id, user_id, own_choice, guess_choice, day:know_me_days(couple_day, question:know_me_questions(category, prompt, options))'
        );
      if (error) throw error;
      return (data ?? []) as unknown as RevealedRow[];
    },
  });
}

/** Group revealed rows by day_id (one entry per couple-day). */
function groupByDay(rows: RevealedRow[]): RevealedRow[][] {
  const byDay = new Map<string, RevealedRow[]>();
  for (const r of rows) {
    if (!r.day_id) continue;
    const list = byDay.get(r.day_id) ?? [];
    list.push(r);
    byDay.set(r.day_id, list);
  }
  return [...byDay.values()];
}

/**
 * History as `DayRecord[]` from the current user's perspective (drives the
 * love-map). Derived - memoized - from the shared revealed-rows query.
 */
export function useHistory(): { data: DayRecord[] | undefined } {
  const userId = useUserId();
  const { data } = useRevealedRows();
  return useMemo(() => {
    if (!data) return { data: undefined };
    const records = groupByDay(data).map((list) => {
      const mine = list.find((r) => r.user_id === userId);
      const theirs = list.find((r) => r.user_id !== userId);
      const day = mine?.day ?? theirs?.day ?? null;
      return {
        coupleDay: day?.couple_day ?? '',
        category: day?.question?.category ?? 'general',
        bothSubmitted: list.length === 2,
        selfOwn: mine?.own_choice ?? null,
        selfGuess: mine?.guess_choice ?? null,
        partnerOwn: theirs?.own_choice ?? null,
        partnerGuess: theirs?.guess_choice ?? null,
      } satisfies DayRecord;
    });
    records.sort((a, b) => b.coupleDay.localeCompare(a.coupleDay));
    return { data: records };
  }, [data, userId]);
}

/** The love-map, derived (memoized) from history. */
export function useLoveMap(): LoveMap | undefined {
  const { data } = useHistory();
  return useMemo(() => (data ? buildLoveMap(data) : undefined), [data]);
}

/**
 * History enriched with prompts + resolved option labels for the archive list.
 * Reverse-chronological; both-submitted days only (from the view).
 */
export function useHistoryEntries(): { data: HistoryEntry[] | undefined } {
  const userId = useUserId();
  const { data } = useRevealedRows();
  return useMemo(() => {
    if (!data) return { data: undefined };
    const entries: HistoryEntry[] = [];
    for (const list of groupByDay(data)) {
      if (list.length !== 2) continue;
      const mine = list.find((r) => r.user_id === userId);
      const theirs = list.find((r) => r.user_id !== userId);
      const q = mine?.day?.question ?? theirs?.day?.question ?? null;
      const opts = parseOptions(q?.options ?? []);
      const labelOf = (id: string | null) =>
        opts.find((o) => o.id === id)?.label ?? '-';
      const { selfRight, partnerRight } = scoreDay({
        coupleDay: '',
        category: q?.category ?? 'general',
        bothSubmitted: true,
        selfOwn: mine?.own_choice ?? null,
        selfGuess: mine?.guess_choice ?? null,
        partnerOwn: theirs?.own_choice ?? null,
        partnerGuess: theirs?.guess_choice ?? null,
      });
      entries.push({
        coupleDay: mine?.day?.couple_day ?? theirs?.day?.couple_day ?? '',
        prompt: q?.prompt ?? '',
        selfOwnLabel: labelOf(mine?.own_choice ?? null),
        partnerOwnLabel: labelOf(theirs?.own_choice ?? null),
        selfRight,
        partnerRight,
      });
    }
    entries.sort((a, b) => b.coupleDay.localeCompare(a.coupleDay));
    return { data: entries };
  }, [data, userId]);
}

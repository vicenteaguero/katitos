import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Polaroid } from '../types';

/** Rows per page of the album. A day is 1–2 rows, so this is ~3 weeks. */
const PAGE_SIZE = 40;

/**
 * How many recent photos the non-gallery consumers load. Bounded on purpose:
 * this used to be an unbounded `select('*')`, which at 100+ days meant the app
 * shell pulled the entire table on every boot. The album picker and the cache
 * warmer only ever want the recent ones.
 */
const RECENT_LIMIT = 120;

/**
 * Recent polaroids, newest first - for the cache warmer and the album's
 * "add a polaroid" picker. The gallery uses `usePolaroidPages()` instead.
 */
export function usePolaroids() {
  return useQuery({
    queryKey: qk.polaroids.list(),
    queryFn: async (): Promise<Polaroid[]> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .order('day', { ascending: false })
        .limit(RECENT_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * The album, a page at a time.
 *
 * Pagination is the single biggest thing that made old photos slow: every row
 * rendered an <img> whose signed URL was fetched on mount, so opening the album
 * fired hundreds of requests before anything appeared.
 */
export function usePolaroidPages() {
  return useInfiniteQuery({
    queryKey: qk.polaroids.pages(),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Polaroid[]> => {
      const from = (pageParam as number) * PAGE_SIZE;
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        // day DESC, then a stable tiebreak so a day's two photos never swap
        // order between pages (which would make them flicker while scrolling).
        .order('day', { ascending: false })
        .order('user_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE ? undefined : all.length,
  });
}

/**
 * Every photo across the days that are still open - at most two dates, so at
 * most four rows. One request, so the nav button can know the whole picture
 * (today's, and the day borrowed from the other clock) without firing a query
 * per date from inside a loop.
 */
export function useOpenDayPolaroids(days: string[]) {
  const key = [...days].sort().join(',');
  return useQuery({
    queryKey: qk.polaroids.openDays(key),
    enabled: days.length > 0,
    queryFn: async (): Promise<Polaroid[]> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .in('day', days);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Every photo for one calendar day - up to two, one each.
 *
 * Deliberately NOT `.maybeSingle()`: that was correct when a day held one photo
 * for the couple, and it throws PGRST116 the moment we each have our own.
 */
export function useDayPolaroids(day: string | null | undefined) {
  return useQuery({
    queryKey: qk.polaroids.byDay(day ?? 'none'),
    enabled: !!day,
    queryFn: async (): Promise<Polaroid[]> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .eq('day', day as string);
      if (error) throw error;
      return data ?? [];
    },
  });
}

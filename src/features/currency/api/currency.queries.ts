import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Rate } from '@kernel/lib';

/** A rate row plus when it was last refreshed (drives the staleness hint). */
export interface RateRow extends Rate {
  fetched_at: string;
}

export function useRates() {
  return useQuery({
    queryKey: qk.currency.rates(),
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<RateRow[]> => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('base, quote, rate, fetched_at');
      if (error) throw error;
      return (data ?? []) as RateRow[];
    },
  });
}

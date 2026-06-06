import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Rate } from '@kernel/lib';

export function useRates() {
  return useQuery({
    queryKey: qk.currency.rates(),
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<Rate[]> => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('base, quote, rate');
      if (error) throw error;
      return (data ?? []) as Rate[];
    },
  });
}

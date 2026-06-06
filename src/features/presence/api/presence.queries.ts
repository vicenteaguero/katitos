import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { Tables } from '@kernel/supabase';
import { qk } from '@kernel/query';

export type AppOpen = Tables<'app_opens'>;

/** Recent app-open events (both members), newest first. */
export function useRecentOpens() {
  return useQuery({
    queryKey: qk.presence.appOpens(),
    queryFn: async (): Promise<AppOpen[]> => {
      const { data, error } = await supabase
        .from('app_opens')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

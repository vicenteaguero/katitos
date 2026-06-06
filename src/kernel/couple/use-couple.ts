import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { Tables, TablesUpdate } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';

export type Couple = Tables<'couple'>;

/** The single shared couple row (start date, monthsversary day…). */
export function useCouple() {
  return useQuery({
    queryKey: qk.couple.self(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couple')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Couple | null;
    },
  });
}

export function useUpdateCouple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<'couple'>) => {
      const { error } = await supabase
        .from('couple')
        .update(patch)
        .eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.couple.self() }),
  });
}

/** Update the current user's own member profile. */
export function useUpdateMember() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<'couple_members'>) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('couple_members')
        .update(patch)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.couple.members() }),
  });
}

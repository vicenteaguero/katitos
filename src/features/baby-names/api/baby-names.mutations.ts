import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { BabyNameInput, VoteValue } from '../types';

export function useCreateBabyName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BabyNameInput) => {
      const { error } = await supabase.from('baby_names').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.babyNames.all() }),
  });
}

export function useVoteName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nameId,
      vote,
    }: {
      nameId: string;
      vote: VoteValue;
    }) => {
      // user_id defaults to auth.uid() on the server.
      const { error } = await supabase
        .from('baby_name_votes')
        .upsert({ name_id: nameId, vote }, { onConflict: 'name_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.babyNames.list() }),
  });
}

export function useDeleteBabyName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('baby_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.babyNames.all() }),
  });
}

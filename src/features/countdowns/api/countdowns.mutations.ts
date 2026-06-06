import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { CountdownInput } from '../types';

export function useCreateCountdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CountdownInput) => {
      const { error } = await supabase.from('countdowns').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.countdowns.all() }),
  });
}

export function useUpdateCountdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: CountdownInput & { id: string }) => {
      const { error } = await supabase
        .from('countdowns')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.countdowns.all() }),
  });
}

export function useDeleteCountdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('countdowns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.countdowns.all() }),
  });
}

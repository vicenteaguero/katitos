import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';

export function useStartFight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase.from('fights').insert({ reason });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fights.all() }),
  });
}

export function useEndFight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      resolution,
    }: {
      id: string;
      resolution?: string;
    }) => {
      const { error } = await supabase
        .from('fights')
        .update({
          ended_at: new Date().toISOString(),
          resolution: resolution ?? null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fights.all() }),
  });
}

export function useDeleteFight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fights').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fights.all() }),
  });
}

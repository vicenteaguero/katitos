import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { TablesUpdate } from '@kernel/supabase';
import type { PunitoInput } from '../types';

export function useCreatePunito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PunitoInput) => {
      const { error } = await supabase.from('punitos').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.punitos.list() }),
  });
}

export function useUpdatePunito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: TablesUpdate<'punitos'> & { id: string }) => {
      const { error } = await supabase
        .from('punitos')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.punitos.list() }),
  });
}

export function useDeletePunito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('punitos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.punitos.list() }),
  });
}

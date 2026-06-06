import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topic: string;
      description?: string | null;
    }) => {
      const { error } = await supabase.from('decisions').insert({
        topic: input.topic,
        description: input.description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions.list() }),
  });
}

export function useSetPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decisionId: string;
      position: string;
      note?: string | null;
    }) => {
      const { error } = await supabase.from('decision_positions').upsert(
        {
          decision_id: input.decisionId,
          position: input.position,
          note: input.note ?? null,
        },
        { onConflict: 'decision_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions.list() }),
  });
}

export function useAgree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; agreed_value: string }) => {
      const { error } = await supabase
        .from('decisions')
        .update({ status: 'agreed', agreed_value: input.agreed_value })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions.list() }),
  });
}

export function useReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('decisions')
        .update({ status: 'open', agreed_value: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions.list() }),
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decisions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions.list() }),
  });
}

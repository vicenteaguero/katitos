import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { LovePhrase } from '../lib/pick-phrase';

/** Every phrase, in the order they're kept. Both of us can read them. */
export function useLovePhrases() {
  return useQuery({
    queryKey: qk.love.phrases(),
    // They change rarely and only from one place; no need to re-fetch often.
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<LovePhrase[]> => {
      const { data, error } = await supabase
        .from('love_phrases')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function refresh(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.love.phrases() });
}

/**
 * Writes are admin-only, enforced in RLS - the UI hides the editor from her,
 * and the database would refuse her anyway.
 */
export function useAddLovePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      text: string;
      gender: 'm' | 'f' | 'any';
      weight?: number;
    }) => {
      const { data: last } = await supabase
        .from('love_phrases')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await supabase.from('love_phrases').insert({
        text: v.text.trim(),
        gender: v.gender,
        weight: v.weight ?? 1,
        position: (last?.position ?? -1) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });
}

export function useUpdateLovePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      text?: string;
      gender?: 'm' | 'f' | 'any';
      weight?: number;
      enabled?: boolean;
    }) => {
      const { id, ...patch } = v;
      if (patch.text != null) patch.text = patch.text.trim();
      const { error } = await supabase
        .from('love_phrases')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });
}

export function useDeleteLovePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('love_phrases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';

export interface NewNote {
  body: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: NewNote) => {
      const { error } = await supabase.from('chalkboard_notes').insert(note);
      if (error) throw error;
      void notifyPartner({
        title: 'Katitos ✍️',
        body: 'New note on the wall',
        url: '/wall',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chalkboard.notes() }),
  });
}

export function useMoveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, x, y }: { id: string; x: number; y: number }) => {
      const { error } = await supabase
        .from('chalkboard_notes')
        .update({ x, y })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chalkboard.notes() }),
  });
}

export function useRotateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rotation }: { id: string; rotation: number }) => {
      const { error } = await supabase
        .from('chalkboard_notes')
        .update({ rotation })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chalkboard.notes() }),
  });
}

export function useResizeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      scale,
      width,
    }: {
      id: string;
      scale: number;
      width: number | null;
    }) => {
      const { error } = await supabase
        .from('chalkboard_notes')
        .update({ scale, width })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chalkboard.notes() }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chalkboard_notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chalkboard.notes() }),
  });
}

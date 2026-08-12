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
        kind: 'wall',
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

/**
 * Scale, rotation and width in ONE write.
 *
 * A single pinch produces all three at once, so sending them as two separate
 * mutations meant two round-trips and two full refetches per gesture — and a
 * window where the note was half-updated on the other screen.
 */
export function useTransformNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      scale,
      rotation,
      width,
    }: {
      id: string;
      scale: number;
      rotation: number;
      width: number | null;
    }) => {
      const { error } = await supabase
        .from('chalkboard_notes')
        .update({ scale, rotation, width })
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

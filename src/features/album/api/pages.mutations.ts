import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';

/** Name a page, and say when it happened. */
export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      title?: string | null;
      onDate?: string | null;
    }) => {
      const patch: { title?: string | null; on_date?: string | null } = {};
      if (v.title !== undefined) patch.title = v.title?.trim() || null;
      if (v.onDate !== undefined) patch.on_date = v.onDate || null;
      const { error } = await supabase
        .from('album_pages')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

/**
 * Tear a page out.
 *
 * Its placements go with it, but not the photos: they stay in the library, so
 * a page removed by mistake costs you an arrangement, never a picture.
 */
export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; bookId: string }) => {
      const { error } = await supabase
        .from('album_pages')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

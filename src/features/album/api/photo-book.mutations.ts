import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';

/**
 * Placing, moving, styling and removing stickers now lives in
 * `placements.mutations.ts`, and uploading in `library.mutations.ts` — a photo
 * and its place on a page stopped being the same row when the library arrived.
 * Only page-level work is left here.
 */

/** Append an empty page at the end of the book. */
export function useAddPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { bookId: string; position: number }) => {
      const { error } = await supabase
        .from('album_pages')
        .insert({ book_id: v.bookId, position: v.position });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

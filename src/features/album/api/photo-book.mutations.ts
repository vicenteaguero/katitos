import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';

/**
 * Placing, moving, styling and removing stickers now lives in
 * `placements.mutations.ts`, and uploading in `library.mutations.ts` - a photo
 * and its place on a page stopped being the same row when the library arrived.
 * Only page-level work is left here.
 */

/**
 * Add a SHEET to the end of the book - which is two pages, not one.
 *
 * Paper has two sides. Adding one page at a time left the book with an odd
 * number of them, which meant a blank endpaper had to be conjured up to keep
 * the back board flipping on its own, and the turn stopped making any physical
 * sense. A sheet is the thing that actually gets added to a book.
 */
export function useAddPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { bookId: string; position: number }) => {
      const { error } = await supabase.from('album_pages').insert([
        { book_id: v.bookId, position: v.position },
        { book_id: v.bookId, position: v.position + 1 },
      ]);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

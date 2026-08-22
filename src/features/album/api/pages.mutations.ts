import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';

/**
 * Tear a page out.
 *
 * Its placements go with it, but not the photos: they stay in the library, so
 * a page removed by mistake costs you an arrangement, never a picture.
 *
 * ONLY the page you chose. Pages are added in pairs because paper has two
 * sides, but tearing out its twin to keep the physics tidy would throw away
 * work you never asked to lose — so instead a fresh blank page is added at the
 * end when what remains is odd. The book stays even; nothing you made goes.
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

      const { data: left, error: countErr } = await supabase
        .from('album_pages')
        .select('position')
        .eq('book_id', v.bookId)
        .order('position', { ascending: false });
      if (countErr) throw countErr;
      if (!left || left.length % 2 === 0) return;

      const { error: insErr } = await supabase
        .from('album_pages')
        .insert({ book_id: v.bookId, position: (left[0]?.position ?? -1) + 1 });
      if (insErr && insErr.code !== '23505') throw insErr;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

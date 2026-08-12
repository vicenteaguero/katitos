import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import type { TablesUpdate } from '@kernel/supabase';
import { BUCKETS, proxyPath, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import type { AlbumBook } from '../types';

function refresh(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.album.books() });
}

/**
 * Start a new album — one era of ours per book.
 *
 * New books are `scope: 'era'`. That is not cosmetic: the two originals
 * (Pololini, Summer Panini) are still resolved by scope with `.maybeSingle()`,
 * so anything else claiming 'life' or 'trip' would break them.
 */
export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      startsOn?: string | null;
      endsOn?: string | null;
    }): Promise<AlbumBook> => {
      const { data: last } = await supabase
        .from('album_books')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from('album_books')
        .insert({
          scope: 'era',
          title: input.title.trim(),
          starts_on: input.startsOn || null,
          ends_on: input.endsOn || null,
          position: (last?.position ?? -1) + 1,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => refresh(qc),
  });
}

export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      title?: string;
      startsOn?: string | null;
      endsOn?: string | null;
      archived?: boolean;
    }) => {
      const patch: TablesUpdate<'album_books'> = {};
      if (v.title !== undefined) patch.title = v.title.trim();
      if (v.startsOn !== undefined) patch.starts_on = v.startsOn || null;
      if (v.endsOn !== undefined) patch.ends_on = v.endsOn || null;
      if (v.archived !== undefined) patch.archived = v.archived;
      const { error } = await supabase
        .from('album_books')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      refresh(qc);
      void qc.invalidateQueries({ queryKey: qk.album.byId(v.id) });
    },
  });
}

/** Put a photo on the album's cover. */
export function useSetAlbumCover() {
  const qc = useQueryClient();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    mutationFn: async (v: { id: string; blob: Blob }) => {
      const path = `covers/${v.id}/${nanoid(8)}.jpg`;
      await uploadPhoto(BUCKETS.album, path, v.blob);
      const { error } = await supabase
        .from('album_books')
        .update({ cover_path: path })
        .eq('id', v.id);
      if (error) throw error;
      return path;
    },
    onSuccess: (path, v) => {
      refresh(qc);
      void qc.invalidateQueries({ queryKey: qk.album.byId(v.id) });
      qc.removeQueries({ queryKey: ['signed-url', BUCKETS.album, path] });
      qc.removeQueries({
        queryKey: ['signed-url', BUCKETS.album, proxyPath(path)],
      });
      void qc.invalidateQueries({ queryKey: ['signed-urls'] });
    },
  });
}

/**
 * Delete an album and everything in it.
 *
 * Only ever offered for `scope: 'era'` books — Pololini and the trip book are
 * not deletable from the UI. Pages and photos cascade; the stored image bytes
 * are deliberately left behind rather than risking deleting a photo that is
 * also referenced from the polaroid album.
 */
export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('album_books')
        .delete()
        .eq('id', id)
        .eq('scope', 'era');
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });
}

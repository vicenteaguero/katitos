import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import {
  BUCKETS,
  proxyPath,
  storagePaths,
  usePhotoUpload,
} from '@kernel/storage';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import type { PhotoSource } from '../types';

interface AddPhotoInput {
  bookId: string;
  pageId: string;
  slot: number;
  caption?: string | null;
  source: PhotoSource;
  /** Required when `source === 'upload'`. */
  blob?: Blob;
  /** Required when `source === 'polaroid'` — the polaroid's stored image_path. */
  polaroidPath?: string;
}

/**
 * Place (or replace) a photo in a page slot. Uploads land at a unique versioned
 * path under the album bucket; polaroids just reference the existing path in the
 * polaroids bucket. Upserts on `(page_id, slot)` so re-adding swaps in place.
 */
export function useAddPhoto() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();

  return useMutation({
    mutationFn: async (input: AddPhotoInput) => {
      let imagePath: string | null = null;
      if (input.source === 'upload') {
        if (!input.blob) throw new Error('No photo to upload');
        const path = storagePaths.albumPhoto(input.bookId, nanoid(12));
        await uploadPhoto(BUCKETS.album, path, input.blob);
        imagePath = path;
      } else {
        imagePath = input.polaroidPath ?? null;
      }
      const { error } = await supabase.from('album_photos').upsert(
        {
          page_id: input.pageId,
          slot: input.slot,
          image_path: imagePath,
          caption: input.caption ?? null,
          source: input.source,
          ...(userId ? { created_by: userId } : {}),
        },
        { onConflict: 'page_id,slot' }
      );
      if (error) throw error;
      return { imagePath };
    },
    onSuccess: ({ imagePath }, input) => {
      void qc.invalidateQueries({ queryKey: qk.album.pages(input.bookId) });
      // Fetch the fresh signed URL for an uploaded path (polaroid paths are reused).
      if (imagePath && input.source === 'upload') {
        qc.removeQueries({
          queryKey: ['signed-url', BUCKETS.album, imagePath],
        });
        qc.removeQueries({
          queryKey: ['signed-url', BUCKETS.album, proxyPath(imagePath)],
        });
      }
    },
  });
}

export function useSetPhotoCaption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; bookId: string; caption: string }) => {
      const { error } = await supabase
        .from('album_photos')
        .update({ caption: v.caption.trim() || null })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

/** Move/resize a sticker — its normalized position (x, y ∈ 0..1) and scale. */
export function useMovePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      x: number;
      y: number;
      scale?: number;
      rotation?: number;
    }) => {
      const patch: {
        x: number;
        y: number;
        scale?: number;
        rotation?: number;
      } = { x: v.x, y: v.y };
      if (v.scale != null) patch.scale = v.scale;
      if (v.rotation != null) patch.rotation = v.rotation;
      const { error } = await supabase
        .from('album_photos')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

export function useRemovePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      source: PhotoSource;
      path: string | null;
    }) => {
      const { error } = await supabase
        .from('album_photos')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
      // Only uploaded bytes are ours to clean up; polaroid paths belong to the
      // polaroid feature and must stay.
      if (v.source === 'upload' && v.path) {
        await supabase.storage
          .from(BUCKETS.album)
          .remove([v.path, proxyPath(v.path)]);
      }
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

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

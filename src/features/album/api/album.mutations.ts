import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { downscaleImage } from '../lib/downscale';
import type { AlbumSticker, StickerHalf } from '../types';

interface StickInput {
  chapterId: string;
  slotId: string;
  half: StickerHalf;
  blob: Blob;
  caption?: string | null;
  location?: string | null;
  takenOn?: string | null;
  /** For the push body + optimistic author label. */
  slotTitle?: string;
  selfName?: string;
}

/**
 * Peel-and-stick: downscale → upload (upsert in place) → upsert the sticker row
 * on `(slot_id, half)`. Optimistically shows a local object-URL, pushes the
 * partner, and surgically busts the signed-url cache for the new path.
 */
export function useStickSticker() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { upload } = useUpload();

  return useMutation({
    mutationFn: async (input: StickInput) => {
      const path = storagePaths.albumSticker(
        input.chapterId,
        input.slotId,
        input.half
      );
      const small = await downscaleImage(input.blob);
      await upload(BUCKETS.album, path, small, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase.from('album_stickers').upsert(
        {
          slot_id: input.slotId,
          half: input.half,
          image_path: path,
          caption: input.caption ?? null,
          location: input.location ?? null,
          taken_on: input.takenOn ?? null,
        },
        { onConflict: 'slot_id,half' }
      );
      if (error) throw error;
      return { path };
    },
    onMutate: async (input) => {
      // Optimistic insert with a local object URL so the peel feels instant.
      await qc.cancelQueries({ queryKey: qk.album.stickers() });
      const prev = qc.getQueryData<AlbumSticker[]>(qk.album.stickers());
      const objectUrl = URL.createObjectURL(input.blob);
      const path = storagePaths.albumSticker(
        input.chapterId,
        input.slotId,
        input.half
      );
      // Prime the signed-url cache with the local preview.
      qc.setQueryData(['signed-url', BUCKETS.album, path], objectUrl);

      const optimistic: AlbumSticker = {
        id: `optimistic-${input.slotId}-${input.half}`,
        slot_id: input.slotId,
        half: input.half,
        image_path: path,
        caption: input.caption ?? null,
        location: input.location ?? null,
        taken_on: input.takenOn ?? null,
        created_by: userId ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<AlbumSticker[]>(qk.album.stickers(), (old) => {
        const without = (old ?? []).filter(
          (s) => !(s.slot_id === input.slotId && s.half === input.half)
        );
        return [...without, optimistic];
      });
      return { prev, objectUrl, path };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.album.stickers(), ctx.prev);
      if (ctx?.objectUrl) URL.revokeObjectURL(ctx.objectUrl);
      if (ctx?.path)
        qc.removeQueries({ queryKey: ['signed-url', BUCKETS.album, ctx.path] });
    },
    onSuccess: (data, input) => {
      void notifyPartner({
        kind: 'album',
        title: `📖 ${input.selfName ?? 'Someone'} added a sticker`,
        body: input.slotTitle ?? 'A new memory',
        url: '/album',
        tag: 'album-sticker',
      });
      void qc.invalidateQueries({ queryKey: qk.album.stickers() });
      // Surgical: drop the local preview so the real signed URL is fetched.
      qc.removeQueries({
        queryKey: ['signed-url', BUCKETS.album, data.path],
      });
    },
    onSettled: (_d, _e, _v, ctx) => {
      if (ctx?.objectUrl) URL.revokeObjectURL(ctx.objectUrl);
    },
  });
}

export function useRemoveSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; path: string }) => {
      const { error } = await supabase
        .from('album_stickers')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
      // Best-effort storage cleanup; row removal is the source of truth.
      await supabase.storage.from(BUCKETS.album).remove([v.path]);
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.album.stickers() });
      qc.removeQueries({ queryKey: ['signed-url', BUCKETS.album, v.path] });
    },
  });
}

/** Author a custom slot at `position = per-chapter max + 1`, floored at 1000. */
export function useCreateCustomSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      chapterId: string;
      title: string;
      hint?: string | null;
    }) => {
      const { data: existing, error: maxErr } = await supabase
        .from('album_slots')
        .select('position')
        .eq('chapter_id', v.chapterId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const position = Math.max(1000, (existing?.position ?? 999) + 1);
      const { error } = await supabase.from('album_slots').insert({
        chapter_id: v.chapterId,
        title: v.title,
        hint: v.hint ?? null,
        position,
        tier: 'common',
        is_duo: false,
        source: 'custom',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.album.slots() }),
  });
}

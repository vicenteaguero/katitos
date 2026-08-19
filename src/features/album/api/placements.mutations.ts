import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { toast } from '@kernel/ui';
import type {
  AlbumPageWithPhotos,
  PlacedSticker,
  StickerFont,
  StickerFrame,
} from '../types';
import {
  needsNormalize,
  nextZBack,
  nextZFront,
  normalizeZ,
} from '../components/photo-book/sticker-math';

type Pages = AlbumPageWithPhotos[];

/**
 * Patch ONE sticker in the cached book, in place.
 *
 * Every drag used to end with `invalidateQueries`, which refetched the whole
 * book, rebuilt every page element and made StPageFlip re-initialise — on each
 * release. The row we changed is the row we already know, so we write it
 * straight into the cache and leave the rest of the book untouched. The
 * partner's changes still arrive on their own through `useTableSync`.
 */
function patchSticker(
  qc: QueryClient,
  bookId: string,
  id: string,
  patch: Partial<PlacedSticker>
): Pages | undefined {
  const key = qk.album.pages(bookId);
  const before = qc.getQueryData<Pages>(key);
  qc.setQueryData<Pages>(key, (pages) =>
    pages?.map((p) => ({
      ...p,
      stickers: p.stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  );
  return before;
}

/** Every depth currently in use on the page a sticker sits on. */
function depthsOnPage(
  qc: QueryClient,
  bookId: string,
  pageId: string
): number[] {
  const pages = qc.getQueryData<Pages>(qk.album.pages(bookId));
  return pages?.find((p) => p.id === pageId)?.stickers.map((s) => s.z) ?? [];
}

/** Where a sticker sits, how big it is and which way up — one row, no refetch. */
export function useMoveSticker() {
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
        .from('album_placements')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onMutate: (v) => ({
      previous: patchSticker(qc, v.bookId, v.id, {
        x: v.x,
        y: v.y,
        ...(v.scale != null ? { scale: v.scale } : {}),
        ...(v.rotation != null ? { rotation: v.rotation } : {}),
      }),
    }),
    onError: (e: Error, v, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(qk.album.pages(v.bookId), ctx.previous);
      toast.error(e.message);
    },
  });
}

/** Bring a sticker to the very front, or tuck it right at the back. */
export function useRestack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      pageId: string;
      to: 'front' | 'back';
    }) => {
      // Read the depths and patch the cache in ONE place. Splitting this across
      // `onMutate` and here meant the second read saw the first one's optimistic
      // write and picked a depth one higher — so the screen and the database
      // quietly disagreed, and every tap inflated `z` twice as fast as it should.
      const zs = depthsOnPage(qc, v.bookId, v.pageId);

      // Depths only ever grow apart — front, back, front — so after enough
      // fiddling the range drifts. Tidy the page back to 0..n-1 before it gets
      // silly; nothing moves, the order is exactly what it was.
      if (needsNormalize(zs)) {
        const pages = qc.getQueryData<Pages>(qk.album.pages(v.bookId));
        const page = pages?.find((p) => p.id === v.pageId);
        if (page) {
          await Promise.all(
            normalizeZ(page.stickers).map((row) =>
              supabase
                .from('album_placements')
                .update({ z: row.z })
                .eq('id', row.id)
            )
          );
          await qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) });
        }
      }

      const fresh = depthsOnPage(qc, v.bookId, v.pageId);
      const z = v.to === 'front' ? nextZFront(fresh) : nextZBack(fresh);
      const previous = patchSticker(qc, v.bookId, v.id, { z });
      const { error } = await supabase
        .from('album_placements')
        .update({ z })
        .eq('id', v.id);
      if (error) {
        if (previous) qc.setQueryData(qk.album.pages(v.bookId), previous);
        throw error;
      }
      return z;
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Caption, words, frame, font — everything about how a sticker looks. */
export function useStyleSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      patch: {
        caption?: string | null;
        body?: string | null;
        frame?: StickerFrame;
        font_family?: StickerFont;
        font_size?: number;
        font_weight?: number;
      };
    }) => {
      const { error } = await supabase
        .from('album_placements')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onMutate: (v) => ({
      previous: patchSticker(
        qc,
        v.bookId,
        v.id,
        v.patch as Partial<PlacedSticker>
      ),
    }),
    onError: (e: Error, v, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(qk.album.pages(v.bookId), ctx.previous);
      toast.error(e.message);
    },
  });
}

/** Put a library photo (or a new line of text) on a page, in front. */
export function usePlaceSticker() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      bookId: string;
      pageId: string;
      photoId?: string;
      body?: string;
      x?: number;
      y?: number;
      rotation?: number;
    }) => {
      const { data, error } = await supabase
        .from('album_placements')
        .insert({
          page_id: v.pageId,
          photo_id: v.photoId ?? null,
          kind: v.photoId ? 'photo' : 'text',
          body: v.body ?? null,
          x: v.x ?? 0.5,
          y: v.y ?? 0.5,
          rotation: v.rotation ?? 0,
          z: nextZFront(depthsOnPage(qc, v.bookId, v.pageId)),
          ...(userId ? { created_by: userId } : {}),
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_id, v) =>
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

/**
 * Take a sticker off the page. The photo itself stays in the library.
 *
 * This is the half of "remove" that used to be missing: the only delete on
 * offer threw away the picture and its bytes with no way back, from a 22px
 * target hanging off a rotated sticker. Now it is undoable, so it can afford
 * to be one tap.
 */
export function useUnplaceSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { sticker: PlacedSticker; bookId: string }) => {
      const { error } = await supabase
        .from('album_placements')
        .delete()
        .eq('id', v.sticker.id);
      if (error) throw error;
    },
    onMutate: (v) => {
      const key = qk.album.pages(v.bookId);
      const previous = qc.getQueryData<Pages>(key);
      qc.setQueryData<Pages>(key, (pages) =>
        pages?.map((p) => ({
          ...p,
          stickers: p.stickers.filter((s) => s.id !== v.sticker.id),
        }))
      );
      return { previous };
    },
    onError: (e: Error, v, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(qk.album.pages(v.bookId), ctx.previous);
      toast.error(e.message);
    },
  });
}

/** Put back a sticker that was just taken off, exactly where it was. */
export function useRestoreSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { sticker: PlacedSticker; bookId: string }) => {
      const { photo: _photo, ...row } = v.sticker;
      const { error } = await supabase.from('album_placements').insert(row);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) }),
  });
}

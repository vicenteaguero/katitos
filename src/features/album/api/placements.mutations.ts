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
  AlbumPhoto,
  FrameColor,
  MatWidth,
  PlacedSticker,
  StickerFont,
  StickerFrame,
  StickerShape,
} from '../types';
import {
  nextZFront,
  orderStickers,
  stepOrder,
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
    // ONLY the page that actually changed gets a new object. Cloning every
    // page — which `pages.map(p => ({...p}))` did — broke `PageFace`'s memo for
    // all of them at once, so `flipPages` came back all-new and StPageFlip
    // re-ran its layout for the whole book on every single drag release.
    pages?.map((p) => {
      if (!p.stickers.some((s) => s.id === id)) return p;
      const stickers = p.stickers.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );
      return {
        ...p,
        // Depth is DRAWN from the order of this array, not from the raw `z` —
        // so changing `z` without re-sorting moved nothing at all until a
        // refetch happened to reorder it. Which is why bringing a photo to the
        // front only appeared to work once you left the editor.
        stickers: patch.z == null ? stickers : orderStickers(stickers),
      };
    })
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
      // Still landing: it has no row to update yet, and the screen already
      // shows where it went.
      if (isPending(v.id)) return;
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

/**
 * Move a sticker ONE place through the stack.
 *
 * It used to jump to the very front or the very back. With ten things on a
 * page that only ever reaches two arrangements, and getting one photo to sit
 * between two others could not be done at all. A step at a time reaches any
 * order, and one press of the other button undoes it.
 *
 * The whole page is renumbered 0..n-1 as it goes, which also keeps the sparse
 * depths from drifting — so the old `needsNormalize` dance is no longer needed.
 */
export function useRestack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      pageId: string;
      to: 'front' | 'back';
    }) => {
      if (isPending(v.id)) return;
      const pages = qc.getQueryData<Pages>(qk.album.pages(v.bookId));
      const page = pages?.find((p) => p.id === v.pageId);
      if (!page) return;

      const rows = stepOrder(page.stickers, v.id, v.to === 'front' ? 1 : -1);
      if (!rows.length) return; // already at that end

      // On screen first — depth is drawn from the ORDER of the array, so the
      // cache write has to re-sort, not just re-number.
      const key = qk.album.pages(v.bookId);
      const previous = qc.getQueryData<Pages>(key);
      qc.setQueryData<Pages>(key, (all) =>
        all?.map((p) =>
          p.id !== v.pageId
            ? p
            : {
                ...p,
                stickers: orderStickers(
                  p.stickers.map((s) => {
                    const row = rows.find((r) => r.id === s.id);
                    return row ? { ...s, z: row.z } : s;
                  })
                ),
              }
        )
      );

      const results = await Promise.all(
        rows.map((row) =>
          supabase
            .from('album_placements')
            .update({ z: row.z })
            .eq('id', row.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        if (previous) qc.setQueryData(key, previous);
        throw failed.error;
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Everything about how a sticker looks — words, cut, mount and crop. */
export interface StickerStyle {
  caption?: string | null;
  body?: string | null;
  frame?: StickerFrame;
  frame_color?: FrameColor;
  mat_width?: MatWidth;
  shape?: StickerShape;
  crop_x?: number;
  crop_y?: number;
  crop_zoom?: number;
  font_family?: StickerFont;
  font_size?: number;
  font_weight?: number;
}

/** Caption, words, frame, font, shape, crop — how a sticker looks. */
export function useStyleSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      bookId: string;
      patch: StickerStyle;
    }) => {
      if (isPending(v.id)) return;
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

/**
 * A sticker that only exists on this phone, for the moment between the tap and
 * the database agreeing. Recognisable so nothing tries to move or delete it.
 */
const PENDING = 'pending:';
export const isPending = (id: string) => id.startsWith(PENDING);

/** Put a library photo (or a new line of text) on a page, in front.
 *
 * OPTIMISTIC, because this is the tap you make two hundred times while
 * building a book. It used to invalidate the whole book on success — a full
 * refetch and a StPageFlip re-initialisation per photo placed, which is why
 * filling a page felt like wading. The sticker appears at once and the real
 * row quietly replaces it.
 */
export function usePlaceSticker() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      bookId: string;
      pageId: string;
      photoId?: string;
      photo?: AlbumPhoto | null;
      body?: string;
      x?: number;
      y?: number;
      rotation?: number;
      z?: number;
      tempId?: string;
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
          z: v.z ?? nextZFront(depthsOnPage(qc, v.bookId, v.pageId)),
          ...(userId ? { created_by: userId } : {}),
        })
        .select('*, photo:album_photos(*)')
        .single();
      if (error) throw error;
      return data as PlacedSticker;
    },
    onMutate: (v) => {
      const key = qk.album.pages(v.bookId);
      const previous = qc.getQueryData<Pages>(key);
      const tempId =
        v.tempId ?? `${PENDING}${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      const optimistic = {
        id: tempId,
        localKey: tempId,
        page_id: v.pageId,
        photo_id: v.photoId ?? null,
        photo: v.photo ?? null,
        kind: v.photoId ? 'photo' : 'text',
        body: v.body ?? null,
        caption: null,
        x: v.x ?? 0.5,
        y: v.y ?? 0.5,
        scale: 1,
        rotation: v.rotation ?? 0,
        z: v.z ?? nextZFront(depthsOnPage(qc, v.bookId, v.pageId)),
        frame: 'plain',
        frame_color: 'cream',
        shape: 'natural',
        crop_x: 0.5,
        crop_y: 0.5,
        crop_zoom: 1,
        font_family: 'display',
        font_size: 0.06,
        font_weight: 600,
        created_by: userId ?? '',
        created_at: now,
        updated_at: now,
      } as PlacedSticker;
      qc.setQueryData<Pages>(key, (pages) =>
        pages?.map((p) =>
          p.id === v.pageId
            ? { ...p, stickers: [...p.stickers, optimistic] }
            : p
        )
      );
      return { previous, tempId };
    },
    onError: (e: Error, v, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(qk.album.pages(v.bookId), ctx.previous);
      toast.error(e.message);
    },
    onSuccess: (row, v, ctx) => {
      // Swap the stand-in for the real row IN PLACE — no refetch, so the book
      // never re-initialises and the page you are looking at does not blink.
      qc.setQueryData<Pages>(qk.album.pages(v.bookId), (pages) =>
        pages?.map((p) =>
          p.id === v.pageId
            ? {
                ...p,
                stickers: p.stickers.map((s) =>
                  s.id === ctx?.tempId
                    ? {
                        ...row,
                        photo: v.photo ?? row.photo,
                        // Same key as the stand-in, so React updates the
                        // element it already has instead of throwing it away
                        // and building another.
                        localKey: ctx.tempId,
                      }
                    : s
                ),
              }
            : p
        )
      );
    },
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
      if (isPending(v.sticker.id)) return;
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
      // `localKey` is ours, not the database's — it exists only so React can
      // keep the element it already drew.
      const { photo: _photo, localKey: _localKey, ...row } = v.sticker;
      // Upsert, not insert: Undo is a button you can press twice, and the
      // second press used to throw a duplicate-key error at you.
      const { error } = await supabase
        .from('album_placements')
        .upsert(row, { onConflict: 'id' });
      if (error) throw error;
    },
    onMutate: (v) => {
      const key = qk.album.pages(v.bookId);
      const previous = qc.getQueryData<Pages>(key);
      qc.setQueryData<Pages>(key, (pages) =>
        pages?.map((p) =>
          p.id === v.sticker.page_id &&
          !p.stickers.some((s) => s.id === v.sticker.id)
            ? { ...p, stickers: [...p.stickers, v.sticker] }
            : p
        )
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

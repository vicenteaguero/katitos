import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { BUCKETS, proxyPath, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import type { WishlistItem } from '../types';

/**
 * Everything here writes optimistically.
 *
 * The brief was that this has to feel instant — no spinner between deciding to
 * add something and seeing it. So the cache is updated first and rolled back
 * only if the server disagrees, which it almost never does.
 */
function useOptimisticItems(listId: string) {
  const qc = useQueryClient();
  const key = qk.wishlists.items(listId);

  return {
    qc,
    key,
    /** Snapshot + apply, returning the rollback context. */
    apply: async (fn: (prev: WishlistItem[]) => WishlistItem[]) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<WishlistItem[]>(key) ?? [];
      qc.setQueryData<WishlistItem[]>(key, fn(prev));
      return { prev };
    },
    rollback: (ctx?: { prev: WishlistItem[] }) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
    },
    settle: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: qk.wishlists.all() });
    },
  };
}

export interface NewItemInput {
  title: string;
  description?: string | null;
  link?: string | null;
  price?: number | null;
  currency?: string | null;
  /** Default is HIDDEN — a gift list is for surprises first. */
  visible: boolean;
  image?: Blob | null;
}

export function useAddItem(listId: string) {
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();
  const o = useOptimisticItems(listId);

  return useMutation({
    mutationFn: async (input: NewItemInput) => {
      if (!userId) throw new Error('Not signed in');

      let imagePath: string | null = null;
      if (input.image) {
        // Owner-prefixed: storage RLS uses this first path segment to keep a
        // hidden item's picture unreadable by the person it's hidden from.
        imagePath = `${userId}/${nanoid(12)}.jpg`;
        await uploadPhoto(BUCKETS.wishlist, imagePath, input.image);
      }

      const { error } = await supabase.from('wishlist_items').insert({
        list_id: listId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        link: input.link?.trim() || null,
        price: input.price ?? null,
        currency: input.currency ?? null,
        visible: input.visible,
        image_path: imagePath,
        added_by: userId,
      });
      if (error) {
        if (imagePath) {
          await supabase.storage
            .from(BUCKETS.wishlist)
            .remove([imagePath, proxyPath(imagePath)])
            .catch(() => {});
        }
        throw error;
      }
    },
    onMutate: async (input) => {
      // A placeholder row so the item appears the instant you tap Add.
      const optimistic = {
        id: `optimistic-${nanoid(6)}`,
        list_id: listId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        link: input.link?.trim() || null,
        price: input.price ?? null,
        currency: input.currency ?? null,
        visible: input.visible,
        got: false,
        priority: 0,
        position: 0,
        image_path: null,
        added_by: userId ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as WishlistItem;
      return o.apply((prev) => [optimistic, ...prev]);
    },
    onError: (_e, _v, ctx) => o.rollback(ctx),
    onSettled: () => o.settle(),
  });
}

export function useUpdateItem(listId: string) {
  const o = useOptimisticItems(listId);
  return useMutation({
    mutationFn: async (v: { id: string } & Partial<WishlistItem>) => {
      const { id, ...patch } = v;
      const { error } = await supabase
        .from('wishlist_items')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (v) =>
      o.apply((prev) => prev.map((i) => (i.id === v.id ? { ...i, ...v } : i))),
    onError: (_e, _v, ctx) => o.rollback(ctx),
    onSettled: () => o.settle(),
  });
}

export function useDeleteItem(listId: string) {
  const o = useOptimisticItems(listId);
  return useMutation({
    mutationFn: async (v: { id: string; imagePath: string | null }) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
      if (v.imagePath) {
        await supabase.storage
          .from(BUCKETS.wishlist)
          .remove([v.imagePath, proxyPath(v.imagePath)])
          .catch(() => {});
      }
    },
    onMutate: async (v) => o.apply((prev) => prev.filter((i) => i.id !== v.id)),
    onError: (_e, _v, ctx) => o.rollback(ctx),
    onSettled: () => o.settle(),
  });
}

/** Replace an item's picture. */
export function useSetItemImage(listId: string) {
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();
  const o = useOptimisticItems(listId);
  return useMutation({
    mutationFn: async (v: {
      id: string;
      blob: Blob;
      oldPath: string | null;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const path = `${userId}/${nanoid(12)}.jpg`;
      await uploadPhoto(BUCKETS.wishlist, path, v.blob);
      const { error } = await supabase
        .from('wishlist_items')
        .update({ image_path: path })
        .eq('id', v.id);
      if (error) throw error;
      if (v.oldPath) {
        await supabase.storage
          .from(BUCKETS.wishlist)
          .remove([v.oldPath, proxyPath(v.oldPath)])
          .catch(() => {});
      }
      return path;
    },
    onSettled: () => {
      o.settle();
      void o.qc.invalidateQueries({ queryKey: ['signed-urls'] });
    },
  });
}

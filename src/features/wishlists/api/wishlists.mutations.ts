import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';

export function useCreateWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      category?: string | null;
      description?: string | null;
    }) => {
      const { error } = await supabase.from('wishlists').insert({
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wishlists.all() }),
  });
}

export function useDeleteWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wishlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wishlists.all() }),
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listId: string;
      title: string;
      description?: string | null;
      link?: string | null;
    }) => {
      const { error } = await supabase.from('wishlist_items').insert({
        list_id: input.listId,
        title: input.title,
        description: input.description ?? null,
        link: input.link ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: qk.wishlists.items(vars.listId) }),
  });
}

export function useVoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      vote,
    }: {
      itemId: string;
      listId: string;
      vote: 1 | -1;
    }) => {
      // user_id defaults to auth.uid() on the server.
      const { error } = await supabase
        .from('wishlist_votes')
        .upsert({ item_id: itemId, vote }, { onConflict: 'item_id,user_id' });
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: qk.wishlists.items(vars.listId) }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; listId: string }) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: qk.wishlists.items(vars.listId) }),
  });
}

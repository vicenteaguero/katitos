import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Wishlist, WishlistItemWithVotes } from '../types';

export function useWishlists() {
  return useQuery({
    queryKey: qk.wishlists.list(),
    queryFn: async (): Promise<Wishlist[]> => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWishlistItems(listId: string) {
  return useQuery({
    queryKey: qk.wishlists.items(listId),
    queryFn: async (): Promise<WishlistItemWithVotes[]> => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*, wishlist_votes(*)')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

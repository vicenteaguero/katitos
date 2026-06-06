import type { Tables } from '@kernel/supabase';

export type Wishlist = Tables<'wishlists'>;
export type WishlistItem = Tables<'wishlist_items'>;

export type WishlistItemWithVotes = WishlistItem & {
  wishlist_votes: Tables<'wishlist_votes'>[];
};

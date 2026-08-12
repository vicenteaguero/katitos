import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useMembers, useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';
import type { Wishlist, WishlistItem } from '../types';

/** Him → "For Katito", her → "For Katita". */
function giftListTitle(role: string | null | undefined): string {
  return role === 'a' ? 'For Katito' : 'For Katita';
}

/**
 * The gift lists — one per person, self-provisioned on first open.
 *
 * Production ships no seed, so the two lists have to create themselves the way
 * the album book does. Insert races are survivable: a duplicate just loses and
 * we re-read.
 */
export function useWishlists() {
  const { data: members } = useMembers();
  const ready = (members?.length ?? 0) > 0;

  return useQuery({
    queryKey: qk.wishlists.list(),
    enabled: ready,
    queryFn: async (): Promise<Wishlist[]> => {
      const read = async () => {
        const { data, error } = await supabase
          .from('wishlists')
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data ?? [];
      };

      let lists = await read();

      // One gift list per member, keyed by owner. Anything else they've made
      // (a shared "someday" list, say) is left exactly as it is.
      const missing = (members ?? []).filter(
        (m) => !lists.some((l) => l.owner_user_id === m.user_id)
      );
      if (missing.length > 0) {
        const { error } = await supabase.from('wishlists').insert(
          missing.map((m, i) => ({
            title: giftListTitle(m.role),
            owner_user_id: m.user_id,
            emoji: m.role === 'a' ? '🧉' : '🐻‍❄️',
            position: i,
          }))
        );
        // 23505 = someone else got there first; just re-read.
        if (error && error.code !== '23505') throw error;
        lists = await read();
      }
      return lists;
    },
  });
}

/**
 * The items on one list.
 *
 * Hidden items simply do not arrive for the person they're hidden from — the
 * filtering is in RLS, not here, so there is no way for the UI to leak one by
 * accident.
 */
export function useWishlistItems(listId: string | undefined) {
  return useQuery({
    queryKey: qk.wishlists.items(listId ?? 'none'),
    enabled: !!listId,
    queryFn: async (): Promise<WishlistItem[]> => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('list_id', listId as string)
        .order('got', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** How many items each list holds, for the list-of-lists screen. */
export function useWishlistCounts() {
  const userId = useUserId();
  return useQuery({
    queryKey: [...qk.wishlists.all(), 'counts', userId] as const,
    // Rows from the queryFn, Map in `select` — query data is persisted to
    // localStorage, and a Map does not survive that round-trip.
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('list_id, got');
      if (error) throw error;
      return data ?? [];
    },
    select: (rows) => {
      const out = new Map<string, { total: number; got: number }>();
      for (const row of rows) {
        const cur = out.get(row.list_id) ?? { total: 0, got: 0 };
        cur.total += 1;
        if (row.got) cur.got += 1;
        out.set(row.list_id, cur);
      }
      return out;
    },
  });
}

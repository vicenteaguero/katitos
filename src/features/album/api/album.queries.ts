import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { DateTime } from '@kernel/lib';
import {
  computeProgress,
  dayOfYear,
  type AlbumProgress,
} from '../lib/progression';
import type { AlbumChapter, AlbumSlot, AlbumSticker } from '../types';

const LONG_STALE = 60 * 60 * 1000; // catalog rarely changes

export function useAlbumChapters() {
  return useQuery({
    queryKey: qk.album.chapters(),
    staleTime: LONG_STALE,
    queryFn: async (): Promise<AlbumChapter[]> => {
      const { data, error } = await supabase
        .from('album_chapters')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAlbumSlots() {
  return useQuery({
    queryKey: qk.album.slots(),
    staleTime: LONG_STALE,
    queryFn: async (): Promise<AlbumSlot[]> => {
      const { data, error } = await supabase
        .from('album_slots')
        .select('*')
        .order('chapter_id', { ascending: true })
        .order('position', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All stickers, plus a derived `Map<slotId, AlbumSticker[]>` via `select`. */
export function useAlbumStickers() {
  return useQuery({
    queryKey: qk.album.stickers(),
    queryFn: async (): Promise<AlbumSticker[]> => {
      const { data, error } = await supabase.from('album_stickers').select('*');
      if (error) throw error;
      return data ?? [];
    },
    select: (rows) => {
      const bySlot = new Map<string, AlbumSticker[]>();
      for (const row of rows) {
        const arr = bySlot.get(row.slot_id);
        if (arr) arr.push(row);
        else bySlot.set(row.slot_id, [row]);
      }
      return { rows, bySlot };
    },
  });
}

/** Overall + per-chapter progress derived from slots + stickers. */
export function useAlbumProgress(): AlbumProgress | undefined {
  const { data: slots } = useAlbumSlots();
  const { data: stickers } = useAlbumStickers();
  return useMemo(() => {
    if (!slots) return undefined;
    const bySlot = stickers?.bySlot ?? new Map();
    return computeProgress(slots, bySlot, dayOfYear(DateTime.now()));
  }, [slots, stickers]);
}

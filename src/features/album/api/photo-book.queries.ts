import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Tables } from '@kernel/supabase';
import type {
  AlbumBook,
  AlbumPageWithPhotos,
  AlbumPhoto,
  BookScope,
} from '../types';

type Polaroid = Tables<'polaroids'>;

/** Singleton key for the life book; the trip id otherwise. */
function bookKey(scope: BookScope, tripId?: string): string {
  return scope === 'life' ? 'life' : (tripId ?? 'none');
}

async function findBook(
  scope: BookScope,
  tripId?: string
): Promise<AlbumBook | null> {
  let q = supabase.from('album_books').select('*').eq('scope', scope);
  q = scope === 'trip' ? q.eq('trip_id', tripId ?? '') : q;
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

/** Seed the book up to a few empty pages so the flip-through feels like a book
 *  from the first open (prod has no seed → heal on open). */
const SEED_PAGES = 5;
async function ensurePages(bookId: string): Promise<void> {
  const { data, error } = await supabase
    .from('album_pages')
    .select('position')
    .eq('book_id', bookId)
    .order('position', { ascending: false });
  if (error) throw error;
  const have = data?.length ?? 0;
  if (have >= SEED_PAGES) return;
  const maxPos = data && data.length ? data[0].position : -1;
  const rows = Array.from({ length: SEED_PAGES - have }, (_, i) => ({
    book_id: bookId,
    position: maxPos + 1 + i,
  }));
  const { error: insErr } = await supabase.from('album_pages').insert(rows);
  if (insErr && insErr.code !== '23505') throw insErr;
}

/**
 * Resolve the book for a scope, creating it (and a first empty page) on first
 * open. `life` is a singleton; `trip` is keyed by `tripId`. Self-heals because
 * production ships no seed. Runs once per session (the id is stable, so the
 * query never needs to refetch — pages/photos live in their own live query).
 */
export function useBook(scope: BookScope, tripId?: string, title?: string) {
  return useQuery({
    queryKey: qk.album.book(scope, bookKey(scope, tripId)),
    enabled: scope === 'life' || !!tripId,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<AlbumBook> => {
      let book = await findBook(scope, tripId);
      if (!book) {
        const { data, error } = await supabase
          .from('album_books')
          .insert({
            scope,
            trip_id: scope === 'trip' ? (tripId ?? null) : null,
            ...(title ? { title } : {}),
          })
          .select('*')
          .single();
        if (error) {
          // Lost the create race (unique life/trip index) — read the winner.
          if (error.code === '23505') {
            book = await findBook(scope, tripId);
          } else {
            throw error;
          }
        } else {
          book = data;
        }
      }
      if (!book) throw new Error('Could not resolve album book');
      await ensurePages(book.id);
      return book;
    },
  });
}

/** All pages of a book, ordered, each with its photos sorted by slot. */
export function usePages(bookId: string | undefined) {
  return useQuery({
    queryKey: bookId ? qk.album.pages(bookId) : ['album', 'book', 'pending'],
    enabled: !!bookId,
    queryFn: async (): Promise<AlbumPageWithPhotos[]> => {
      const { data, error } = await supabase
        .from('album_pages')
        .select('*, photos:album_photos(*)')
        .eq('book_id', bookId as string)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        photos: [...((p.photos ?? []) as AlbumPhoto[])].sort(
          (a, b) => a.slot - b.slot
        ),
      }));
    },
  });
}

/** Existing daily polaroids, newest first — the "Add a Polaroid" picker source. */
export function usePolaroidPicker(enabled: boolean) {
  return useQuery({
    queryKey: qk.polaroids.list(),
    enabled,
    queryFn: async (): Promise<Polaroid[]> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .order('day', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Tables } from '@kernel/supabase';
import type {
  AlbumBook,
  AlbumPageWithPhotos,
  AlbumPhoto,
  BookScope,
  PlacedSticker,
} from '../types';
import { orderStickers } from '../components/photo-book/sticker-math';

type Polaroid = Tables<'polaroids'>;

/** Stable reference: an inline arrow re-runs `select` on every render. */
const countByBook = (rows: { book_id: string; photos: number }[]) => {
  const out = new Map<string, number>();
  for (const row of rows) out.set(row.book_id, Number(row.photos));
  return out;
};

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

/** A brand-new book opens with a few blank pages, so it feels like a book. */
const SEED_PAGES = 5;

/**
 * Give a book its first pages — ONCE, when it has none at all.
 *
 * This used to top every book back up to five on every single resolution, which
 * meant tearing a page out and reopening the album put it straight back, and a
 * three-page book could not exist. It also ran on every remount, so a *write*
 * sat on the critical path of the first paint.
 *
 * Only the empty case is healed now. Production ships no seed, so a book that
 * has just been created still needs this — but a book you have edited is yours.
 */
async function seedFirstPages(bookId: string): Promise<void> {
  const { count, error } = await supabase
    .from('album_pages')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId);
  if (error) throw error;
  if ((count ?? 0) > 0) return;
  const rows = Array.from({ length: SEED_PAGES }, (_, i) => ({
    book_id: bookId,
    position: i,
  }));
  const { error: insErr } = await supabase.from('album_pages').insert(rows);
  // 23505: the other phone seeded it a moment ago. Theirs is as good as ours.
  if (insErr && insErr.code !== '23505') throw insErr;
}

/**
 * Resolve the book for a scope, creating it (and a first empty page) on first
 * open. `life` is a singleton; `trip` is keyed by `tripId`. Self-heals because
 * production ships no seed. Runs once per session (the id is stable, so the
 * query never needs to refetch — pages/photos live in their own live query).
 */
export function useBook(
  scope: BookScope,
  tripId?: string,
  title?: string,
  enabled = true
) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.album.book(scope, bookKey(scope, tripId)),
    enabled: enabled && (scope === 'life' || !!tripId),
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
          // A book that has just come into existence has to appear on the
          // shelf without a reload — this is how Pololini comes back after the
          // albums were wiped, and how a trip's book shows up the first time
          // its tab is opened.
          void qc.invalidateQueries({ queryKey: qk.album.books() });
        }
      }
      if (!book) throw new Error('Could not resolve album book');
      await seedFirstPages(book.id);
      return book;
    },
  });
}

/** All pages of a book, ordered, each with its stickers back-to-front. */
export function usePages(bookId: string | undefined) {
  return useQuery({
    queryKey: bookId ? qk.album.pages(bookId) : ['album', 'book', 'pending'],
    enabled: !!bookId,
    // Realtime keeps this honest, so a refetch on every focus is just noise.
    staleTime: 30_000,
    queryFn: async (): Promise<AlbumPageWithPhotos[]> => {
      const read = async () => {
        const { data, error } = await supabase
          .from('album_pages')
          .select('*, stickers:album_placements(*, photo:album_photos(*))')
          .eq('book_id', bookId as string)
          .order('position', { ascending: true });
        if (error) throw error;
        return data ?? [];
      };

      const rows = await read();
      return rows.map((p) => ({
        ...p,
        stickers: orderStickers(
          ((p.stickers ?? []) as PlacedSticker[]).filter(Boolean)
        ),
      }));
    },
  });
}

/** As many photos as one strip can usefully hold at once. */
export const LIBRARY_LIMIT = 300;

/**
 * Every photo uploaded into this book, newest first — the strip under the book.
 *
 * A photo lives here whether or not it is standing on a page, which is the
 * whole point: you empty your camera roll into the album first and decide
 * where things go afterwards.
 */
export function useLibrary(bookId: string | undefined) {
  return useQuery({
    queryKey: bookId
      ? qk.album.library(bookId)
      : ['album', 'library', 'pending'],
    enabled: !!bookId,
    staleTime: 30_000,
    queryFn: async (): Promise<AlbumPhoto[]> => {
      // Capped: PostgREST stops at 1000 rows anyway, and every path here is
      // signed in one batched request whose query key is the path list — an
      // unbounded book would hash a several-kilobyte key on every render.
      const { data, error } = await supabase
        .from('album_photos')
        .select('*')
        .eq('book_id', bookId as string)
        .order('created_at', { ascending: false })
        .limit(LIBRARY_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * The shelf: every album we keep, in the order we arranged them.
 *
 * Includes the two originals (Pololini and the Summer Panini book) — they're
 * just books like any other now, and nothing about how they resolve changed.
 */
export function useAlbums(includeArchived = false) {
  return useQuery({
    queryKey: [...qk.album.books(), includeArchived] as const,
    queryFn: async (): Promise<AlbumBook[]> => {
      let q = supabase.from('album_books').select('*');
      if (!includeArchived) q = q.eq('archived', false);
      const { data, error } = await q
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * One album by id — how every book except the two legacy ones is opened.
 *
 * `maybeSingle`, not `single`: a link to a book that has been deleted (by the
 * partner, or by us) is a perfectly ordinary thing to follow, and `single`
 * turned it into a thrown error that the screen could only render as a spinner
 * that never stopped. `null` means "gone", and the route says so and offers the
 * shelf.
 *
 * The id of a book never changes, so this is cached hard — it used to refetch,
 * AND re-run the page seeding, on every remount.
 */
export function useBookById(id: string | undefined) {
  return useQuery({
    queryKey: qk.album.byId(id ?? 'none'),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: 0,
    queryFn: async (): Promise<AlbumBook | null> => {
      const { data, error } = await supabase
        .from('album_books')
        .select('*')
        .eq('id', id as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      await seedFirstPages(data.id);
      return data;
    },
  });
}

/**
 * How many photos each album holds — the shelf's "12 photos" line.
 *
 * Counted from the library, not from what happens to be placed on a page: a
 * photo you uploaded but haven't put anywhere is still in the album, and the
 * shelf saying "0 photos" over a book full of them would be a lie.
 */
export function useAlbumPhotoCounts() {
  return useQuery({
    queryKey: [...qk.album.books(), 'counts'] as const,
    // Plain rows from the queryFn; the Map is built in `select`. A Map in query
    // data would rehydrate from localStorage as {} and break every caller.
    queryFn: async () => {
      // Counted in the database. Fetching every row to count them in the
      // client hit PostgREST's 1000-row cap and started under-counting.
      const { data, error } = await supabase.rpc('album_photo_counts');
      if (error) throw error;
      return (data ?? []) as { book_id: string; photos: number }[];
    },
    select: countByBook,
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
        .order('day', { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });
}

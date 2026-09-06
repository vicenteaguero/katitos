import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@kernel/realtime';
import { qk } from '@kernel/query';
import type { AlbumPageWithPhotos, AlbumPlacement } from '../types';

/** The fields a change would actually show on the page. */
const WATCHED = [
  'x',
  'y',
  'scale',
  'rotation',
  'z',
  'frame',
  'frame_color',
  'shape',
  'crop_x',
  'crop_y',
  'crop_zoom',
  'caption',
  'body',
  'font_family',
  'font_size',
  'font_weight',
  'photo_id',
  'page_id',
] as const;

function sameAsCached(
  cached: AlbumPlacement,
  row: Partial<AlbumPlacement>
): boolean {
  return WATCHED.every((k) => row[k] === undefined || row[k] === cached[k]);
}

/**
 * Keep the open book in step with the other phone - and ONLY the other phone.
 *
 * `album_placements` has no `book_id` (a placement belongs to a page, and the
 * page belongs to the book), so this subscription cannot be filtered
 * server-side: it hears every sticker moved in every album. Worse, Postgres
 * echoes your OWN writes straight back, so the previous version refetched the
 * entire book on every drag release, every photo placed and every photo taken
 * off - which is exactly what the careful optimistic cache writes were supposed
 * to avoid, and why the book kept re-initialising mid-gesture.
 *
 * Two questions, in order: is this even our book, and does it tell us anything
 * the screen doesn't already show? An echo of our own change answers "no" to
 * the second, because we wrote it into the cache before sending it.
 */
export function usePlacementSync(
  bookId: string | undefined,
  pages: AlbumPageWithPhotos[] | undefined
) {
  const qc = useQueryClient();
  // A live mirror, so the subscription callback can stay stable - re-creating
  // it would tear the channel down and rebuild it on every render.
  const live = useRef({ bookId, pages });
  live.current = { bookId, pages };

  const onChange = useCallback(
    (payload: {
      eventType: string;
      new?: Partial<AlbumPlacement>;
      old?: Partial<AlbumPlacement>;
    }) => {
      const { bookId: id, pages: ps } = live.current;
      if (!id || !ps) return;
      const row =
        (payload.eventType === 'DELETE' ? payload.old : payload.new) ?? {};
      const page = ps.find((p) => p.id === row.page_id);
      // Another album entirely. (Or a DELETE whose old row we can't read,
      // which replica identity full means shouldn't happen.)
      if (!page) return;

      const cached = page.stickers.find((s) => s.id === row.id);
      if (payload.eventType === 'DELETE') {
        // Already gone here - this is the echo of our own removal.
        if (!cached) return;
      } else if (cached && sameAsCached(cached, row)) {
        return;
      }
      void qc.invalidateQueries({ queryKey: qk.album.pages(id) });
    },
    [qc]
  );

  useRealtimeSubscription(
    { table: 'album_placements', enabled: !!bookId },
    onChange as Parameters<typeof useRealtimeSubscription>[1]
  );
}

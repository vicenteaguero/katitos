import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { PhotoViewer, type ViewerPhoto } from '@kernel/ui';
import type { Polaroid } from '../types';

/**
 * The daily photo, full screen.
 *
 * Thin wrapper over the kernel lightbox: it only turns polaroid rows into
 * viewer photos. The gestures, the zoom and the save/share live in
 * `PhotoViewer`, which the flowers use too.
 */
export function PolaroidViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Polaroid[];
  initialIndex: number;
  onClose: () => void;
}) {
  const paths = useMemo(() => photos.map((p) => p.image_path), [photos]);

  // Both sizes in one round-trip each: the small one is already in the browser
  // cache from the gallery, so the photo appears instantly and the original
  // swaps in behind it.
  const { data: previews } = useSignedUrls(BUCKETS.polaroids, paths);
  const { data: fulls } = useSignedUrls(BUCKETS.polaroids, paths, {
    proxy: false,
  });

  const items: ViewerPhoto[] = useMemo(
    () =>
      photos.map((p) => ({
        id: p.id,
        previewUrl: previews?.get(p.image_path),
        fullUrl: fulls?.get(p.image_path),
        eyebrow: DateTime.fromISO(p.day).toFormat('cccc, LLL d'),
        caption: p.caption ?? undefined,
        fileName: `polaroid-${p.day}.jpg`,
      })),
    [photos, previews, fulls]
  );

  return (
    <PhotoViewer photos={items} initialIndex={initialIndex} onClose={onClose} />
  );
}

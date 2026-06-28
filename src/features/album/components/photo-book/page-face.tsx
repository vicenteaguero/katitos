import { useMemo } from 'react';
import { SLOTS_PER_PAGE, type AlbumPageWithPhotos } from '../../types';
import { PhotoSlot } from './photo-slot';

/** A single paper page: the warm sheet + its 2×2 photo wells. */
export function PageFace({
  page,
  onTapSlot,
  interactive = true,
}: {
  page: AlbumPageWithPhotos;
  onTapSlot?: (slot: number) => void;
  interactive?: boolean;
}) {
  const bySlot = useMemo(() => {
    const m = new Map<number, AlbumPageWithPhotos['photos'][number]>();
    for (const p of page.photos) m.set(p.slot, p);
    return m;
  }, [page.photos]);

  return (
    <div className="pb-page" aria-hidden={!interactive}>
      {Array.from({ length: SLOTS_PER_PAGE }, (_, slot) => (
        <PhotoSlot
          key={slot}
          photo={bySlot.get(slot)}
          disabled={!interactive}
          onTap={() => onTapSlot?.(slot)}
        />
      ))}
    </div>
  );
}

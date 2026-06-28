import { Plus } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { AlbumPhoto, PhotoSource } from '../../types';
import { SlotPhoto } from './slot-photo';

/** One of the four photo wells on a page. Tap empty → add; tap filled → edit. */
export function PhotoSlot({
  photo,
  onTap,
  disabled,
}: {
  photo: AlbumPhoto | undefined;
  onTap: () => void;
  disabled?: boolean;
}) {
  const filled = !!photo?.image_path;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onTap}
      aria-label={filled ? 'Edit photo' : 'Add a photo'}
      className={cn('pb-slot', !filled && 'pb-slot--empty')}
    >
      {filled && photo ? (
        <>
          <SlotPhoto
            source={photo.source as PhotoSource}
            path={photo.image_path}
            alt={photo.caption ?? 'Album photo'}
          />
          {photo.caption && <span className="pb-caption">{photo.caption}</span>}
        </>
      ) : (
        <Plus size={26} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  );
}

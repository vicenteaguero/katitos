import { useEffect, useState } from 'react';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@kernel/lib';
import { Button, Empty, Sheet, toast } from '@kernel/ui';
import type { AlbumPhoto } from '../../types';

/**
 * Every photo in the album, all at once.
 *
 * The strip under the book is for REACHING - the handful you are placing right
 * now. This is for MANAGING: finding the one from the ferry among ninety, or
 * throwing out the eleven blurred shots of the same doorway. They are different
 * jobs and they were sharing one 56-pixel-tall row and a hand-rolled popup menu
 * that had no backdrop, no Escape and no idea the keyboard existed.
 */
export function LibrarySheet({
  open,
  photos,
  urls,
  canPlace,
  onClose,
  onPlaceMany,
  onDeleteMany,
  onAddPhotos,
}: {
  open: boolean;
  photos: AlbumPhoto[];
  urls: Map<string, string>;
  canPlace: boolean;
  onClose: () => void;
  onPlaceMany: (photos: AlbumPhoto[]) => void;
  onDeleteMany: (photos: AlbumPhoto[]) => void;
  onAddPhotos: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  // A fresh sheet is a fresh choice - an old selection surviving a close is
  // how you end up deleting something you picked ten minutes ago.
  useEffect(() => {
    if (!open) setChosen([]);
  }, [open]);

  const picked = photos.filter((p) => chosen.includes(p.id));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={chosen.length ? `${chosen.length} chosen` : 'All the photos'}
    >
      {photos.length === 0 ? (
        <Empty
          icon={<ImagePlus />}
          title="Nothing in here yet"
          hint="Add photos and they all live here, whether or not they are on a page."
          action={<Button onClick={onAddPhotos}>Add photos</Button>}
        />
      ) : (
        <div className="space-y-3">
          <div className="pb-gallery">
            {photos.map((photo) => {
              const url = photo.image_path
                ? urls.get(photo.image_path)
                : undefined;
              const on = chosen.includes(photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={on ? 'Chosen' : 'Choose this one'}
                  onClick={() =>
                    setChosen((c) =>
                      c.includes(photo.id)
                        ? c.filter((id) => id !== photo.id)
                        : [...c, photo.id]
                    )
                  }
                  className={cn('pb-gallery-item', on && 'pb-gallery-item--on')}
                  style={
                    photo.blur
                      ? { backgroundImage: `url(${photo.blur})` }
                      : undefined
                  }
                >
                  {url && (
                    <img src={url} alt="" loading="lazy" decoding="async" />
                  )}
                  {on && (
                    <span className="pb-gallery-tick">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              full
              disabled={!picked.length || !canPlace}
              onClick={() => {
                onPlaceMany(picked);
                setChosen([]);
                onClose();
              }}
            >
              {canPlace ? 'Put them on this page' : 'Turn to a page first'}
            </Button>
            <Button
              variant="ghost"
              className="text-danger"
              disabled={!picked.length}
              aria-label="Delete from the album"
              onClick={() => {
                const going = picked;
                onDeleteMany(going);
                setChosen([]);
                // Deleting a photo takes its bytes with it, so this one is not
                // undoable - say so plainly rather than pretending.
                toast.info(
                  going.length === 1
                    ? 'Gone from the album'
                    : `${going.length} gone from the album`,
                  { key: 'album-library-delete' }
                );
              }}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Check, Images, LayoutGrid, Plus, Type } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { AlbumPhoto } from '../../types';

/**
 * The book's photos, in the space under it.
 *
 * TWO ROWS, scrolling sideways: a single row of 56px tiles showed four photos
 * on her phone, and a book is built from thirty. The tile sizes itself off the
 * viewport, so the same strip fits a 320px phone and a tablet without a media
 * query anywhere.
 *
 * Tap a photo and it lands on the open page. NOT drag-and-drop: dragging out of
 * a sideways-scrolling strip, across the viewport's clip edge, onto a leaf that
 * is itself mid-3D-transform, while the slide overlay and the flip engine both
 * want the same pointer, is a fight with no winner on a phone. One tap to place
 * plus the drag that already works is fewer gestures anyway.
 *
 * Hold one down and the strip changes mode: now you are choosing several, and
 * they go down together, spread out, in one go.
 */
export function LibraryStrip({
  photos,
  urls,
  placedPaths,
  canPlace,
  onPlace,
  onPlaceMany,
  onAddPhotos,
  onAddText,
  onOpenAll,
}: {
  photos: AlbumPhoto[];
  urls: Map<string, string>;
  /** Image paths already standing on the page you're looking at. */
  placedPaths: Set<string>;
  /** False on a cover: there is no paper to put anything on. */
  canPlace: boolean;
  onPlace: (photo: AlbumPhoto) => void;
  onPlaceMany: (photos: AlbumPhoto[]) => void;
  onAddPhotos: () => void;
  onAddText: () => void;
  onOpenAll: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const choosing = chosen.length > 0;
  const holdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set once the long-press has begun choosing, so the release doesn't ALSO
  // count as a tap and drop the photo onto the page behind it.
  const heldRef = useRef(false);

  const startHold = (photo: AlbumPhoto) => {
    heldRef.current = false;
    holdRef.current = setTimeout(() => {
      heldRef.current = true;
      setChosen((c) => (c.includes(photo.id) ? c : [...c, photo.id]));
    }, 450);
  };
  const endHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = undefined;
  };

  useEffect(
    () => () => {
      if (holdRef.current) clearTimeout(holdRef.current);
    },
    []
  );

  // Leaving the page you were choosing for makes the choice meaningless.
  useEffect(() => {
    if (!canPlace) setChosen([]);
  }, [canPlace]);

  const tap = (photo: AlbumPhoto) => {
    if (heldRef.current) return;
    if (choosing) {
      setChosen((c) =>
        c.includes(photo.id)
          ? c.filter((id) => id !== photo.id)
          : [...c, photo.id]
      );
      return;
    }
    if (canPlace) onPlace(photo);
  };

  return (
    <div className="pb-strip-wrap">
      {choosing && (
        <div className="pb-strip-bar">
          <span>
            {chosen.length} chosen
            {!canPlace && ' - turn to a page'}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setChosen([])}>
              Never mind
            </button>
            <button
              type="button"
              className="pb-strip-bar-go"
              disabled={!canPlace}
              onClick={() => {
                onPlaceMany(
                  chosen
                    .map((id) => photos.find((p) => p.id === id))
                    .filter((p): p is AlbumPhoto => !!p)
                );
                setChosen([]);
              }}
            >
              Place them
            </button>
          </div>
        </div>
      )}

      <div className="pb-strip">
        <button
          type="button"
          onClick={onAddPhotos}
          aria-label="Add photos"
          className="pb-strip-btn"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAddText}
          aria-label="Add text"
          disabled={!canPlace}
          className="pb-strip-btn"
        >
          <Type className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenAll}
          aria-label="All the photos in this album"
          className="pb-strip-btn"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        {photos.length === 0 ? (
          <span className="pb-strip-empty">
            <Images className="h-3.5 w-3.5" /> Add photos, then tap to place
          </span>
        ) : (
          photos.map((photo) => {
            const url = photo.image_path
              ? urls.get(photo.image_path)
              : undefined;
            const onPage =
              !!photo.image_path && placedPaths.has(photo.image_path);
            const picked = chosen.includes(photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => tap(photo)}
                onPointerDown={() => startHold(photo)}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setChosen((c) =>
                    c.includes(photo.id) ? c : [...c, photo.id]
                  );
                }}
                aria-pressed={picked}
                aria-label={
                  choosing
                    ? picked
                      ? 'Chosen'
                      : 'Choose this one'
                    : onPage
                      ? 'Place again'
                      : 'Place on this page'
                }
                className={cn(
                  'pb-strip-item',
                  onPage && 'pb-strip-item--used',
                  picked && 'pb-strip-item--picked'
                )}
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    style={
                      photo.blur
                        ? { backgroundImage: `url(${photo.blur})` }
                        : undefined
                    }
                  />
                ) : photo.blur ? (
                  <span
                    className="pb-strip-skel"
                    style={{ backgroundImage: `url(${photo.blur})` }}
                  />
                ) : (
                  <span className="pb-strip-skel" />
                )}
                {picked && (
                  <span className="pb-strip-tick">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

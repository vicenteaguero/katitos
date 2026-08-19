import { useRef, useState } from 'react';
import { Images, Plus, Trash2, Type } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { AlbumPhoto } from '../../types';

/**
 * The book's photos, in the space under it.
 *
 * Tap a photo and it lands on the open page. NOT drag-and-drop: dragging out of
 * a sideways-scrolling strip, across the viewport's clip edge, onto a leaf that
 * is itself mid-3D-transform, while the slide overlay and the flip engine both
 * want the same pointer, is a fight with no winner on a phone. One tap to place
 * plus the drag that already works is fewer gestures anyway.
 */
export function LibraryStrip({
  photos,
  urls,
  placedPaths,
  onPlace,
  onAddPhotos,
  onAddText,
  onDelete,
}: {
  photos: AlbumPhoto[];
  urls: Map<string, string>;
  /** Image paths already standing on the page you're looking at. */
  placedPaths: Set<string>;
  onPlace: (photo: AlbumPhoto) => void;
  onAddPhotos: () => void;
  onAddText: () => void;
  onDelete: (photo: AlbumPhoto) => void;
}) {
  const [menuFor, setMenuFor] = useState<AlbumPhoto | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startHold = (photo: AlbumPhoto) => {
    holdRef.current = setTimeout(() => setMenuFor(photo), 500);
  };
  const endHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = undefined;
  };

  return (
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
        className="pb-strip-btn"
      >
        <Type className="h-4 w-4" />
      </button>

      {photos.length === 0 ? (
        <span className="pb-strip-empty">
          <Images className="h-3.5 w-3.5" /> Add photos, then tap to place
        </span>
      ) : (
        photos.map((photo) => {
          const url = photo.image_path ? urls.get(photo.image_path) : undefined;
          const onPage =
            !!photo.image_path && placedPaths.has(photo.image_path);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onPlace(photo)}
              onPointerDown={() => startHold(photo)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(photo);
              }}
              aria-label={onPage ? 'Place again' : 'Place on this page'}
              className={cn('pb-strip-item', onPage && 'pb-strip-item--used')}
            >
              {url ? (
                <img src={url} alt="" draggable={false} />
              ) : (
                <span className="pb-strip-skel" />
              )}
            </button>
          );
        })
      )}

      {menuFor && (
        <div className="pb-strip-menu" role="dialog">
          <button
            type="button"
            onClick={() => {
              onPlace(menuFor);
              setMenuFor(null);
            }}
          >
            Place on this page
          </button>
          <button
            type="button"
            className="text-danger"
            onClick={() => {
              onDelete(menuFor);
              setMenuFor(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete from album
          </button>
          <button type="button" onClick={() => setMenuFor(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { X } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { AlbumPageWithPhotos, AlbumPhoto, PhotoSource } from '../../types';
import { useMovePhoto, useRemovePhoto } from '../../api/photo-book.mutations';
import { SlotPhoto } from './slot-photo';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
/** Sticker width as a % of the page, at scale 1. */
const BASE_W = 42;

/**
 * A paper page: a free canvas of draggable photo "stickers". Positions are
 * stored as fractions of the page (0..1), so a sticker keeps its spot on ANY
 * screen size or aspect (like the chalkboard). Tap a sticker to select it (then
 * drag to move, × to remove). Adding is done from the top-bar "+".
 */
export function PageFace({
  page,
  bookId,
  interactive = true,
}: {
  page: AlbumPageWithPhotos;
  bookId: string;
  interactive?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const move = useMovePhoto();
  const remove = useRemovePhoto();

  return (
    <div
      className="pb-page"
      aria-hidden={!interactive}
      onPointerDown={() => interactive && setSelected(null)}
    >
      {page.photos.map((photo) => (
        <Sticker
          key={photo.id}
          photo={photo}
          interactive={interactive}
          selected={selected === photo.id}
          onSelect={() =>
            setSelected((s) => (s === photo.id ? null : photo.id))
          }
          onMove={(x, y) => move.mutate({ id: photo.id, bookId, x, y })}
          onRemove={() =>
            remove.mutate({
              id: photo.id,
              bookId,
              source: photo.source as PhotoSource,
              path: photo.image_path,
            })
          }
        />
      ))}
    </div>
  );
}

function Sticker({
  photo,
  interactive,
  selected,
  onSelect,
  onMove,
  onRemove,
}: {
  photo: AlbumPhoto;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [pos, setPos] = useState({ x: photo.x, y: photo.y });

  // Sync to external changes (e.g. partner moved it) — but never mid-drag.
  useEffect(() => {
    if (!draggingRef.current) setPos({ x: photo.x, y: photo.y });
  }, [photo.x, photo.y]);

  const bind = useDrag(
    ({ event, first, last, tap, movement: [mx, my], memo }) => {
      if (tap) {
        onSelect();
        return;
      }
      if (first) {
        // Stop the page-turn gesture (on the stack) from also firing.
        event?.stopPropagation();
        draggingRef.current = true;
      }
      const parent = ref.current?.offsetParent as HTMLElement | null;
      const pw = parent?.clientWidth || 1;
      const ph = parent?.clientHeight || 1;
      const base = (memo as { x: number; y: number }) ?? {
        x: photo.x,
        y: photo.y,
      };
      const nx = clamp(base.x + mx / pw, 0.08, 0.92);
      const ny = clamp(base.y + my / ph, 0.08, 0.92);
      setPos({ x: nx, y: ny });
      if (last) {
        draggingRef.current = false;
        onMove(nx, ny);
      }
      return base;
    },
    { filterTaps: true, pointer: { touch: true }, enabled: interactive }
  );

  return (
    <div
      ref={ref}
      {...(interactive ? bind() : {})}
      className={cn(
        'pb-sticker',
        interactive && 'pb-sticker--live',
        selected && 'pb-sticker--sel'
      )}
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        width: `${BASE_W * (photo.scale || 1)}%`,
        touchAction: 'none',
      }}
    >
      <div className="pb-sticker-frame">
        <div className="pb-sticker-photo">
          <SlotPhoto
            source={photo.source as PhotoSource}
            path={photo.image_path}
            alt={photo.caption ?? 'Album photo'}
          />
        </div>
        {photo.caption && (
          <span className="pb-sticker-cap">{photo.caption}</span>
        )}
      </div>
      {interactive && selected && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="pb-sticker-x"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { X } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { AlbumPageWithPhotos, AlbumPhoto, PhotoSource } from '../../types';
import { useMovePhoto, useRemovePhoto } from '../../api/photo-book.mutations';
import { SlotPhoto } from './slot-photo';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
/** Photo-sticker width as a % of the page, at scale 1. */
const BASE_W = 42;

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/**
 * A paper page: a free canvas of draggable photo + text "stickers". Positions
 * are page fractions (0..1) so a sticker keeps its spot on any screen. In
 * arrange mode: drag to move, two-finger pinch to scale + rotate (like the
 * Wall), tap to select, × to remove. Stickers live inside the page, so they
 * curl with the 3D flip.
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
          onTransform={(t) => move.mutate({ id: photo.id, bookId, ...t })}
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
  onTransform,
  onRemove,
}: {
  photo: AlbumPhoto;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  onTransform: (t: Transform) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const isText = photo.source === 'text';
  const [view, setView] = useState<Transform>({
    x: photo.x,
    y: photo.y,
    scale: photo.scale || 1,
    rotation: photo.rotation || 0,
  });

  // Sync to external changes (e.g. partner moved it) — never mid-gesture.
  useEffect(() => {
    if (!busyRef.current)
      setView({
        x: photo.x,
        y: photo.y,
        scale: photo.scale || 1,
        rotation: photo.rotation || 0,
      });
  }, [photo.x, photo.y, photo.scale, photo.rotation]);

  const bind = useGesture(
    {
      onDrag: ({
        event,
        first,
        last,
        tap,
        movement: [mx, my],
        memo,
        pinching,
        cancel,
      }) => {
        if (pinching) {
          cancel();
          return;
        }
        if (tap) {
          onSelect();
          return;
        }
        if (first) {
          // Stop the page-turn gesture (on the stack) from also firing.
          event?.stopPropagation();
          busyRef.current = true;
        }
        const parent = ref.current?.offsetParent as HTMLElement | null;
        const pw = parent?.clientWidth || 1;
        const ph = parent?.clientHeight || 1;
        const base = (memo as { x: number; y: number }) ?? {
          x: view.x,
          y: view.y,
        };
        const nx = clamp(base.x + mx / pw, 0.06, 0.94);
        const ny = clamp(base.y + my / ph, 0.06, 0.94);
        setView((v) => ({ ...v, x: nx, y: ny }));
        if (last) {
          busyRef.current = false;
          onTransform({
            x: nx,
            y: ny,
            scale: view.scale,
            rotation: view.rotation,
          });
        }
        return base;
      },
      onPinch: ({ first, last, offset: [scale, rotation] }) => {
        if (first) {
          busyRef.current = true;
          onSelect();
        }
        setView((v) => ({ ...v, scale, rotation }));
        if (last) {
          busyRef.current = false;
          onTransform({ x: view.x, y: view.y, scale, rotation });
        }
      },
    },
    {
      enabled: interactive,
      eventOptions: { passive: false },
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: {
        from: () => [view.scale, view.rotation],
        scaleBounds: { min: 0.4, max: 3 },
        rubberband: true,
      },
    }
  );

  return (
    <div
      ref={ref}
      {...(interactive ? bind() : {})}
      className={cn(
        'pb-sticker',
        isText && 'pb-sticker--text',
        interactive && 'pb-sticker--live',
        selected && 'pb-sticker--sel'
      )}
      style={{
        left: `${view.x * 100}%`,
        top: `${view.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${view.rotation}deg)`,
        touchAction: 'none',
        ...(isText
          ? { fontSize: `${Math.round(16 * view.scale)}px`, maxWidth: '80%' }
          : { width: `${BASE_W * view.scale}%` }),
      }}
    >
      {isText ? (
        <span className="pb-text-sticker">{photo.caption}</span>
      ) : (
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
      )}
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

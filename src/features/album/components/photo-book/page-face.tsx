import { memo, useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { cn } from '@kernel/lib';
import type {
  AlbumPageWithPhotos,
  PlacedSticker,
  PhotoSource,
} from '../../types';
import { useMoveSticker } from '../../api/placements.mutations';
import { useHealPhotoSize } from '../../api/library.mutations';
import { SlotPhoto } from './slot-photo';
import {
  angleOf,
  distanceOf,
  handleTransform,
  MAX_SCALE,
  MIN_SCALE,
  stickerWidth,
  type HandleBase,
} from './sticker-math';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/**
 * A paper page: a free canvas of photo and text stickers.
 *
 * Positions are page fractions (0..1) so a sticker keeps its spot on any
 * screen, and stacking comes from the placement's own depth rather than from
 * whatever order the rows happened to arrive in. Stickers live inside the page,
 * so they curl with the 3D flip.
 */
function PageFaceImpl({
  page,
  bookId,
  interactive = true,
  urls,
  selectedId,
  onSelect,
}: {
  page: AlbumPageWithPhotos;
  bookId: string;
  interactive?: boolean;
  /** Signed URLs for this page only, so a change elsewhere can't re-render it. */
  urls?: Map<string, string>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const move = useMoveSticker();
  const heal = useHealPhotoSize(bookId);

  return (
    <div
      className="pb-page"
      aria-hidden={!interactive}
      onPointerDown={() => interactive && onSelect?.(null)}
    >
      {page.stickers.map((sticker, i) => (
        <Sticker
          key={sticker.id}
          sticker={sticker}
          interactive={interactive}
          // Depth is DERIVED from the sorted order, never from the raw `z`:
          // that number is a sparse comparator and can be negative or huge,
          // which would fight the slide overlay and the add button.
          depth={10 + i}
          url={
            sticker.photo?.image_path
              ? urls?.get(sticker.photo.image_path)
              : undefined
          }
          selected={selectedId === sticker.id}
          onSelect={() =>
            onSelect?.(selectedId === sticker.id ? null : sticker.id)
          }
          onTransform={(t) => move.mutate({ id: sticker.id, bookId, ...t })}
          onMeasured={(size) =>
            sticker.photo &&
            !sticker.photo.width &&
            heal(sticker.photo.id, size)
          }
        />
      ))}
    </div>
  );
}

/**
 * Re-render a page only when that page changed.
 *
 * `flipPages` is rebuilt whenever anything in the book moves; without this,
 * nudging one sticker re-created every leaf and StPageFlip re-ran its layout
 * mid-flip.
 */
export const PageFace = memo(PageFaceImpl, (a, b) => {
  return (
    a.page === b.page &&
    a.urls === b.urls &&
    a.interactive === b.interactive &&
    a.bookId === b.bookId &&
    // Only the page holding the selection cares who is selected.
    (a.selectedId === b.selectedId ||
      !a.page.stickers.some(
        (s) => s.id === a.selectedId || s.id === b.selectedId
      ))
  );
});

function Sticker({
  sticker,
  interactive,
  selected,
  depth,
  url,
  onSelect,
  onTransform,
  onMeasured,
}: {
  sticker: PlacedSticker;
  interactive: boolean;
  selected: boolean;
  depth: number;
  url?: string;
  onSelect: () => void;
  onTransform: (t: Transform) => void;
  onMeasured: (size: { width: number; height: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const handleBase = useRef<HandleBase | null>(null);
  const isText = sticker.kind === 'text';
  const [view, setView] = useState<Transform>({
    x: sticker.x,
    y: sticker.y,
    scale: sticker.scale || 1,
    rotation: sticker.rotation || 0,
  });

  // Sync to external changes (e.g. partner moved it) — never mid-gesture.
  useEffect(() => {
    if (!busyRef.current)
      setView({
        x: sticker.x,
        y: sticker.y,
        scale: sticker.scale || 1,
        rotation: sticker.rotation || 0,
      });
  }, [sticker.x, sticker.y, sticker.scale, sticker.rotation]);

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
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: true,
      },
    }
  );

  /**
   * The corner handle: one finger, away from the middle to grow, around it to
   * turn. Pinch needs two fingers and a spare hand; this is the gesture that
   * actually works while holding a phone.
   */
  const handleBind = useGesture(
    {
      onDrag: ({ event, first, last, xy: [px, py] }) => {
        event?.stopPropagation();
        const el = ref.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        const centre = {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        };
        const pointer = { x: px, y: py };
        if (first) {
          busyRef.current = true;
          handleBase.current = {
            scale: view.scale,
            rotation: view.rotation,
            radius: distanceOf(centre, pointer),
            angle: angleOf(centre, pointer),
          };
        }
        const base = handleBase.current;
        if (!base) return;
        const next = handleTransform(centre, pointer, base);
        setView((v) => ({ ...v, ...next }));
        if (last) {
          busyRef.current = false;
          handleBase.current = null;
          onTransform({ x: view.x, y: view.y, ...next });
        }
      },
    },
    { enabled: interactive, eventOptions: { passive: false } }
  );

  const polaroid = !isText && sticker.frame === 'polaroid';

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
        // A sticker being dragged has to clear its neighbours, or it vanishes
        // under them halfway across the page.
        zIndex: selected ? 1000 : depth,
        transform: `translate(-50%, -50%) rotate(${view.rotation}deg)`,
        touchAction: 'none',
        ...(isText
          ? {
              // A FRACTION of the page, not pixels: the same words used to come
              // out a different size on each of our phones.
              fontSize: `${sticker.font_size * 100 * view.scale}cqw`,
              fontWeight: sticker.font_weight,
              maxWidth: '80%',
            }
          : {
              width: `${
                stickerWidth(sticker.photo?.width, sticker.photo?.height) *
                100 *
                view.scale
              }%`,
            }),
      }}
    >
      {isText ? (
        <span
          className={cn('pb-text-sticker', `pb-font-${sticker.font_family}`)}
        >
          {sticker.body}
        </span>
      ) : (
        <div className={cn('pb-sticker-frame', polaroid && 'pb-sticker--film')}>
          <div
            className={cn(
              'pb-sticker-photo',
              polaroid && 'pb-sticker-photo--square'
            )}
            style={
              polaroid || !sticker.photo?.width || !sticker.photo?.height
                ? undefined
                : // Keep the photo's real shape. The old CSS cropped every
                  // picture to a square whether it was one or not.
                  {
                    aspectRatio: `${sticker.photo.width} / ${sticker.photo.height}`,
                  }
            }
          >
            <SlotPhoto
              source={(sticker.photo?.source ?? 'upload') as PhotoSource}
              path={sticker.photo?.image_path ?? null}
              url={url}
              alt={sticker.caption ?? 'Album photo'}
              onMeasured={onMeasured}
            />
          </div>
          {sticker.caption && (
            <span
              className={cn('pb-sticker-cap', `pb-font-${sticker.font_family}`)}
            >
              {sticker.caption}
            </span>
          )}
        </div>
      )}
      {interactive && selected && (
        <span
          {...handleBind()}
          aria-label="Resize and turn"
          className="pb-sticker-handle"
        />
      )}
    </div>
  );
}

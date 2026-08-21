import { memo, useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { cn } from '@kernel/lib';
import type {
  AlbumPageWithPhotos,
  PlacedSticker,
  PhotoSource,
  StickerShape,
} from '../../types';
import {
  useMoveSticker,
  useStyleSticker,
} from '../../api/placements.mutations';
import { useHealPhotoSize } from '../../api/library.mutations';
import { SlotPhoto } from './slot-photo';
import {
  angleOf,
  distanceOf,
  handleTransform,
  MAX_SCALE,
  MIN_SCALE,
  shapeRatio,
  shapedWidth,
  type HandleBase,
} from './sticker-math';
import {
  cropOf,
  cropWindow,
  MAX_ZOOM,
  MIN_ZOOM,
  panCrop,
  type Crop,
} from './crop-math';

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
  eager = false,
  urls,
  selectedId,
  croppingId,
  onSelect,
}: {
  page: AlbumPageWithPhotos;
  bookId: string;
  interactive?: boolean;
  /** The page being read: its photos are wanted now, not "eventually". */
  eager?: boolean;
  /** Signed URLs for this page only, so a change elsewhere can't re-render it. */
  urls?: Map<string, string>;
  selectedId?: string | null;
  /** The sticker whose picture is being moved inside its frame, if any. */
  croppingId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const move = useMoveSticker();
  const style = useStyleSticker();
  const heal = useHealPhotoSize(bookId);

  return (
    <div
      className="pb-page"
      aria-hidden={!interactive}
      // `onClick`, not `onPointerDown`. Clearing the selection on pointerdown
      // fired BEFORE the sticker's own tap handler, so tapping the selected
      // sticker deselected and immediately reselected it — and it could never
      // be dismissed by tapping it again. A click on the paper is a click that
      // no sticker stopped.
      onClick={() => interactive && onSelect?.(null)}
    >
      {page.stickers.map((sticker, i) => (
        <Sticker
          key={sticker.id}
          sticker={sticker}
          interactive={interactive}
          eager={eager}
          cropping={croppingId === sticker.id}
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
          onCrop={(c) =>
            style.mutate({
              id: sticker.id,
              bookId,
              patch: {
                crop_x: c.cropX,
                crop_y: c.cropY,
                crop_zoom: c.cropZoom,
              },
            })
          }
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
  const holds = (id?: string | null) =>
    !!id && a.page.stickers.some((s) => s.id === id);
  return (
    a.page === b.page &&
    a.urls === b.urls &&
    a.interactive === b.interactive &&
    a.eager === b.eager &&
    a.bookId === b.bookId &&
    // Only the page holding the selection cares who is selected.
    (a.selectedId === b.selectedId ||
      !(holds(a.selectedId) || holds(b.selectedId))) &&
    (a.croppingId === b.croppingId ||
      !(holds(a.croppingId) || holds(b.croppingId)))
  );
});

function Sticker({
  sticker,
  interactive,
  eager,
  selected,
  cropping,
  depth,
  url,
  onSelect,
  onTransform,
  onCrop,
  onMeasured,
}: {
  sticker: PlacedSticker;
  interactive: boolean;
  eager: boolean;
  selected: boolean;
  cropping: boolean;
  depth: number;
  url?: string;
  onSelect: () => void;
  onTransform: (t: Transform) => void;
  onCrop: (c: Crop) => void;
  onMeasured: (size: { width: number; height: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const handleBase = useRef<HandleBase | null>(null);
  const cropBase = useRef<Crop | null>(null);
  const isText = sticker.kind === 'text';
  const [view, setView] = useState<Transform>({
    x: sticker.x,
    y: sticker.y,
    scale: sticker.scale || 1,
    rotation: sticker.rotation || 0,
  });
  const [crop, setCrop] = useState<Crop>(() => cropOf(sticker));
  const { crop_x: cropX, crop_y: cropY, crop_zoom: cropZoom } = sticker;

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

  // Deliberately keyed on the three numbers, not on the row: `sticker` gets a
  // new identity every time anything about it changes, and re-seeding the crop
  // from underneath a finger that is mid-drag is how a crop snaps back.
  useEffect(() => {
    if (!busyRef.current)
      setCrop(cropOf({ crop_x: cropX, crop_y: cropY, crop_zoom: cropZoom }));
  }, [cropX, cropY, cropZoom]);

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
      // While cropping, the sticker itself holds perfectly still: the finger is
      // moving the PICTURE, not the frame it sits in. Two drags fighting over
      // one pointer is how "I can't crop it, it just runs away" happens.
      enabled: interactive && !cropping,
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
    { enabled: interactive && !cropping, eventOptions: { passive: false } }
  );

  const polaroid = !isText && sticker.frame === 'polaroid';
  // A polaroid's window is square whatever the sticker says — that squareness
  // IS the format, and every existing film sticker was stored as 'natural'.
  const shape: StickerShape = polaroid
    ? 'square'
    : ((sticker.shape as StickerShape) ?? 'natural');
  const ratio = shapeRatio(shape, sticker.photo?.width, sticker.photo?.height);
  const imgRatio =
    sticker.photo?.width && sticker.photo?.height
      ? sticker.photo.width / sticker.photo.height
      : 1;
  const win = cropWindow(ratio, imgRatio, crop);

  /** Move the picture inside its frame; the frame does not budge. */
  const cropBind = useGesture(
    {
      onDrag: ({ event, first, last, delta: [dx, dy] }) => {
        event?.stopPropagation();
        const box = photoRef.current?.getBoundingClientRect();
        if (!box) return;
        if (first) {
          busyRef.current = true;
          cropBase.current = crop;
        }
        setCrop((c) => {
          const next = panCrop(
            c,
            cropWindow(ratio, imgRatio, c),
            dx,
            dy,
            box.width,
            box.height
          );
          return { ...c, ...next };
        });
        if (last) {
          busyRef.current = false;
          cropBase.current = null;
          onCrop(crop);
        }
      },
      onPinch: ({ event, first, last, offset: [z] }) => {
        event?.stopPropagation();
        if (first) busyRef.current = true;
        setCrop((c) => ({ ...c, cropZoom: z }));
        if (last) {
          busyRef.current = false;
          onCrop({ ...crop, cropZoom: z });
        }
      },
      // Two taps and the picture sits square in its frame again.
      onDoubleClick: ({ event }) => {
        event?.stopPropagation();
        const reset = { cropX: 0.5, cropY: 0.5, cropZoom: 1 };
        setCrop(reset);
        onCrop(reset);
      },
    },
    {
      enabled: interactive && cropping,
      eventOptions: { passive: false },
      drag: { pointer: { touch: true } },
      pinch: {
        from: () => [crop.cropZoom, 0],
        scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
      },
    }
  );

  return (
    <div
      ref={ref}
      {...(interactive && !cropping ? bind() : {})}
      className={cn(
        'pb-sticker',
        isText && 'pb-sticker--text',
        interactive && 'pb-sticker--live',
        selected && 'pb-sticker--sel',
        cropping && 'pb-sticker--crop'
      )}
      style={{
        left: `${view.x * 100}%`,
        top: `${view.y * 100}%`,
        // A sticker being dragged has to clear its neighbours, or it vanishes
        // under them halfway across the page.
        zIndex: selected || cropping ? 1000 : depth,
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
                shapedWidth(
                  shape,
                  sticker.photo?.width,
                  sticker.photo?.height
                ) *
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
        <div
          className={cn(
            'pb-sticker-frame',
            `pb-frame-${polaroid ? 'polaroid' : (sticker.frame ?? 'plain')}`,
            `pb-mount-${sticker.frame_color ?? 'cream'}`
          )}
        >
          <div
            ref={photoRef}
            {...(interactive && cropping ? cropBind() : {})}
            className={cn('pb-sticker-photo', `pb-shape-${shape}`)}
            style={{
              aspectRatio: String(ratio),
              // The three numbers the crop is made of. As custom properties,
              // so the picture's own scale never lands in the same declaration
              // as the sticker's rotation and quietly overwrite it.
              ['--pb-cx' as string]: String(crop.cropX),
              ['--pb-cy' as string]: String(crop.cropY),
              ['--pb-cz' as string]: String(crop.cropZoom),
            }}
          >
            <SlotPhoto
              source={(sticker.photo?.source ?? 'upload') as PhotoSource}
              path={sticker.photo?.image_path ?? null}
              url={url}
              blur={sticker.photo?.blur}
              eager={eager}
              alt={sticker.caption ?? 'Album photo'}
              onMeasured={onMeasured}
            />
            {cropping && <span className="pb-crop-grid" aria-hidden="true" />}
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
      {interactive && selected && !cropping && (
        <span
          {...handleBind()}
          aria-label="Resize and turn"
          className="pb-sticker-handle"
        />
      )}
      {cropping && win.w >= 0.999 && win.h >= 0.999 && (
        // Honest, rather than a drag that mysteriously does nothing: at this
        // zoom the whole picture is already showing and there is nothing to
        // move it to.
        <span className="pb-crop-hint">Pinch to come closer</span>
      )}
    </div>
  );
}

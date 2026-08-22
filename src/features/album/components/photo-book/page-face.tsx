import { memo, useEffect, useRef, useState, type RefObject } from 'react';
import { useGesture } from '@use-gesture/react';
import { cn } from '@kernel/lib';
import type {
  AlbumPageWithPhotos,
  PlacedSticker,
  PhotoSource,
  StickerShape,
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
  matFraction,
  shapeRatio,
  shapedWidth,
  type HandleBase,
} from './sticker-math';
import { cropOf } from './crop-math';

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
  onSelect?: (id: string | null) => void;
}) {
  const move = useMoveSticker();
  const heal = useHealPhotoSize(bookId);
  /**
   * The whole sheet of paper, so that cropping can be done ON IT.
   *
   * A sticker is a couple of centimetres across; pinching one with two thumbs
   * is not a thing anybody can do. While a photo is being cropped the entire
   * page becomes the control surface for it.
   */
  const pageRef = useRef<HTMLDivElement>(null);
  /**
   * When a two-finger gesture last finished.
   *
   * Selection changes ONLY on a deliberate one-finger tap. A pinch can end
   * with a synthetic click, and that click landing on the paper used to throw
   * the selection away in the middle of resizing something.
   */
  const gestureAt = useRef(0);
  /**
   * The sticker currently being manipulated, if any.
   *
   * One thing moves at a time. While a photo is being dragged, resized, turned
   * or cropped, every OTHER sticker on the page stands still — otherwise a
   * stray finger lands on a neighbour halfway through and drags that instead,
   * which is the whole "it feels buggy" of arranging a page.
   */
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div
      ref={pageRef}
      className="pb-page"
      aria-hidden={!interactive}
      // `onClick`, not `onPointerDown`. Clearing the selection on pointerdown
      // fired BEFORE the sticker's own tap handler, so tapping the selected
      // sticker deselected and immediately reselected it — and it could never
      // be dismissed by tapping it again. A click on the paper is a click that
      // no sticker stopped.
      onClick={() => {
        if (!interactive) return;
        if (Date.now() - gestureAt.current < 400) return;
        onSelect?.(null);
      }}
    >
      {page.stickers.map((sticker, i) => (
        <Sticker
          key={sticker.localKey ?? sticker.id}
          sticker={sticker}
          interactive={interactive}
          eager={eager}
          // While ONE photo is being worked on, nothing else on the page moves.
          frozen={!!busyId && busyId !== sticker.id}
          onBusy={setBusyId}
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
          surface={pageRef}
          gestureAt={gestureAt}
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
      !(holds(a.selectedId) || holds(b.selectedId)))
  );
});

function Sticker({
  sticker,
  interactive,
  eager,
  selected,
  frozen,
  depth,
  url,
  onSelect,
  onTransform,
  onMeasured,
  surface,
  gestureAt,
  onBusy,
}: {
  sticker: PlacedSticker;
  interactive: boolean;
  eager: boolean;
  selected: boolean;
  /** Another sticker is being worked on — stand still. */
  frozen: boolean;
  depth: number;
  url?: string;
  onSelect: () => void;
  onTransform: (t: Transform) => void;
  onMeasured: (size: { width: number; height: number }) => void;
  /** The page. Two-finger gestures live here rather than on the sticker. */
  surface: RefObject<HTMLDivElement | null>;
  /** Stamped when a two-finger gesture ends, so no tap is inferred from it. */
  gestureAt: RefObject<number>;
  /** Announce that this sticker is being worked on, so the others hold still. */
  onBusy: (id: string | null) => void;
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
  // DERIVED, not state. Framing happens in its own modal now, so there is
  // nothing here to hold mid-gesture and nothing to re-seed under a finger.
  const crop = cropOf(sticker);

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
        touches,
        movement: [mx, my],
        memo,
        cancel,
      }) => {
        // TWO FINGERS ARE NEVER A MOVE. They belong to the page, which is
        // scaling and turning whatever is selected — including when they land
        // on some other sticker, which must not start dragging that one.
        // Checked before anything else so the event still reaches the page.
        if (touches > 1) {
          const base = memo as { x: number; y: number } | undefined;
          if (base) setView((v) => ({ ...v, x: base.x, y: base.y }));
          busyRef.current = false;
          onBusy(null);
          cancel();
          return;
        }
        if (tap) {
          // A tap that is really the tail of a pinch is not a tap.
          if (Date.now() - gestureAt.current < 400) return;
          onSelect();
          return;
        }
        if (first) {
          // Stop the page-turn gesture (on the stack) from also firing.
          event?.stopPropagation();
          busyRef.current = true;
          onBusy(sticker.id);
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
          onBusy(null);
          onTransform({
            x: nx,
            y: ny,
            scale: view.scale,
            rotation: view.rotation,
          });
        }
        return base;
      },
    },
    {
      // While cropping, the sticker itself holds perfectly still: the finger is
      // moving the PICTURE, not the frame it sits in. Two drags fighting over
      // one pointer is how "I can't crop it, it just runs away" happens.
      enabled: interactive && !frozen,
      eventOptions: { passive: false },
      // Drag only. Pinch is the PAGE's, always — a sticker that is not
      // selected must not be resizable by putting two fingers on it.
      drag: { filterTaps: true, pointer: { touch: true } },
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
          onBusy(sticker.id);
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
          onBusy(null);
          handleBase.current = null;
          onTransform({ x: view.x, y: view.y, ...next });
        }
      },
    },
    {
      enabled: interactive && !frozen,
      eventOptions: { passive: false },
    }
  );

  const polaroid = !isText && sticker.frame === 'polaroid';
  // A polaroid's window is square whatever the sticker says — that squareness
  // IS the format, and every existing film sticker was stored as 'natural'.
  const shape: StickerShape = polaroid
    ? 'square'
    : ((sticker.shape as StickerShape) ?? 'natural');
  const ratio = shapeRatio(shape, sticker.photo?.width, sticker.photo?.height);
  /** The card's band, as a fraction of the sticker's width. */
  const mat = matFraction(sticker.frame, sticker.mat_width);
  const cap = !isText && sticker.caption;

  /**
   * Resize and turn the selected sticker from ANYWHERE on the page.
   *
   * The corner handle is the precise control, but a line of text is a
   * centimetre tall and the handle is smaller still — you cannot pinch that
   * with two adult thumbs. While something is selected the whole sheet takes
   * the pinch, exactly as it does while cropping.
   */
  useGesture(
    {
      onPinch: ({ event, first, last, offset: [scale, rotation] }) => {
        event?.stopPropagation();
        if (first) {
          busyRef.current = true;
          onBusy(sticker.id);
        }
        setView((v) => ({ ...v, scale, rotation }));
        if (last) {
          busyRef.current = false;
          onBusy(null);
          gestureAt.current = Date.now();
          onTransform({ x: view.x, y: view.y, scale, rotation });
        }
      },
    },
    {
      target: surface,
      enabled: interactive && selected,
      eventOptions: { passive: false },
      pinch: {
        from: () => [view.scale, view.rotation],
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: true,
      },
    }
  );

  return (
    <div
      ref={ref}
      {...(interactive ? bind() : {})}
      // The tap that SELECTS this sticker is a gesture, and the click that
      // follows it still travels up to the paper — whose job is to clear the
      // selection. Without this, selecting anything immediately deselected it
      // again and the toolbar never appeared.
      onClick={(e) => interactive && e.stopPropagation()}
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
            // The MOUNT is cut to the same shape as the picture. Without this a
            // gilt circle came out as a square of gold with a round hole in it.
            `pb-fshape-${shape}`,
            `pb-mount-${sticker.frame_color ?? 'cream'}`
          )}
          // A FRACTION of the sticker, not pixels — the card has to grow with
          // the photograph. The number lives in `matFraction` so the printed
          // page can use exactly the same one.
          style={{ ['--pb-mat' as string]: `${mat * 100}%` }}
        >
          <div
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
          </div>
          {sticker.frame === 'tape' && (
            <span className="pb-tape-2" aria-hidden="true" />
          )}
          {/* On film the words live in the chin — that is what the chin is
              for. Every other mount keeps its caption OUTSIDE: inside, a
              caption made a circular mount taller than it was wide, so the
              "circle" came out an egg. */}
          {polaroid && cap && (
            <span
              className={cn('pb-sticker-cap', `pb-font-${sticker.font_family}`)}
              style={{
                ['--pb-cap-size' as string]: `${
                  sticker.font_size * 100 * view.scale * 0.62
                }cqw`,
                ['--pb-cap-weight' as string]: String(sticker.font_weight),
              }}
            >
              {sticker.caption}
            </span>
          )}
        </div>
      )}
      {!polaroid && cap && (
        <span
          className={cn('pb-sticker-cap', `pb-font-${sticker.font_family}`)}
          style={{
            // A fraction of the PAGE, and smaller than a title would be — the
            // same 0.62 the printed page uses, so a caption comes out the size
            // you chose on both.
            ['--pb-cap-size' as string]: `${
              sticker.font_size * 100 * view.scale * 0.62
            }cqw`,
            ['--pb-cap-weight' as string]: String(sticker.font_weight),
          }}
        >
          {sticker.caption}
        </span>
      )}
      {interactive && selected && !frozen && (
        <span
          {...handleBind()}
          aria-label="Resize and turn"
          className="pb-sticker-handle"
        />
      )}
    </div>
  );
}

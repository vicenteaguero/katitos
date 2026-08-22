import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGesture } from '@use-gesture/react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@kernel/lib';
import { Button, Segmented } from '@kernel/ui';
import type {
  FrameColor,
  PaperStock,
  PlacedSticker,
  StickerFrame,
  StickerShape,
} from '../../types';
import type { StickerStyle } from '../../api/placements.mutations';
import { matFraction, shapeRatio, type MatWidth } from './sticker-math';
import {
  cropOf,
  cropWindow,
  MAX_ZOOM,
  MIN_ZOOM,
  NO_CROP,
  panCrop,
  type Crop,
} from './crop-math';
import { SlotPhoto } from './slot-photo';
import type { PhotoSource } from '../../types';

const SHAPES: { value: StickerShape; label: string }[] = [
  { value: 'natural', label: 'As it is' },
  { value: 'rounded', label: 'Soft' },
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Round' },
  { value: 'arch', label: 'Arch' },
  { value: 'heart', label: 'Heart' },
  { value: 'torn', label: 'Torn' },
];

const FRAMES: { value: StickerFrame; label: string }[] = [
  { value: 'none', label: 'Bare' },
  { value: 'white', label: 'Card' },
  { value: 'polaroid', label: 'Film' },
  { value: 'gilt', label: 'Gilt' },
  { value: 'tape', label: 'Taped' },
  { value: 'shadow', label: 'Lifted' },
];

const COLORS: { value: FrameColor; label: string }[] = [
  { value: 'snow', label: 'Snow' },
  { value: 'cream', label: 'Cream' },
  { value: 'sand', label: 'Sand' },
  { value: 'kraft', label: 'Kraft' },
  { value: 'gold', label: 'Gold' },
  { value: 'moss', label: 'Moss' },
  { value: 'olive', label: 'Olive' },
  { value: 'wine', label: 'Wine' },
  { value: 'brown', label: 'Brown' },
  { value: 'charcoal', label: 'Coal' },
];

type Tab = 'cut' | 'mount' | 'colour' | 'card';

/** Mounts with no card at all — the thickness control means nothing to them. */
const NO_CARD = new Set<StickerFrame>(['none', 'tape']);

/**
 * Framing a photograph, on a screen big enough to do it with thumbs.
 *
 * This replaces a mode. Cropping used to happen on the page: the sticker is a
 * couple of centimetres across, so the gesture had to be bound to the whole
 * sheet of paper — which also owns the page-turn, the slide, the deselect tap,
 * the pinch-to-resize and every other sticker's drag. Six mechanisms fighting
 * over one finger to move a picture four millimetres.
 *
 * Here the photograph IS the biggest thing on the screen, so the gesture goes
 * straight on it and there is nothing else on the layer to argue with. And
 * nothing is written until Apply, so a crop you did not mean costs you a tap
 * on Cancel rather than an undo.
 */
export function PhotoStudio({
  sticker,
  url,
  paper = 'cream',
  onCancel,
  onApply,
}: {
  /** Mounting IS opening — the parent renders this only when there is one. */
  sticker: PlacedSticker;
  url?: string;
  paper?: PaperStock;
  onCancel: () => void;
  onApply: (patch: StickerStyle) => void;
}) {
  const [tab, setTab] = useState<Tab>('cut');
  const [shape, setShape] = useState<StickerShape>(
    (sticker.shape as StickerShape) ?? 'natural'
  );
  const [frame, setFrame] = useState<StickerFrame>(
    ((sticker.frame === 'plain' ? 'white' : sticker.frame) as StickerFrame) ??
      'white'
  );
  const [color, setColor] = useState<FrameColor>(
    (sticker.frame_color as FrameColor) ?? 'cream'
  );
  const [mat, setMat] = useState<MatWidth>(
    (sticker.mat_width as MatWidth) ?? 'medium'
  );
  const [crop, setCrop] = useState<Crop>(() => cropOf(sticker));

  const winRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // Measured, not assumed: a one-shot read at mount lands mid-animation and
  // comes back with the wrong box, which is how the preview ends up a sliver.
  const teardown = useRef<(() => void) | null>(null);
  const setStageEl = useCallback((el: HTMLDivElement | null) => {
    teardown.current?.();
    teardown.current = null;
    if (!el) return;
    const read = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    teardown.current = () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onCancel]);

  const polaroid = frame === 'polaroid';
  // Film's window is square whatever the cut says — that squareness IS the
  // format. The stored cut is left alone, so unchecking Film restores it.
  const effShape: StickerShape = polaroid ? 'square' : shape;
  const ratio = shapeRatio(
    effShape,
    sticker.photo?.width,
    sticker.photo?.height
  );
  const imgRatio =
    sticker.photo?.width && sticker.photo?.height
      ? sticker.photo.width / sticker.photo.height
      : 1;
  const m = matFraction(frame, mat);
  const win = cropWindow(ratio, imgRatio, crop);

  // Grow the sticker until it fills the stage in whichever axis binds first.
  const outerRatio = (1 - 2 * m) / ((1 - 2 * m) / ratio + 2 * m);
  const previewW = Math.max(
    120,
    Math.min(stage.w || 320, (stage.h || 320) * outerRatio)
  );

  const bind = useGesture(
    {
      onDrag: ({ event, delta: [dx, dy], pinching, cancel }) => {
        if (pinching) return cancel();
        event?.preventDefault?.();
        const box = winRef.current?.getBoundingClientRect();
        if (!box) return;
        setCrop((c) => ({
          ...c,
          ...panCrop(
            c,
            cropWindow(ratio, imgRatio, c),
            dx,
            dy,
            box.width,
            box.height
          ),
        }));
      },
      onPinch: ({ offset: [z] }) =>
        setCrop((c) => ({
          ...c,
          cropZoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)),
        })),
      onDoubleClick: () => setCrop(NO_CROP),
    },
    {
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      pinch: {
        from: () => [crop.cropZoom, 0],
        scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
      },
    }
  );

  const apply = () =>
    onApply({
      shape,
      frame,
      frame_color: color,
      mat_width: mat,
      crop_x: crop.cropX,
      crop_y: crop.cropY,
      crop_zoom: crop.cropZoom,
    });

  const swatch = (
    on: boolean,
    label: string,
    key: string,
    onPick: () => void,
    inner: React.ReactNode
  ) => (
    <button
      key={key}
      type="button"
      onClick={onPick}
      aria-label={label}
      aria-pressed={on}
      className={cn('pb-swatch', on && 'pb-swatch--on')}
    >
      {inner}
      <span className="pb-swatch-label">{label}</span>
    </button>
  );

  const thumb = (s: StickerShape) => (
    <span
      className={cn('pb-swatch-photo', `pb-shape-${s}`)}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    />
  );

  return createPortal(
    // `pb-wine` is MANDATORY here: --pb-torn and the gilt ramp are scoped to
    // it, and a portal to <body> is outside the book entirely. Without it a
    // torn photo silently becomes a rectangle and gilt becomes transparent.
    <div
      className={cn(
        'pb-wine fixed inset-0 z-[95] flex flex-col',
        `pb-paper-${paper}`
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Frame this photo"
    >
      {/* A plain div with no handler. Tapping outside deliberately does
          NOTHING — the two buttons at the bottom are the way out. It is also a
          SIBLING of the stage, never an ancestor: a backdrop-filter on an
          ancestor re-rasterises the subtree, and that is exactly when iOS
          Safari lets a scaled child escape a clip-path parent. */}
      <div className="pb-studio-scrim absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          ref={setStageEl}
          className="pb-studio-stage flex min-h-0 flex-1 items-center justify-center px-4 py-4"
        >
          <div
            className="pb-sticker pb-studio-sticker"
            style={{ width: previewW }}
          >
            <div
              className={cn(
                'pb-sticker-frame',
                `pb-frame-${frame}`,
                `pb-fshape-${effShape}`,
                `pb-mount-${color}`
              )}
              style={{ ['--pb-mat' as string]: `${m * 100}%` }}
            >
              <div
                ref={winRef}
                {...bind()}
                className={cn('pb-sticker-photo', `pb-shape-${effShape}`)}
                style={{
                  aspectRatio: String(ratio),
                  touchAction: 'none',
                  cursor: 'move',
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
                  eager
                  alt="Framing this photo"
                />
                <span className="pb-crop-grid" aria-hidden="true" />
              </div>
              {frame === 'tape' && (
                <span className="pb-tape-2" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        {/* Everything you touch sits on its own surface. On the bare scrim
            the album showed through the gaps between the controls and none of
            it could be read. */}
        <div className="pb-studio-deck">
          {/* Closer / further. The pinch is the flourish; this is the control
            that works with one hand and always does something. */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              aria-label="How close"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.02}
              value={crop.cropZoom}
              onChange={(e) =>
                setCrop((c) => ({ ...c, cropZoom: Number(e.target.value) }))
              }
              className="pb-studio-zoom flex-1"
            />
            <button
              type="button"
              aria-label="Centre it again"
              className="pb-add pb-add--icon"
              onClick={() => setCrop(NO_CROP)}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          {win.w >= 0.999 && win.h >= 0.999 && (
            <p className="pt-1 text-center font-sans text-xs text-muted">
              Come closer to move the picture around
            </p>
          )}

          <div className="mt-2">
            <Segmented
              full
              value={tab}
              onChange={setTab}
              options={[
                { value: 'cut', label: 'Cut' },
                { value: 'mount', label: 'Mount' },
                { value: 'colour', label: 'Colour' },
                { value: 'card', label: 'Border' },
              ]}
            />
            <div className="pb-studio-row">
              {tab === 'cut' &&
                SHAPES.map((s) =>
                  swatch(
                    shape === s.value,
                    s.label,
                    s.value,
                    () => setShape(s.value),
                    thumb(s.value)
                  )
                )}
              {tab === 'mount' &&
                FRAMES.map((f) =>
                  swatch(
                    frame === f.value,
                    f.label,
                    f.value,
                    () => setFrame(f.value),
                    <span
                      className={cn(
                        'pb-swatch-frame',
                        `pb-frame-${f.value}`,
                        `pb-fshape-${effShape}`,
                        `pb-mount-${color}`
                      )}
                      // Exaggerated on purpose: the page's own band is four
                      // pixels at this size and every mount would look the same.
                      style={{ ['--pb-mat' as string]: '15%' }}
                    >
                      {thumb(effShape)}
                    </span>
                  )
                )}
              {tab === 'colour' &&
                COLORS.map((c) =>
                  swatch(
                    color === c.value,
                    c.label,
                    c.value,
                    () => setColor(c.value),
                    <span
                      className={cn('pb-swatch-color', `pb-mount-${c.value}`)}
                    />
                  )
                )}
              {tab === 'card' &&
                (NO_CARD.has(frame) ? (
                  <p className="px-1 py-3 font-sans text-xs text-muted">
                    {frame === 'tape'
                      ? 'Tape goes straight on the picture — there is no card to widen.'
                      : 'A bare photo has no card. Choose a mount first.'}
                  </p>
                ) : (
                  (['thin', 'medium', 'wide'] as const).map((w) =>
                    swatch(
                      mat === w,
                      w === 'thin'
                        ? 'Thin'
                        : w === 'medium'
                          ? 'Medium'
                          : 'Wide',
                      w,
                      () => setMat(w),
                      <span
                        className={cn(
                          'pb-swatch-frame',
                          `pb-frame-${frame}`,
                          `pb-fshape-${effShape}`,
                          `pb-mount-${color}`
                        )}
                        style={{
                          ['--pb-mat' as string]: `${
                            matFraction(frame, w) * 100 * 2
                          }%`,
                        }}
                      >
                        {thumb(effShape)}
                      </span>
                    )
                  )
                ))}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button variant="ghost" full onClick={onCancel}>
              Cancel
            </Button>
            <Button full onClick={apply}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

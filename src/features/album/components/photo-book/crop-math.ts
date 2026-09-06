/**
 * Which part of a photograph a frame actually shows.
 *
 * Cropping here never touches the file. A placement stores a focal point and
 * how far in, and both the screen and the printed page derive the same visible
 * window from those three numbers - so the picture you framed on the phone is
 * the picture that comes out of the printer, and the original stays whole for
 * the next time you want a different part of it.
 *
 * Coordinates are the image's own 0..1 space, the convention CSS
 * `object-position` already uses: 0 = show the left/top edge, 1 = the
 * right/bottom, 0.5 = centred.
 */

export interface Crop {
  cropX: number;
  cropY: number;
  cropZoom: number;
}

/** The visible rectangle of the image, in image-normalised units. */
export interface CropWindow {
  /** Left edge, 0..1. */
  u: number;
  /** Top edge, 0..1 - measured DOWNWARDS, like the screen. */
  v: number;
  w: number;
  h: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** The crop a placement is carrying, defaulted and clamped into legal range. */
export function cropOf(p: {
  crop_x?: number | null;
  crop_y?: number | null;
  crop_zoom?: number | null;
}): Crop {
  return {
    cropX: clamp01(p.crop_x ?? 0.5),
    cropY: clamp01(p.crop_y ?? 0.5),
    cropZoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, p.crop_zoom || 1)),
  };
}

/** Nothing cropped: the default a fresh sticker wears. */
export const NO_CROP: Crop = { cropX: 0.5, cropY: 0.5, cropZoom: 1 };

/**
 * The window a cover-fitted image shows through a frame of aspect `boxRatio`.
 *
 * At zoom 1 this is exactly what `object-fit: cover` does: the image is scaled
 * until it covers the frame, and the overflow on the long axis is split by the
 * focal point. Zooming shrinks the window about that same point, which is why
 * zooming in never makes the picture jump.
 */
export function cropWindow(
  boxRatio: number,
  imgRatio: number,
  c: Crop
): CropWindow {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.cropZoom || 1));
  const wide = imgRatio > boxRatio;
  const w = (wide ? boxRatio / imgRatio : 1) / z;
  const h = (wide ? 1 : imgRatio / boxRatio) / z;
  return { u: c.cropX * (1 - w), v: c.cropY * (1 - h), w, h };
}

/** Slack left on each axis - zero means that axis has nothing to pan. */
export function slackOf(win: CropWindow): { x: number; y: number } {
  return { x: 1 - win.w, y: 1 - win.h };
}

/**
 * Drag the picture inside its frame.
 *
 * `dx`/`dy` are pixels the finger moved, so the picture follows the finger:
 * dragging right reveals what was off to the LEFT, which means the focal point
 * moves the other way.
 *
 * The guard is the important part. At zoom 1, a photo whose shape already
 * matches its frame has NO slack on either axis - `1 - w` is zero - and
 * dividing by it sends the focal point to Infinity, then NaN, then the database
 * rejects the update and a toast fires on every single frame of the drag. An
 * axis with nothing to give simply doesn't move.
 */
const NO_SLACK = 1e-3;

export function panCrop(
  c: Crop,
  win: CropWindow,
  dxPx: number,
  dyPx: number,
  boxW: number,
  boxH: number
): { cropX: number; cropY: number } {
  const slack = slackOf(win);
  const cropX =
    slack.x < NO_SLACK || boxW <= 0
      ? c.cropX
      : clamp01(c.cropX - (dxPx / boxW) * (win.w / slack.x));
  const cropY =
    slack.y < NO_SLACK || boxH <= 0
      ? c.cropY
      : clamp01(c.cropY - (dyPx / boxH) * (win.h / slack.y));
  return { cropX, cropY };
}

/**
 * The PDF transform that shows only `win` of an image, in a space where the
 * frame IS the unit square.
 *
 * The caller clips to the frame first (`… cm 0 0 1 1 re W n`), which makes this
 * a plain scale-and-shift with no matrix inversion to get wrong. The one term
 * worth reading twice is the vertical offset: `v` counts down from the top of
 * the image and PDF counts up from the bottom, so an off-centre crop that
 * skips the flip prints vertically mirrored - and a centred one doesn't, which
 * is exactly how that bug survives a smoke test.
 */
export function cropMatrix(
  win: CropWindow
): [number, number, number, number, number, number] {
  // `+ 0` collapses negative zero. It is arithmetically nothing and it keeps
  // "-0" out of the PDF's content stream, where it is legal but reads like a
  // bug every time someone opens the file in a text editor.
  return [
    1 / win.w,
    0,
    0,
    1 / win.h,
    -win.u / win.w + 0,
    -(1 - win.v - win.h) / win.h + 0,
  ];
}

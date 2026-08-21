/**
 * Client-side image proxying. Photos are stored twice: the original at its
 * canonical path, and a small, fast-loading proxy at `thumbs/<path>`. Lists and
 * thumbnails load the proxy (a few KB); only a full-screen view or a download
 * fetches the original. Proxy generation is best-effort — if it fails, the
 * original still uploads and display falls back to it, so nothing ever breaks.
 */

/** Where a path's proxy lives — a parallel `thumbs/` tree in the same bucket. */
export function proxyPath(path: string): string {
  return `thumbs/${path}`;
}

/** A decoded image plus the bookkeeping needed to draw and release it. */
export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
}

/**
 * Decode an image Blob into something a canvas can draw.
 *
 * `createImageBitmap` is the fast path, but older iOS Safari throws on HEIC —
 * so we fall back to an `<img>` + object URL, which the system decoder handles.
 * Every caller that touches user photos needs this fallback; without it the
 * iPhone camera roll silently fails on exactly the photos we care about.
 */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(blob);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      release: () => bitmap.close?.(),
    };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image decode failed'));
        el.src = url;
      });
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        source: img,
        release: () => URL.revokeObjectURL(url),
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

interface DownscaleOptions {
  /** Longest edge of the proxy, in px. */
  maxDim?: number;
  /** Encode quality 0–1. */
  quality?: number;
}

/**
 * Downscale a photo Blob to a small WebP proxy (≈30% smaller than JPEG at equal
 * quality, so album/polaroid thumbnails load faster). Falls back to JPEG on
 * engines that can't encode WebP. Resolves to the proxy Blob, or rejects if the
 * browser can't decode/encode — callers treat that as "no proxy".
 */
export async function downscaleImage(
  blob: Blob,
  { maxDim = 512, quality = 0.72 }: DownscaleOptions = {}
): Promise<Blob> {
  // Through `decodeImage`, NOT `createImageBitmap` directly: older iOS Safari
  // throws on HEIC, and HEIC is exactly what her camera roll hands us. Calling
  // the raw API here meant every proxy for an iPhone photo quietly failed and
  // the full-size original got served instead.
  const img = await decodeImage(blob);
  try {
    const longest = Math.max(img.width, img.height) || 1;
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img.source, 0, 0, w, h);

    const encode = (type: string, q: number) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob((out) => resolve(out), type, q)
      );

    // `toBlob` does NOT return null for an unsupported type — per spec it
    // silently falls back to PNG. Safari did exactly that for years, so every
    // "thumbnail" it made was a ~300 KB PNG: three times heavier than the JPEG
    // it was supposed to shrink, which is what made the album crawl. Check what
    // actually came back, and re-encode as JPEG if it isn't WebP.
    const webp = await encode('image/webp', quality);
    if (webp && webp.type === 'image/webp') return webp;

    // Safari cannot encode WebP from a canvas, so on her iPhone EVERY proxy
    // takes this path — and at 0.7 those came out around 76 KB against the
    // 20 KB the WebP ones weigh, which is what made the flowers crawl. JPEG
    // needs a lower number than WebP to reach the same size; at thumbnail
    // scale the difference is invisible.
    const jpeg = await encode('image/jpeg', 0.55);
    if (jpeg && jpeg.type === 'image/jpeg') return jpeg;

    // Neither worked. A PNG proxy is worse than no proxy — callers fall back to
    // the original, which is smaller than a lossless re-encode of it.
    throw new Error('no usable proxy encoding');
  } finally {
    img.release();
  }
}

/** Natural pixel size of a photo, for laying it out without cropping it. */
export async function imageSize(
  blob: Blob
): Promise<{ width: number; height: number }> {
  const img = await decodeImage(blob);
  try {
    return { width: img.width, height: img.height };
  } finally {
    img.release();
  }
}

/**
 * A postage-stamp of a photo, small enough to live in a database row.
 *
 * Twenty-four pixels across, encoded as a data URI: three or four hundred bytes
 * that arrive WITH the page, before anything has been signed for or fetched.
 * Blown up and blurred by CSS it is the shape and the colours of the picture —
 * enough that a page is never a grid of empty grey holes while the real
 * photographs land, including offline and on the very first open.
 *
 * Best-effort like the proxy: if the browser cannot encode it, we simply have
 * no placeholder, which is exactly what we had before.
 */
export async function tinyPlaceholder(
  blob: Blob,
  maxDim = 16
): Promise<string | null> {
  try {
    // Sixteen pixels, and low quality on purpose: it is going to be blurred
    // to nothing anyway, and Safari cannot canvas-encode WebP, so on her phone
    // every one of these is a JPEG — which is roughly twice the size for the
    // same picture. Three hundred photos have to fit in a query response AND
    // in a localStorage snapshot beside everything else in the app.
    const small = await downscaleImage(blob, { maxDim, quality: 0.4 });
    // A placeholder that is not tiny is not a placeholder — it would be dead
    // weight in every page query and in the persisted cache behind it.
    if (small.size > 900) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(small);
    });
  } catch {
    return null;
  }
}

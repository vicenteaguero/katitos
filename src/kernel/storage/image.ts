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
  { maxDim = 400, quality = 0.72 }: DownscaleOptions = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const longest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, w, h);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => {
          if (out) return resolve(out);
          // Engine can't encode WebP (older Safari) → fall back to JPEG.
          canvas.toBlob(
            (jpg) => (jpg ? resolve(jpg) : reject(new Error('toBlob failed'))),
            'image/jpeg',
            0.7
          );
        },
        'image/webp',
        quality
      );
    });
  } finally {
    bitmap.close?.();
  }
}

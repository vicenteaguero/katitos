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
  /** JPEG quality 0–1. */
  quality?: number;
}

/**
 * Downscale a photo Blob to a small JPEG proxy. Resolves to the proxy Blob, or
 * rejects if the browser can't decode/encode — callers treat that as "no proxy".
 */
export async function downscaleImage(
  blob: Blob,
  { maxDim = 512, quality = 0.6 }: DownscaleOptions = {}
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
        (out) => (out ? resolve(out) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      );
    });
  } finally {
    bitmap.close?.();
  }
}

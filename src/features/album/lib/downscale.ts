interface DownscaleOptions {
  maxEdge?: number;
  quality?: number;
}

/**
 * Downscale + re-encode an image Blob to JPEG, capping the longest edge.
 *
 * Primary path: `createImageBitmap` → `<canvas>` → `toBlob('image/jpeg', q)`.
 * This also normalizes HEIC/PNG/etc into JPEG. Older iOS Safari can throw on
 * HEIC inside `createImageBitmap`, so we fall back to decoding via an
 * `<img>` + an object URL.
 */
export async function downscaleImage(
  blob: Blob,
  { maxEdge = 1600, quality = 0.85 }: DownscaleOptions = {}
): Promise<Blob> {
  let width: number;
  let height: number;
  let draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  let cleanup: () => void = () => {};

  try {
    const bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;
    draw = (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h);
    cleanup = () => bitmap.close();
  } catch {
    // Fallback: decode through an <img> element (older iOS HEIC path).
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      width = img.naturalWidth;
      height = img.naturalHeight;
      draw = (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h);
    } finally {
      cleanup = () => URL.revokeObjectURL(url);
    }
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob; // canvas unavailable — keep the original
    draw(ctx, w, h);

    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    return out ?? blob;
  } finally {
    cleanup();
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = url;
  });
}

import { supabase } from '@kernel/supabase';
import { BUCKETS } from '@kernel/storage';
import type { AlbumPageWithPhotos, PlacedSticker } from '../../types';
import { mapWithConcurrency } from '../upload-queue';
import {
  filmLayout,
  layoutSticker,
  PAGE_H,
  PAGE_W,
  stickerMatrix,
  type Box,
} from './pdf-layout';
import { drawImage, fillRect, PdfDoc, readJpegSize } from './pdf-writer';

/**
 * Print the album at full quality.
 *
 * Deliberately not reachable from the UI: it downloads every ORIGINAL in the
 * book, which is the opposite of what the app does the rest of the time. The
 * screen loads 512px proxies; this loads the real thing so the printed page has
 * something to be sharp with.
 */
export interface ExportOptions {
  /** Hand the file to the OS share sheet — the only thing that works in an
   *  installed iOS PWA, where an `<a download>` quietly does nothing. */
  share?: boolean;
  /** Skip the download and just return the Blob (used by tests). */
  returnBlob?: boolean;
}

/** Font used for captions rendered to pixels. Must match the on-screen page. */
const CAPTION_FONT = "italic 600 %SIZE%px 'Cormorant Garamond', Georgia, serif";
/** Draw text at 3× and let the PDF scale it down — cheap sharpness. */
const TEXT_OVERSAMPLE = 3;

async function fetchOriginal(url: string): Promise<Uint8Array> {
  // `no-store`: the service worker caches storage responses forever, and an
  // export would otherwise fill a phone with full-size originals it will never
  // show again.
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not fetch ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Re-encode anything that isn't already a JPEG (older uploads, PNG picks). */
async function ensureJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return bytes;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, 'image/jpeg', 0.92)
    );
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Words → a JPEG, because a bare PDF font cannot spell anything in Cyrillic. */
async function textToJpeg(
  text: string,
  fontPx: number,
  family: string
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = CAPTION_FONT.replace(
    '%SIZE%',
    String(fontPx * TEXT_OVERSAMPLE)
  ).replace("'Cormorant Garamond', Georgia, serif", family);
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.max(1, Math.ceil(metrics.width) + 8);
  const h = Math.ceil(fontPx * TEXT_OVERSAMPLE * 1.4);
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) return null;
  // Opaque paper behind the words: JPEG has no transparency, and a black box
  // around every caption would be worse than no caption at all.
  c.fillStyle = '#fdfaf4';
  c.fillRect(0, 0, w, h);
  c.font = font;
  c.fillStyle = '#3a1e10';
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.fillText(text, w / 2, h / 2);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, 'image/jpeg', 0.92)
  );
  if (!blob) return null;
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: w,
    height: h,
  };
}

const FONT_STACK: Record<string, string> = {
  display: "italic 600 %SIZE%px 'Cormorant Garamond', Georgia, serif",
  sans: "600 %SIZE%px 'Manrope', system-ui, sans-serif",
  hand: "600 %SIZE%px 'Caveat', 'Cormorant Garamond', cursive",
};

/**
 * Build the PDF for one book.
 *
 * `pages` comes from the same query the screen uses, so what prints is exactly
 * what is arranged — same order, same depths, same positions.
 */
export async function buildAlbumPdf(
  pages: AlbumPageWithPhotos[]
): Promise<Blob> {
  const doc = new PdfDoc(PAGE_W, PAGE_H);

  // Sign every original ONCE, per bucket, rather than per photo.
  const albumPaths = new Set<string>();
  const polaroidPaths = new Set<string>();
  for (const page of pages) {
    for (const st of page.stickers) {
      const p = st.photo?.image_path;
      if (!p) continue;
      (st.photo?.source === 'polaroid' ? polaroidPaths : albumPaths).add(p);
    }
  }

  const signed = new Map<string, string>();
  for (const [bucket, paths] of [
    [BUCKETS.album, albumPaths],
    [BUCKETS.polaroids, polaroidPaths],
  ] as const) {
    if (!paths.size) continue;
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrls([...paths], 600);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  }

  for (const page of pages) {
    const images: { name: string; ref: number }[] = [];
    let ops = '';
    let n = 0;

    // Back to front: `stickers` is already ordered, and PDF paints in the
    // order it is told, so depth costs nothing here.
    const drawn = await mapWithConcurrency(
      page.stickers,
      3,
      async (st: PlacedSticker) => {
        if (st.kind === 'text') return { st, bytes: null };
        const path = st.photo?.image_path;
        const url = path ? signed.get(path) : undefined;
        if (!url) return { st, bytes: null };
        const raw = await fetchOriginal(url);
        return { st, bytes: await ensureJpeg(raw) };
      }
    );

    for (const result of drawn) {
      const item = result.value;
      if (!item) continue;
      const { st, bytes } = item;
      const box = layoutSticker({
        x: st.x,
        y: st.y,
        scale: st.scale,
        rotation: st.rotation,
        width: st.photo?.width,
        height: st.photo?.height,
      });

      if (st.kind === 'text') {
        const size = st.font_size * PAGE_W;
        const img = await textToJpeg(
          st.body ?? '',
          size,
          FONT_STACK[st.font_family] ?? FONT_STACK.display
        );
        if (!img) continue;
        const ref = doc.addJpeg(img.bytes, img.width, img.height);
        const name = `Im${n++}`;
        images.push({ name, ref });
        // The canvas was drawn at TEXT_OVERSAMPLE times the point size, so
        // dividing by it lands the words at exactly the size the page asked
        // for — just with three times the pixels behind them.
        const wPt = img.width / TEXT_OVERSAMPLE;
        const textBox: Box = {
          cx: box.cx,
          cy: box.cy,
          w: wPt,
          h: (img.height / img.width) * wPt,
          rotation: box.rotation,
        };
        ops += drawImage(name, stickerMatrix(textBox));
        continue;
      }

      if (!bytes) continue;
      const size = readJpegSize(bytes);
      if (!size) continue;
      const ref = doc.addJpeg(bytes, size.width, size.height);
      const name = `Im${n++}`;
      images.push({ name, ref });

      if (st.frame === 'polaroid') {
        // The white plate is vector — a rectangle costs nothing and stays
        // crisp at any print size.
        const film = filmLayout(box.w);
        const plate: Box = {
          cx: box.cx,
          cy: box.cy,
          w: film.plate.w,
          h: film.plate.h,
          rotation: box.rotation,
        };
        ops += fillRect(0, 0, 1, 1, [0.992, 0.98, 0.957], stickerMatrix(plate));
        const window: Box = {
          cx:
            box.cx + (film.window.x + film.window.size / 2 - film.plate.w / 2),
          cy:
            box.cy + (film.window.y + film.window.size / 2 - film.plate.h / 2),
          w: film.window.size,
          h: film.window.size,
          rotation: box.rotation,
        };
        ops += drawImage(name, stickerMatrix(window));
      } else {
        ops += drawImage(name, stickerMatrix(box));
      }

      if (st.caption) {
        // A caption sits under its photo and should never out-shout it.
        const size = st.font_size * PAGE_W * 0.6;
        const img = await textToJpeg(
          st.caption,
          size,
          FONT_STACK[st.font_family] ?? FONT_STACK.display
        );
        if (img) {
          const capRef = doc.addJpeg(img.bytes, img.width, img.height);
          const capName = `Im${n++}`;
          images.push({ name: capName, ref: capRef });
          // Fit the words to the photo's width, but never stretch them past it.
          const capW = Math.min(box.w * 0.92, img.width / TEXT_OVERSAMPLE);
          const capBox: Box = {
            cx: box.cx,
            cy: box.cy - box.h / 2 - (capW * img.height) / img.width,
            w: capW,
            h: (capW * img.height) / img.width,
            rotation: box.rotation,
          };
          ops += drawImage(capName, stickerMatrix(capBox));
        }
      }
    }

    doc.addPage(ops, images);
  }

  return doc.build();
}

/** Build it and hand it over, however this device is willing to accept a file. */
export async function exportAlbumPdf(
  pages: AlbumPageWithPhotos[],
  title = 'album',
  opts: ExportOptions = {}
): Promise<Blob> {
  const blob = await buildAlbumPdf(pages);
  if (opts.returnBlob) return blob;

  const file = new File([blob], `${title}.pdf`, { type: 'application/pdf' });
  if (opts.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return blob;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return blob;
}

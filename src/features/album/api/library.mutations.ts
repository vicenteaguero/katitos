import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import {
  BUCKETS,
  downscaleImage,
  imageSize,
  proxyPath,
  storagePaths,
  tinyPlaceholder,
  usePhotoUpload,
} from '@kernel/storage';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { toast } from '@kernel/ui';
import type { AlbumPageWithPhotos, AlbumPhoto } from '../types';
import { mapWithConcurrency, type JobState } from '../lib/upload-queue';

/**
 * What we keep as the "original".
 *
 * Album photos used to be stored exactly as the phone produced them — five
 * megabytes each, downloaded in full any time the proxy was missing, and
 * multiplied by every photo in a book. 2048px at 0.82 is around half a
 * megabyte, still ~340dpi across an A5 page, which is what the printed PDF
 * draws from. The small `thumbs/` proxy (512px) is what the book itself loads.
 */
const ORIGINAL_MAX_DIM = 2048;
const ORIGINAL_QUALITY = 0.82;
/** Decoding several 12MP photos at once is what kills an iOS tab. */
const DECODE_CONCURRENCY = 2;

export interface UploadJob {
  name: string;
  state: JobState;
  error?: string;
}

/**
 * Empty a camera roll into a book.
 *
 * Each photo is shrunk, uploaded, and given its library row IMMEDIATELY — not
 * batched at the end — so the strip fills in as you watch and a failure halfway
 * through costs you only that one photo.
 */
export function useBulkAddToLibrary(bookId: string | undefined) {
  const qc = useQueryClient();
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(
    async (files: File[]) => {
      if (!bookId || !files.length) return;
      setRunning(true);
      setJobs(
        files.map((f) => ({ name: f.name, state: 'queued' as JobState }))
      );

      const results = await mapWithConcurrency(
        files,
        DECODE_CONCURRENCY,
        async (file) => {
          // Shrink FIRST: everything downstream (the proxy, the upload, the
          // memory high-water mark) is cheaper on the smaller blob.
          let blob: Blob = file;
          let size: { width: number; height: number } | null = null;
          try {
            size = await imageSize(file);
            blob = await downscaleImage(file, {
              maxDim: ORIGINAL_MAX_DIM,
              quality: ORIGINAL_QUALITY,
            });
          } catch {
            // Un-decodable here (an exotic HEIC, a browser without canvas
            // encoding) — keep the file as it came rather than losing it.
          }

          // The postage-stamp comes off the SHRUNK blob, so it costs one more
          // encode of something already small rather than another decode of a
          // twelve-megapixel HEIC.
          const blur = await tinyPlaceholder(blob);

          const path = storagePaths.albumPhoto(bookId, nanoid(12));
          await uploadPhoto(BUCKETS.album, path, blob);

          const { error } = await supabase.from('album_photos').insert({
            book_id: bookId,
            image_path: path,
            source: 'upload',
            width: size?.width ?? null,
            height: size?.height ?? null,
            blur,
            ...(userId ? { created_by: userId } : {}),
          });
          if (error) throw error;
          void qc.invalidateQueries({ queryKey: qk.album.library(bookId) });
          return path;
        },
        (p) =>
          setJobs((js) =>
            js.map((j, i) =>
              i === p.index ? { ...j, state: p.state, error: p.error } : j
            )
          )
      );

      setRunning(false);
      const failed = results.filter((r) => r.error).length;
      if (failed)
        toast.error(`${failed} photo${failed === 1 ? '' : 's'} failed`);
      void qc.invalidateQueries({ queryKey: qk.album.library(bookId) });
      void qc.invalidateQueries({ queryKey: [...qk.album.books(), 'counts'] });
      return results;
    },
    [bookId, qc, uploadPhoto, userId]
  );

  const reset = useCallback(() => setJobs([]), []);
  return { run, jobs, running, reset };
}

/** Add a single photo — the camera, or one picked from the polaroids. */
export function useAddToLibrary() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    mutationFn: async (v: {
      bookId: string;
      source: 'upload' | 'polaroid';
      blob?: Blob;
      polaroidPath?: string;
      caption?: string | null;
    }) => {
      let imagePath = v.polaroidPath ?? null;
      let size: { width: number; height: number } | null = null;
      let blur: string | null = null;
      if (v.source === 'upload') {
        if (!v.blob) throw new Error('No photo to upload');
        let blob: Blob = v.blob;
        try {
          size = await imageSize(v.blob);
          blob = await downscaleImage(v.blob, {
            maxDim: ORIGINAL_MAX_DIM,
            quality: ORIGINAL_QUALITY,
          });
        } catch {
          /* keep the original bytes */
        }
        blur = await tinyPlaceholder(blob);
        imagePath = storagePaths.albumPhoto(v.bookId, nanoid(12));
        await uploadPhoto(BUCKETS.album, imagePath, blob);
      }
      const { data, error } = await supabase
        .from('album_photos')
        .insert({
          book_id: v.bookId,
          image_path: imagePath,
          source: v.source,
          caption: v.caption ?? null,
          width: size?.width ?? null,
          height: size?.height ?? null,
          blur,
          ...(userId ? { created_by: userId } : {}),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as AlbumPhoto;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.album.library(v.bookId) });
      void qc.invalidateQueries({ queryKey: [...qk.album.books(), 'counts'] });
    },
  });
}

/**
 * Delete a photo from the album for good — the row, every placement of it, and
 * the bytes.
 *
 * The deliberate, confirmed half of "remove". Taking a sticker off a page is
 * the other half and it lives in `useUnplaceSticker`, where it is undoable.
 */
export function useDeleteFromLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { photo: AlbumPhoto; bookId: string }) => {
      const { error } = await supabase
        .from('album_photos')
        .delete()
        .eq('id', v.photo.id);
      if (error) throw error;
      // Only uploaded bytes are ours to clean up; a polaroid's path belongs to
      // the polaroid feature and must survive.
      if (v.photo.source === 'upload' && v.photo.image_path) {
        // The same picture can have been added to the library twice; deleting
        // the bytes while another row still points at them would blank it.
        const { data: stillUsed } = await supabase
          .from('album_photos')
          .select('id')
          .eq('image_path', v.photo.image_path)
          .limit(1);
        if (!stillUsed?.length) {
          await supabase.storage
            .from(BUCKETS.album)
            .remove([v.photo.image_path, proxyPath(v.photo.image_path)]);
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.album.library(v.bookId) });
      void qc.invalidateQueries({ queryKey: qk.album.pages(v.bookId) });
      void qc.invalidateQueries({ queryKey: [...qk.album.books(), 'counts'] });
    },
  });
}

/**
 * Fill in a photo's real pixel size, once, from the browser.
 *
 * `width` / `height` arrived with the library, so every picture added before it
 * has neither — and a sticker with no ratio has no height at all. Rather than a
 * migration that cannot open a JPEG, the first render that decodes the image
 * writes what it saw. Fire-and-forget: it must never interrupt looking at the
 * album, and it is harmless if both phones do it at once.
 *
 * It writes the answer STRAIGHT INTO THE CACHE rather than invalidating. The
 * old version invalidated the whole book once per healed photo, so opening an
 * older album with a dozen unmeasured pictures fired a dozen full refetches —
 * each one rebuilding every page element while the images were still decoding.
 */
const measured = new Set<string>();

export function useHealPhotoSize(bookId: string | undefined) {
  const qc = useQueryClient();
  return useCallback(
    (photoId: string, size: { width: number; height: number }) => {
      if (measured.has(photoId)) return;
      measured.add(photoId);

      // The screen can know immediately; the database catches up when it does.
      if (bookId) {
        const key = qk.album.pages(bookId);
        qc.setQueryData<AlbumPageWithPhotos[]>(key, (pages) =>
          pages?.map((page) =>
            page.stickers.some((s) => s.photo?.id === photoId)
              ? {
                  ...page,
                  stickers: page.stickers.map((s) =>
                    s.photo?.id === photoId
                      ? { ...s, photo: { ...s.photo, ...size } }
                      : s
                  ),
                }
              : page
          )
        );
      }

      void supabase
        .from('album_photos')
        .update({ width: size.width, height: size.height })
        .eq('id', photoId)
        .is('width', null)
        .then(
          () => {},
          () => measured.delete(photoId)
        );
    },
    [qc, bookId]
  );
}

/**
 * Give a photo the little placeholder it was uploaded without.
 *
 * Same idea as the size heal and the same one-shot bookkeeping: the first
 * screen that has the real bytes in hand makes the postage-stamp and stores it,
 * so every later open of that page paints instantly. Nothing waits on it.
 */
const blurred = new Set<string>();

export function useHealPhotoBlur() {
  return useCallback((photoId: string, blur: string) => {
    if (blurred.has(photoId)) return;
    blurred.add(photoId);
    void supabase
      .from('album_photos')
      .update({ blur })
      .eq('id', photoId)
      .is('blur', null)
      .then(
        () => {},
        () => blurred.delete(photoId)
      );
  }, []);
}

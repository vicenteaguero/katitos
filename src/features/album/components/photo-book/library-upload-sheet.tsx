import { useState } from 'react';
import { Camera, Check, Images, ImagePlus, X } from 'lucide-react';
import { cn } from '@kernel/lib';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { CameraCapture, FilePickerButton, Sheet, Spinner } from '@kernel/ui';
import { batchProgress } from '../../lib/upload-queue';
import { usePolaroidPicker } from '../../api/photo-book.queries';
import { useAddToLibrary, type UploadJob } from '../../api/library.mutations';

/**
 * Photos in, and nothing else.
 *
 * Three ways in — the camera roll, the camera, or one of our daily polaroids —
 * as three small buttons on ONE row, because they are a means to an end and
 * they used to take up half the sheet before a single photo had been chosen.
 * Everything below them is the photos themselves: what you picked, how far
 * along it is, and an ✕ on each in case you picked the wrong one.
 *
 * No cropper in this path on purpose: squaring thirty photos one at a time is
 * not a thing anybody does twice. Cropping stays available per sticker later.
 */
export function LibraryUploadSheet({
  open,
  onClose,
  onPick,
  onRemove,
  jobs,
  running,
  bookId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (files: File[]) => void;
  onRemove: (index: number) => void;
  jobs: UploadJob[];
  running: boolean;
  bookId: string;
}) {
  const { done, failed, total, pct } = batchProgress(jobs.map((j) => j.state));
  const [pickingPolaroid, setPickingPolaroid] = useState(false);
  const [shooting, setShooting] = useState(false);
  const { data: polaroids } = usePolaroidPicker(pickingPolaroid);
  const addOne = useAddToLibrary();
  const { data: thumbs } = useSignedUrls(
    BUCKETS.polaroids,
    (polaroids ?? []).map((p) => p.image_path),
    { proxy: true, enabled: pickingPolaroid }
  );

  if (shooting) {
    return (
      <CameraCapture
        onCancel={() => setShooting(false)}
        onCapture={(blob) => {
          setShooting(false);
          addOne.mutate({ bookId, source: 'upload', blob });
        }}
      />
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={total ? `${done} of ${total}` : 'Add photos'}
      size="half"
    >
      <div className="space-y-3">
        {/* Three ways in, one row, symbols only. */}
        <div className="flex gap-2">
          <FilePickerButton
            multiple
            onPickMany={onPick}
            bare
            className="flex-1"
          >
            <span className="pb-add">
              <ImagePlus size={17} />
              <span>Choose</span>
            </span>
          </FilePickerButton>
          <button
            type="button"
            className="pb-add flex-1"
            onClick={() => setShooting(true)}
          >
            <Camera size={17} />
            <span>Take</span>
          </button>
          <button
            type="button"
            aria-pressed={pickingPolaroid}
            className={cn('pb-add flex-1', pickingPolaroid && 'pb-add--on')}
            onClick={() => setPickingPolaroid((v) => !v)}
          >
            <Images size={17} />
            <span>Polaroid</span>
          </button>
        </div>

        {pickingPolaroid && (
          <div className="pb-gallery">
            {(polaroids ?? []).map((p) => {
              const url = p.image_path ? thumbs?.get(p.image_path) : undefined;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Add the polaroid from ${p.day}`}
                  disabled={addOne.isPending || !p.image_path}
                  onClick={() =>
                    p.image_path &&
                    addOne.mutate(
                      {
                        bookId,
                        source: 'polaroid',
                        polaroidPath: p.image_path,
                        caption: p.caption,
                      },
                      { onSuccess: () => setPickingPolaroid(false) }
                    )
                  }
                  className="pb-gallery-item"
                >
                  {url && <img src={url} alt="" loading="lazy" />}
                </button>
              );
            })}
          </div>
        )}

        {total > 0 && (
          <>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* The photos themselves, not a list of file names. */}
            <div className="pb-gallery">
              {jobs.map((job, i) => (
                <div
                  key={`${job.name}-${i}`}
                  className={cn(
                    'pb-upload-tile',
                    job.state === 'failed' && 'pb-upload-tile--failed'
                  )}
                >
                  {job.previewUrl && <img src={job.previewUrl} alt="" />}
                  {job.state !== 'done' && (
                    <span className="pb-upload-state">
                      {job.state === 'failed' ? (
                        <X className="h-4 w-4 text-danger" />
                      ) : (
                        <Spinner className="h-4 w-4" />
                      )}
                    </span>
                  )}
                  {job.state === 'done' && (
                    <span className="pb-upload-done">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {/* Wrong photo? Out it goes — the row and its bytes are
                      cleaned up behind you, so nothing here waits on a
                      round trip. */}
                  <button
                    type="button"
                    aria-label={`Remove ${job.name}`}
                    className="pb-upload-x"
                    onClick={() => onRemove(i)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center font-sans text-xs text-muted">
              {running
                ? 'Adding them…'
                : failed
                  ? `${failed} didn’t make it — the rest are in`
                  : 'All in. Tap one under the book to place it.'}
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

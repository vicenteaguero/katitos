import { Check, ImagePlus, X } from 'lucide-react';
import { FilePickerButton, Sheet, Spinner } from '@kernel/ui';
import { batchProgress } from '../../lib/upload-queue';
import type { UploadJob } from '../../api/library.mutations';

/**
 * Twenty photos at once, with something honest to watch while they land.
 *
 * No cropper in this path on purpose: squaring thirty photos one at a time is
 * not a thing anybody does twice. Cropping stays available per sticker later.
 */
export function LibraryUploadSheet({
  open,
  onClose,
  onPick,
  jobs,
  running,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (files: File[]) => void;
  jobs: UploadJob[];
  running: boolean;
}) {
  const { done, failed, total, pct } = batchProgress(jobs.map((j) => j.state));

  return (
    <Sheet open={open} onClose={onClose} title="Add photos" size="half">
      <div className="space-y-3">
        <FilePickerButton multiple onPickMany={onPick} className="w-full">
          <ImagePlus size={16} /> Choose photos
        </FilePickerButton>

        {total > 0 && (
          <>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {done} of {total} added{failed ? ` · ${failed} failed` : ''}
              </span>
              {running && <Spinner className="h-3.5 w-3.5" />}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-gold transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {jobs.map((j, i) => (
                <li
                  key={`${j.name}-${i}`}
                  className="flex items-center gap-2 text-xs"
                >
                  {j.state === 'done' && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-gold" />
                  )}
                  {j.state === 'failed' && (
                    <X className="h-3.5 w-3.5 shrink-0 text-danger" />
                  )}
                  {j.state === 'working' && (
                    <Spinner className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {j.state === 'queued' && (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {j.name}
                  </span>
                  {j.error && (
                    <span className="shrink-0 text-danger">{j.error}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  );
}

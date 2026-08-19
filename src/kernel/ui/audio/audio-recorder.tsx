import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { cn } from '@kernel/lib';
import { useAudioRecorder, type AudioClip } from './use-audio-recorder';

/** "0:07" — a recording is seconds long, so seconds is all it needs to say. */
function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Record a clip and hand it back WITH its real type.
 *
 * `onRecorded` receives the whole clip, not a bare Blob: the container the
 * browser chose has to reach the upload, or the file gets stored under a name
 * and content-type it isn't, and the other phone can't play it.
 */
export function AudioRecorder({
  onRecorded,
  className,
}: {
  onRecorded: (clip: AudioClip | null) => void;
  className?: string;
}) {
  const { recording, clip, elapsedMs, supported, error, start, stop, reset } =
    useAudioRecorder();
  const [url, setUrl] = useState<string | null>(null);

  // The callback is held in a ref so an inline lambda from a caller can't
  // re-fire this effect on every render — the old version leaked exactly that
  // way and it was luck that the two call sites passed stable setters.
  const cb = useRef(onRecorded);
  cb.current = onRecorded;

  useEffect(() => {
    cb.current(clip);
    if (!clip) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(clip.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [clip]);

  if (!supported) {
    return <p className="text-xs text-muted">Recording not supported here.</p>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={recording ? stop : () => void start()}
          aria-label={recording ? 'Stop recording' : 'Record'}
          className={cn(
            'lift-press inline-flex h-10 items-center gap-2 rounded-full px-4 font-sans text-sm font-semibold transition',
            recording
              ? 'bg-danger text-white'
              : 'bg-surface-2 text-fg hover:brightness-110'
          )}
        >
          {recording ? <Square size={15} /> : <Mic size={15} />}
          {recording ? clock(elapsedMs) : clip ? 'Again' : 'Record'}
        </button>
        {recording && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        )}
        {clip && !recording && (
          <>
            <audio
              src={url ?? undefined}
              controls
              className="h-9 min-w-0 flex-1"
            />
            <button
              type="button"
              aria-label="Discard recording"
              onClick={reset}
              className="shrink-0 text-muted"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

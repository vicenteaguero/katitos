import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { cn } from '@kernel/lib';
import { useAudioRecorder, type AudioClip } from './use-audio-recorder';
import { PlayButton } from './audio-player';
import { sharedAudio } from './shared-audio';

/** "0:07" - a recording is seconds long, so seconds is all it needs to say. */
function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Record a clip and hand it back WITH its real type.
 *
 * Three states, each its own shape: a dashed gold pill that says Record; a
 * red pill with the clock while it runs, tap to stop; and a row to listen
 * back, with the bin. Keeping the clip is the parent's button, so the row
 * never pretends to have saved anything.
 *
 * `onRecorded` receives the whole clip, not a bare Blob: the container the
 * browser chose has to reach the upload, or the file gets stored under a name
 * and content-type it isn't, and the other phone can't play it.
 */
export function AudioRecorder({
  onRecorded,
  resetKey,
  variant = 'pill',
  label = 'Record',
  className,
}: {
  onRecorded: (clip: AudioClip | null) => void;
  /**
   * Change it and the recorder starts clean. The parent's copy of the clip is
   * cleared after a save, but the clip lived in here and kept showing - so
   * the next word looked recorded and was saved silent.
   */
  resetKey?: string | number;
  /** `compact` is a 44px mic tile, for a row or a rail. */
  variant?: 'pill' | 'compact';
  label?: string;
  className?: string;
}) {
  const { recording, clip, elapsedMs, supported, error, start, stop, reset } =
    useAudioRecorder();
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  // The callback is held in a ref so an inline lambda from a caller can't
  // re-fire this effect on every render - the old version leaked exactly that
  // way and it was luck that the two call sites passed stable setters.
  const cb = useRef(onRecorded);
  cb.current = onRecorded;

  useEffect(() => {
    cb.current(clip);
    setProgress(0);
    if (!clip) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(clip.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [clip]);

  // The thin line under the clip follows the shared player while it plays
  // THIS clip, and nothing else.
  useEffect(() => {
    if (!url) return;
    const el = sharedAudio();
    const tick = () => {
      if (el.src !== url || !el.duration) return;
      setProgress(el.currentTime / el.duration);
    };
    const done = () => {
      if (el.src === url) setProgress(0);
    };
    el.addEventListener('timeupdate', tick);
    el.addEventListener('ended', done);
    el.addEventListener('pause', done);
    return () => {
      el.removeEventListener('timeupdate', tick);
      el.removeEventListener('ended', done);
      el.removeEventListener('pause', done);
    };
  }, [url]);

  if (!supported) {
    return <p className="text-xs text-muted">Recording not supported here.</p>;
  }

  const compact = variant === 'compact';

  return (
    <div className={cn('space-y-2', className)}>
      {clip && !recording ? (
        <div className="flex items-center gap-2 rounded border border-fg/[0.07] bg-surface-2 px-2.5 py-2">
          <PlayButton url={url} size="sm" label="Hear it back" />
          <span className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-[2px] bg-fg/10">
            <span
              className="absolute inset-y-0 left-0 rounded-[2px] bg-gold transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
          <span className="font-sans text-[11.5px] font-semibold tabular-nums text-muted">
            {clock(clip.durationMs || elapsedMs)}
          </span>
          <button
            type="button"
            aria-label="Discard recording"
            onClick={reset}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={recording ? stop : () => void start()}
          aria-label={recording ? 'Stop recording' : label}
          className={cn(
            'lift-press inline-flex items-center justify-center gap-2 font-sans text-[13.5px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-gold',
            compact ? 'h-11 w-11 rounded' : 'h-11 rounded-full px-[18px]',
            recording
              ? 'bg-danger text-white'
              : 'border border-dashed border-gold/45 bg-surface-2 text-gold hover:brightness-110'
          )}
        >
          {recording ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {!compact && (recording ? clock(elapsedMs) : label)}
          {recording && (
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-white/90" />
          )}
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { useSignedUrl, type BucketName } from '@kernel/storage';
import { cn } from '@kernel/lib';
import { claimAudio, stopSharedAudio } from './shared-audio';

/** "0:03" while it plays. */
function clock(s: number): string {
  const total = Math.floor(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
} as const;

/**
 * Her voice on a thing: one button, one clip at a time.
 *
 * A tile by default - a speaker on a lifted square - and a wine pill with
 * words when it is the one action on a card ("Hear her"). While it plays,
 * the pill shows a pause, three bars and the seconds.
 */
export function PlayButton({
  bucket,
  path,
  url: urlProp,
  size = 'md',
  variant = 'tile',
  autoPlayKey,
  className,
  label = 'Play',
  children,
}: {
  bucket?: BucketName;
  path?: string | null;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'tile' | 'pill';
  /**
   * Change this to make the clip play by itself - used when a card flips to
   * its answer. Never fires on first mount, so nothing blares unbidden.
   */
  autoPlayKey?: string | number;
  className?: string;
  label?: string;
  /** The pill's words; the label when left out. */
  children?: ReactNode;
}) {
  const selfSigned = useSignedUrl(
    bucket as BucketName,
    !urlProp && bucket && path ? path : undefined
  );
  const url = urlProp ?? selfSigned.data ?? null;
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const firstAutoPlay = useRef(true);
  // Read in the unmount cleanup, which must not re-run when `playing` changes.
  const playingRef = useRef(false);
  playingRef.current = playing;

  /**
   * Stop the sound if this button is taken off screen mid-clip - and ONLY
   * then. Watching `playing` here instead meant that handing playback to
   * another button ran this cleanup a beat AFTER that button had started, and
   * paused it: tapping a second word left nothing playing at all.
   */
  useEffect(
    () => () => {
      if (playingRef.current) stopSharedAudio();
    },
    []
  );

  const start = () => {
    if (!url) return;
    const el = claimAudio(() => setPlaying(false));
    el.src = url;
    el.onended = () => setPlaying(false);
    el.ontimeupdate = () => setAt(el.currentTime);
    setAt(0);
    void el.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  };

  const toggle = () => {
    if (!url) return;
    if (playing) {
      stopSharedAudio();
      setPlaying(false);
      return;
    }
    start();
  };

  useEffect(() => {
    if (autoPlayKey === undefined) return;
    if (firstAutoPlay.current) {
      firstAutoPlay.current = false;
      return;
    }
    // Always START - never toggle. A toggle here would PAUSE the clip if the
    // card happened to be playing when it flipped.
    if (url) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayKey, url]);

  if (!url) return null;
  const icon = size === 'sm' ? 14 : 16;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : label}
        className={cn(
          'lift-press inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-[18px] font-sans text-[13px] font-bold text-accent-fg outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-gold',
          className
        )}
      >
        {playing ? (
          <>
            <Pause size={14} />
            <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
              <span className="h-1.5 w-[3px] animate-pulse rounded-[2px] bg-white/85" />
              <span className="h-3 w-[3px] animate-pulse rounded-[2px] bg-white/85 [animation-delay:120ms]" />
              <span className="h-2 w-[3px] animate-pulse rounded-[2px] bg-white/85 [animation-delay:240ms]" />
            </span>
            <span className="tabular-nums">{clock(at)}</span>
          </>
        ) : (
          <>
            <Play size={14} className="translate-x-[1px]" />
            {children ?? label}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Pause' : label}
      className={cn(
        'lift-press inline-flex shrink-0 items-center justify-center bg-surface-2 text-gold outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-gold',
        size === 'sm' ? 'rounded-[10px]' : 'rounded',
        SIZES[size],
        className
      )}
    >
      {playing ? (
        <Pause size={icon} />
      ) : size === 'sm' ? (
        <Play size={icon} className="translate-x-[1px]" />
      ) : (
        <Volume2 size={icon} />
      )}
    </button>
  );
}

/** Back-compat alias: the old name, the new compact player. */
export function AudioFromPath({
  bucket,
  path,
  className,
}: {
  bucket: BucketName;
  path: string;
  className?: string;
}) {
  return <PlayButton bucket={bucket} path={path} className={className} />;
}

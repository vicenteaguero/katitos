import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useSignedUrl, type BucketName } from '@kernel/storage';
import { cn } from '@kernel/lib';
import { claimAudio, stopSharedAudio } from './shared-audio';

export function PlayButton({
  bucket,
  path,
  url: urlProp,
  size = 'md',
  autoPlayKey,
  className,
  label = 'Play',
}: {
  bucket?: BucketName;
  path?: string | null;
  url?: string | null;
  size?: 'sm' | 'md';
  /**
   * Change this to make the clip play by itself - used when a card flips to
   * its answer. Never fires on first mount, so nothing blares unbidden.
   */
  autoPlayKey?: string | number;
  className?: string;
  label?: string;
}) {
  const selfSigned = useSignedUrl(
    bucket as BucketName,
    !urlProp && bucket && path ? path : undefined
  );
  const url = urlProp ?? selfSigned.data ?? null;
  const [playing, setPlaying] = useState(false);
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
  const px = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Pause' : label}
      className={cn(
        'lift-press inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-gold transition hover:brightness-110',
        px,
        className
      )}
    >
      {playing ? (
        <Pause size={size === 'sm' ? 14 : 16} />
      ) : (
        <Play size={size === 'sm' ? 14 : 16} className="translate-x-[1px]" />
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

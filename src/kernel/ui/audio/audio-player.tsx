import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useSignedUrl, type BucketName } from '@kernel/storage';
import { cn } from '@kernel/lib';

/**
 * ONE audio element for the whole app.
 *
 * A study session mounts thirty cards; thirty native `<audio controls>` meant
 * thirty media elements, thirty preloads and a screen of chrome nobody asked
 * for. There is only ever one sound playing, so there is only ever one player.
 */
let shared: HTMLAudioElement | null = null;
/** Tells the currently-playing button to un-press itself. */
let releaseCurrent: (() => void) | null = null;

function sharedAudio(): HTMLAudioElement {
  if (!shared) {
    shared = new Audio();
    shared.preload = 'none';
  }
  return shared;
}

/** Stop whatever is playing. Used when a screen unmounts mid-clip. */
export function stopSharedAudio(): void {
  shared?.pause();
  releaseCurrent?.();
  releaseCurrent = null;
}

/**
 * Play a clip from a private-bucket path, or from a URL you already have.
 *
 * Pass `url` when the screen batch-signed its clips (one request for the whole
 * list); pass `path` for a lone player and it signs its own.
 */
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
   * Change this to make the clip play by itself — used when a card flips to
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

  useEffect(
    () => () => {
      if (playing) stopSharedAudio();
    },
    [playing]
  );

  const toggle = () => {
    if (!url) return;
    const el = sharedAudio();
    if (playing) {
      el.pause();
      setPlaying(false);
      releaseCurrent = null;
      return;
    }
    releaseCurrent?.();
    releaseCurrent = () => setPlaying(false);
    el.src = url;
    el.onended = () => {
      setPlaying(false);
      releaseCurrent = null;
    };
    void el.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  };

  useEffect(() => {
    if (autoPlayKey === undefined) return;
    if (firstAutoPlay.current) {
      firstAutoPlay.current = false;
      return;
    }
    if (url) toggle();
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

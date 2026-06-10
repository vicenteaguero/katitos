import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';

/** Lazy signed-url image for an album sticker (cloned from georgia-photo). */
export function AlbumStickerImage({
  path,
  className,
  alt = '',
}: {
  path: string;
  className?: string;
  alt?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(BUCKETS.album, path);
  if (isLoading || !url) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface-2',
          className
        )}
      >
        {isLoading && <Spinner />}
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}

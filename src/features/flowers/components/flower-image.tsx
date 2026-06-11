import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';

export function FlowerImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt?: string;
  className?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(BUCKETS.flowers, path);
  if (isLoading || !url) {
    return (
      <div
        className={cn(
          'velvet relative flex items-center justify-center overflow-hidden',
          className
        )}
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <span
            className="gilt-text candle-flicker text-3xl"
            aria-hidden="true"
          >
            ❀
          </span>
        )}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt ?? 'bouquet'}
      className={cn('candle-flicker', className)}
    />
  );
}

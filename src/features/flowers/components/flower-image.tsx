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
          'flex items-center justify-center bg-surface-2',
          className
        )}
      >
        {isLoading && <Spinner />}
      </div>
    );
  }
  return <img src={url} alt={alt ?? 'bouquet'} className={className} />;
}

import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';

export function GeorgiaPhoto({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(BUCKETS.georgiaAlbum, path);
  if (isLoading || !url) {
    return (
      <div
        className={cn('flex items-center justify-center bg-lapis', className)}
      >
        {isLoading && <Spinner />}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={cn('rounded-none object-cover', className)}
    />
  );
}

import { useSignedUrl, type BucketName } from '@kernel/storage';
import { Spinner } from '../spinner';

/** Plays an audio clip stored at a private-bucket path. */
export function AudioFromPath({
  bucket,
  path,
  className,
}: {
  bucket: BucketName;
  path: string;
  className?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(bucket, path);
  if (isLoading) return <Spinner className="h-4 w-4" />;
  if (!url) return null;
  return <audio src={url} controls className={className ?? 'w-full'} />;
}

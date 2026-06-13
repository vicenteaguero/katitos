import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { cn } from '@kernel/lib';

/** Signed-url image against the quiz-media bucket (reused by Know-Me). */
export function KnowMeImage({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(BUCKETS.quizMedia, path);
  if (!url) return <div className={cn('bg-surface-2 rounded-lg', className)} />;
  return (
    <img
      src={url}
      alt=""
      decoding="async"
      loading="lazy"
      className={className}
    />
  );
}

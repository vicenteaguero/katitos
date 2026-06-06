import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { cn } from '@kernel/lib';

export function QuizImage({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(BUCKETS.quizMedia, path);
  if (!url) return <div className={cn('bg-surface-2', className)} />;
  return <img src={url} alt="" className={className} />;
}

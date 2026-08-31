import { Skeleton } from './skeleton';
import { cn } from '../lib/cn';

/**
 * A list that is on its way: a few rows the height of the real ones.
 *
 * The screens that showed a spinner in 128px of padding reflowed the moment
 * the data arrived; this holds the shape so nothing jumps.
 */
export function ListSkeleton({
  rows = 4,
  header = true,
  className,
}: {
  rows?: number;
  header?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true">
      {header && <Skeleton className="h-7 w-2/3" rounded="md" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" rounded="lg" />
      ))}
    </div>
  );
}

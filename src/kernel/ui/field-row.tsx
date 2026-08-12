import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Two (or three) fields side by side, without them ever touching.
 *
 * This exists because the same bug kept coming back: a `grid grid-cols-2` of
 * `<Field>`s looks fine until one of them holds an `<input type="date">` or a
 * `<select>`, which carry an intrinsic minimum width. Grid and flex children
 * default to `min-width: auto`, so they refuse to shrink below that, overflow
 * their track, and collide.
 *
 * `min-w-0` on every child is the fix, and putting it in one place means it
 * can't be forgotten the next time someone adds a row of inputs.
 */
export function FieldRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-end gap-3 [&>*]:min-w-0 [&>*]:flex-1',
        className
      )}
    >
      {children}
    </div>
  );
}

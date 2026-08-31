import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** A key, drawn as a key: <Kbd>⌘</Kbd><Kbd>↵</Kbd>. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded bg-fg/10 px-1.5 font-sans text-[0.68rem] font-semibold text-muted',
        className
      )}
      {...props}
    />
  );
}

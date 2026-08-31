import type { ReactNode } from 'react';
import { cn } from '@kernel/lib';
import { Kicker } from '@kernel/ui';

/**
 * The shell of one block in the builder: its kind in the corner, its
 * controls on the right, its body underneath. Every kind of block sits in
 * this, so they line up.
 */
export function BlockCard({
  kind,
  missing = false,
  toolbar,
  children,
  className,
}: {
  kind: string;
  /** Still untranslated in the language being edited. */
  missing?: boolean;
  toolbar?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-1.5 rounded-lg bg-surface px-3 py-2', className)}
    >
      <div className="flex items-center gap-2">
        <Kicker className="flex-1">
          {kind}
          {missing && (
            <span
              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-copper align-middle"
              title="Not in this language yet"
            />
          )}
        </Kicker>
        {toolbar}
      </div>
      {children}
    </div>
  );
}

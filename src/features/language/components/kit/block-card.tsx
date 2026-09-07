import type { ReactNode } from 'react';
import { cn } from '@kernel/lib';
import { Card } from '@kernel/ui';

/**
 * The shell of one block in the builder: its kind in a small pill in the
 * corner, its tools on the right (shown on hover under a mouse), its body
 * underneath. Every kind of block sits in this, so they line up.
 */
export function BlockCard({
  kind,
  missing = false,
  tone = 'plain',
  toolbar,
  children,
  className,
}: {
  kind: string;
  /** Still untranslated in the language being edited. */
  missing?: boolean;
  /** A question's card reads wine. */
  tone?: 'plain' | 'question';
  toolbar?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      tone="hairline"
      className={cn('group space-y-2 px-4 py-3.5', className)}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[7px] px-2 py-0.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.08em]',
            tone === 'question'
              ? 'bg-accent/35 text-[#e0919b]'
              : 'bg-surface-2 text-gold'
          )}
        >
          {kind}
          {missing && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-copper"
              title="Not in this language yet"
            />
          )}
        </span>
        <span className="flex-1" />
        {toolbar}
      </div>
      {children}
    </Card>
  );
}

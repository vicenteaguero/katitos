import type { ReactNode } from 'react';
import { cn } from '@kernel/lib';

/**
 * A section header for an actionable list: a quiet gilt label on the left,
 * an optional action (usually a Button) on the right, baseline-aligned on one
 * tidy row. Use this instead of the ornamental flanking-rule `.eyebrow` when
 * there's an action beside the label — the two rules fight a right-aligned
 * button and read as broken.
 */
export function SectionHeader({
  label,
  hint,
  action,
  className,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('mb-3 flex items-center justify-between gap-3', className)}
    >
      <div className="min-w-0">
        <h2 className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gold/85">
          {label}
        </h2>
        {hint && <p className="mt-1 font-sans text-xs text-muted">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

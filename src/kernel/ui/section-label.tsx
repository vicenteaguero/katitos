import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The one label a section gets: "To mark", "Unit 1, Getting around",
 * "Words, 4". Left-aligned, small, gold; a muted note or a quiet action on
 * the right. Replaces the centred `.eyebrow` with its gilt rules, which put
 * a playbill heading over every list.
 */
export function SectionLabel({
  children,
  note,
  action,
  as: Tag = 'h2',
  className,
}: {
  children: ReactNode;
  /** "2 waiting", "2 of 3 done". */
  note?: ReactNode;
  /** A link or quiet button instead of the note. */
  action?: ReactNode;
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-1.5 flex items-baseline justify-between gap-3',
        className
      )}
    >
      <Tag className="min-w-0 truncate font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
        {children}
      </Tag>
      {action ??
        (note && (
          <span className="shrink-0 font-sans text-[11px] font-semibold text-muted">
            {note}
          </span>
        ))}
    </div>
  );
}

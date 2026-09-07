import type { ReactNode } from 'react';
import { cn } from '@kernel/lib';
import { Card } from '@kernel/ui';

export type Verdict = 'right' | 'wrong' | null;

/**
 * The card one question sits in, wherever it is: in a lesson, on the
 * teacher's marking screen, on the stage in class.
 *
 * A number, the kind of question, and on the right what came of it. The
 * body is whatever the caller renders; the footer is the Check button or
 * the teacher's tools.
 */
export function ExerciseCard({
  index,
  kind,
  verdict,
  aside,
  tone = 'plain',
  children,
  footer,
  className,
}: {
  /** 1-based. */
  index: number;
  /** "Choose one", "Type it". */
  kind: string;
  /** Once marked: a tick or a cross on the right. */
  verdict?: Verdict;
  /** The right slot when there is no verdict yet: points, "auto". */
  aside?: ReactNode;
  /** Wrong tints the edge red; focused lights it gold (a desk's marking row). */
  tone?: 'plain' | 'wrong' | 'focused';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      tone="hairline"
      className={cn(
        'space-y-2.5',
        verdict === 'right' && 'border-success/35',
        tone === 'wrong' && 'border-danger/35',
        tone === 'focused' &&
          'border-gold/40 shadow-[0_0_0_3px_rgba(228,195,106,0.07)]',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[7px] bg-surface-2 px-1.5 font-sans text-[11px] font-bold text-gold">
          {index}
        </span>
        <span className="min-w-0 flex-1 truncate font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          {kind}
        </span>
        {verdict === 'right' ? (
          <span className="shrink-0 font-sans text-[11.5px] font-bold text-[#a9b37e]">
            ✓ Right
          </span>
        ) : verdict === 'wrong' ? (
          <span className="shrink-0 font-sans text-[11.5px] font-bold text-[#e0919b]">
            ✗ Wrong
          </span>
        ) : (
          aside && (
            <span className="shrink-0 font-sans text-[11.5px] font-semibold text-muted">
              {aside}
            </span>
          )
        )}
      </div>
      {children}
      {footer}
    </Card>
  );
}

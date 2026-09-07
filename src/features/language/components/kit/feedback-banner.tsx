import type { ReactNode } from 'react';
import { Check, RotateCcw, Send } from 'lucide-react';
import { cn } from '@kernel/lib';

export type FeedbackTone = 'marked' | 'returned' | 'submitted' | 'done';

const looks: Record<FeedbackTone, { icon: ReactNode; className: string }> = {
  marked: {
    icon: <Check className="h-4 w-4 text-[#a9b37e]" />,
    className: 'border-success/40 bg-success/[0.12]',
  },
  done: {
    icon: <Check className="h-4 w-4 text-gold" />,
    className: 'border-gold/35 bg-gold/[0.07]',
  },
  returned: {
    icon: <RotateCcw className="h-4 w-4 text-gold" />,
    className: 'border-gold/35 bg-gold/[0.07]',
  },
  submitted: {
    icon: <Send className="h-4 w-4 text-muted" />,
    className: 'border-fg/[0.08] bg-surface-2',
  },
};

/**
 * One line about where the work stands: marked, sent back, handed in, done.
 * An action on the right when there is something to do about it.
 */
export function FeedbackBanner({
  tone,
  children,
  action,
  className,
}: {
  tone: FeedbackTone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const look = looks[tone];
  return (
    <div
      className={cn(
        'flex min-h-[48px] items-center gap-2.5 rounded border px-3.5 py-2',
        look.className,
        className
      )}
    >
      <span className="shrink-0">{look.icon}</span>
      <span className="min-w-0 flex-1 font-sans text-[13px] font-semibold text-fg">
        {children}
      </span>
      {action}
    </div>
  );
}

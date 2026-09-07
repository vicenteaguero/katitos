import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type OptionState = 'idle' | 'picked' | 'right' | 'wrong' | 'revealed';

/**
 * An answer you tap.
 *
 * Quiet until picked; picked is a gilt edge, not a wine fill, so the wine
 * stays for the one action on the screen. Right is his green, wrong the
 * error red, and `revealed` is the teacher showing the answer in class.
 */
export function OptionButton({
  state = 'idle',
  disabled,
  onClick,
  children,
  className,
}: {
  state?: OptionState;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={state === 'picked'}
      className={cn(
        'lift-press flex min-h-[52px] w-full items-center gap-2 rounded border px-4 py-2.5 text-left font-sans text-[15px] outline-none transition focus-visible:ring-2 focus-visible:ring-gold',
        state === 'idle' &&
          'border-fg/[0.06] bg-surface-2 text-fg hover:brightness-110',
        state === 'picked' && 'border-gold/35 bg-gold/[0.08] text-fg',
        state === 'right' && 'border-success/50 bg-success/[0.16] text-fg',
        state === 'wrong' && 'border-danger/40 bg-danger/[0.14] text-fg',
        state === 'revealed' && 'border-gold/35 bg-gold/[0.08] text-gold',
        className
      )}
    >
      {state === 'right' && <Check className="h-4 w-4 shrink-0 text-success" />}
      {state === 'wrong' && <X className="h-4 w-4 shrink-0 text-danger" />}
      {state === 'revealed' && <Check className="h-4 w-4 shrink-0 text-gold" />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type OptionState = 'idle' | 'picked' | 'right' | 'wrong';

/**
 * An answer you tap.
 *
 * Four screens drew this one themselves - a choice in a lesson, a card in
 * practice, a Know-Me option, a quiz option - each with its own four colours
 * for the same four states. One shape, one set of colours: quiet until
 * picked, wine when picked, his green when right, error red when wrong.
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
        'lift-press flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-sans text-sm transition',
        state === 'right' && 'bg-success/20 text-fg',
        state === 'wrong' && 'bg-danger/20 text-fg',
        state === 'picked' && 'bg-accent text-accent-fg',
        state === 'idle' && 'bg-surface-2 text-fg hover:brightness-110',
        className
      )}
    >
      {state === 'right' && <Check className="h-4 w-4 shrink-0 text-success" />}
      {state === 'wrong' && <X className="h-4 w-4 shrink-0 text-danger" />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

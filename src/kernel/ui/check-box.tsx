import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * A small, slightly-rounded check toggle — an empty ringed square that fills
 * wine with a tick when on. Replaces bare ⬜/✅ emoji (which can't take rounded
 * corners) so the box reads as a real, gently-cornered checkmark.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn('lift-press shrink-0 outline-none', className)}
    >
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150',
          checked
            ? 'bg-accent text-accent-fg'
            : 'bg-surface-2 ring-1 ring-border'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * A small, slightly-rounded check toggle - an empty ringed square that fills
 * wine with a tick when on. Replaces bare ⬜/✅ emoji (which can't take rounded
 * corners) so the box reads as a real, gently-cornered checkmark.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  size = 'sm',
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  /** 20px beside text, 28px as a row's leading control. */
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'lift-press shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold',
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center transition-colors duration-150',
          size === 'md' ? 'h-7 w-7 rounded-lg' : 'h-5 w-5 rounded-md',
          checked
            ? 'bg-accent text-accent-fg'
            : 'bg-surface-2 ring-1 ring-border/50'
        )}
      >
        {checked && (
          <Check
            className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'}
            strokeWidth={3}
          />
        )}
      </span>
    </button>
  );
}

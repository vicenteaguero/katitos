import { cn } from '@kernel/lib';

/**
 * An iPhone-style toggle. Wine when on, recessed surface when off, with a white
 * knob that slides. Use for binary settings (e.g. notifications on/off).
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible label (there's no visible text inside the switch). */
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-surface'
      )}
      style={
        checked
          ? undefined
          : { boxShadow: 'inset 0 0 0 1px rgba(228,195,106,0.25)' }
      }
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

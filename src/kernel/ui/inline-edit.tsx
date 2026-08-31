import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

/**
 * Text you click to change, in place.
 *
 * A unit's title, a lesson's name: click it, type, Enter or click away to
 * keep it, Escape to give up. Nothing is saved unless it changed.
 */
export function InlineEdit({
  value,
  onSave,
  placeholder = 'Untitled',
  className,
  inputClassName,
  disabled = false,
  label,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** What this is, for a screen reader. */
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const keep = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
  };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') keep();
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={keep}
        onKeyDown={keys}
        className={cn(
          'w-full min-w-0 rounded bg-black/30 px-2 py-0.5 font-[inherit] text-[inherit] text-fg outline-none ring-1 ring-gold',
          inputClassName
        )}
      />
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setEditing(true)}
      aria-label={label ? `${label}: ${value || placeholder}` : undefined}
      title="Click to rename"
      className={cn(
        'min-w-0 max-w-full truncate rounded px-2 py-0.5 text-left hover:bg-fg/5',
        !value && 'text-muted',
        className
      )}
    >
      {value || placeholder}
    </button>
  );
}

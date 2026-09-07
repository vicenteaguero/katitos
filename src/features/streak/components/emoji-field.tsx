import { useRef } from 'react';
import { cn } from '@kernel/lib';

/** A few to tap, for the ones people actually promise each other. */
const QUICK = ['💧', '🏃', '📖', '🧘', '💪', '🥗', '😴', '✍️'];

/** The last whole emoji in a string - flags and families are several code points. */
function lastGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const parts = [
      ...new Seg(undefined, { granularity: 'grapheme' }).segment(trimmed),
    ];
    return parts[parts.length - 1]?.segment ?? '';
  }
  return [...trimmed].slice(-1).join('');
}

/**
 * Any emoji, not the eight I happened to think of.
 *
 * The big tile IS the input, so tapping it opens the keyboard and the emoji
 * key is one press away. The row underneath is only a shortcut.
 */
export function EmojiField({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2.5">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(lastGrapheme(e.target.value) || value)}
        aria-label="Its face"
        inputMode="text"
        autoComplete="off"
        className="h-14 w-14 shrink-0 rounded-lg bg-[rgba(0,0,0,0.28)] text-center text-[28px] leading-none outline-none focus:ring-2 focus:ring-gold/40"
        style={{ border: '1px solid rgba(228,195,106,0.35)' }}
      />
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {QUICK.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            aria-label={e}
            aria-pressed={value === e}
            className={cn(
              'lift-press grid h-[26px] place-items-center rounded text-[16px]',
              value === e ? 'bg-accent' : 'bg-surface-2'
            )}
          >
            <span aria-hidden="true">{e}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownUp,
  CheckSquare,
  Ear,
  CircleDot,
  Headphones,
  Link2,
  Mic,
  PenLine,
  Sparkles,
  TextCursorInput,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import { useRovingFocus } from '@kernel/hooks';
import type { ExerciseKind } from '../../types';

/** The eight kinds, plus a shape of Choose that is its own question. */
export type GalleryValue = ExerciseKind | 'stress' | 'pair';

const KINDS: {
  value: GalleryValue;
  /** The word on the tile. */
  short: string;
  /** The full name, for a screen reader and the tooltip. */
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'choice',
    short: 'Choose',
    label: 'Choose',
    hint: 'One right answer',
    icon: CircleDot,
  },
  {
    value: 'multi',
    short: 'Several',
    label: 'Choose several',
    hint: 'All that apply',
    icon: CheckSquare,
  },
  {
    value: 'type',
    short: 'Type',
    label: 'Type it',
    hint: 'He writes it out',
    icon: PenLine,
  },
  {
    value: 'complete',
    short: 'Gaps',
    label: 'Fill the gaps',
    hint: 'A sentence with holes',
    icon: TextCursorInput,
  },
  {
    value: 'order',
    short: 'Order',
    label: 'Put in order',
    hint: 'Words to arrange',
    icon: ArrowDownUp,
  },
  {
    value: 'match',
    short: 'Match',
    label: 'Match',
    hint: 'Pairs to join',
    icon: Link2,
  },
  {
    value: 'listen',
    short: 'Listen',
    label: 'Listen',
    hint: 'Your voice, his ear',
    icon: Headphones,
  },
  {
    value: 'speak',
    short: 'Say it',
    label: 'Say it',
    hint: 'Out loud',
    icon: Mic,
  },
  {
    value: 'stress',
    short: 'Stress',
    label: "Where's the stress?",
    hint: 'One word, every vowel',
    icon: Sparkles,
  },
  {
    value: 'pair',
    short: 'Heard?',
    label: 'Which did you hear?',
    hint: 'Two lookalikes, your voice',
    icon: Ear,
  },
];

/**
 * The ten shapes of a question, as a fixed grid of tiles: an icon over a
 * word each, five to a row on a desk and three on a phone, so nothing wraps
 * into a ragged row. One tab stop, arrows to move, `aria-checked` on the
 * one that is on.
 */
export function ExerciseKindGallery({
  value,
  onChange,
  className,
}: {
  value: GalleryValue;
  onChange: (kind: GalleryValue) => void;
  className?: string;
}) {
  const roving = useRovingFocus<HTMLButtonElement>(KINDS.length);
  return (
    <div
      role="radiogroup"
      aria-label="Kind of question"
      className={cn('grid grid-cols-3 gap-1.5 md:grid-cols-5', className)}
      {...roving.containerProps}
    >
      {KINDS.map((k, i) => {
        const on = k.value === value;
        return (
          <button
            key={k.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={k.label}
            title={`${k.label}: ${k.hint}`}
            onClick={() => onChange(k.value)}
            className={cn(
              'lift-press flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[11px] border px-1 py-2 font-sans text-[10.5px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold',
              on
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-fg/[0.07] bg-surface text-muted hover:text-fg'
            )}
            {...roving.itemProps(i)}
          >
            <k.icon className="h-[15px] w-[15px]" />
            {k.short}
          </button>
        );
      })}
    </div>
  );
}

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
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'choice',
    label: 'Choose',
    hint: 'One right answer',
    icon: CircleDot,
  },
  {
    value: 'multi',
    label: 'Choose several',
    hint: 'All that apply',
    icon: CheckSquare,
  },
  { value: 'type', label: 'Type it', hint: 'He writes it out', icon: PenLine },
  {
    value: 'complete',
    label: 'Fill the gaps',
    hint: 'A sentence with holes',
    icon: TextCursorInput,
  },
  {
    value: 'order',
    label: 'Put in order',
    hint: 'Words to arrange',
    icon: ArrowDownUp,
  },
  { value: 'match', label: 'Match', hint: 'Pairs to join', icon: Link2 },
  {
    value: 'listen',
    label: 'Listen',
    hint: 'Your voice, his ear',
    icon: Headphones,
  },
  { value: 'speak', label: 'Say it', hint: 'Out loud', icon: Mic },
  {
    value: 'stress',
    label: "Where's the stress?",
    hint: 'One word, every vowel',
    icon: Sparkles,
  },
  {
    value: 'pair',
    label: 'Which did you hear?',
    hint: 'Two lookalikes, your voice',
    icon: Ear,
  },
];

/**
 * The eight kinds of question, as a gallery - a picture and a line each,
 * instead of eight words split across two rows of a pill.
 *
 * An editorial wrap, not a grid of equal squares; one tab stop, arrows to
 * move, `aria-checked` on the one that is on.
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
      className={cn('flex flex-wrap gap-1.5', className)}
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
            onClick={() => onChange(k.value)}
            className={cn(
              'lift-press flex min-w-[8.5rem] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition',
              on
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-fg hover:brightness-110'
            )}
            {...roving.itemProps(i)}
          >
            <k.icon
              className={cn(
                'h-4 w-4 shrink-0',
                on ? 'text-accent-fg' : 'text-gold'
              )}
            />
            <span className="min-w-0">
              <span className="block font-sans text-sm font-semibold">
                {k.label}
              </span>
              <span
                className={cn(
                  'block text-[0.68rem]',
                  on ? 'text-accent-fg/80' : 'text-muted'
                )}
              >
                {k.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

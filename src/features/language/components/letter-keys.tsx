import { Delete } from 'lucide-react';
import { useRovingFocus } from '@kernel/hooks';
import type { Lang } from '../types';

/**
 * The letters your phone's keyboard doesn't have, on screen.
 *
 * Typing an answer is far better practice than recognising one - but he is
 * learning Russian on a Latin keyboard, and she is learning Spanish on a
 * Cyrillic one. Making either of them install a second layout to answer one
 * card is exactly the kind of friction that ends a habit. So the alphabet comes
 * to whoever needs it, and which one appears follows the language of the answer.
 *
 * All thirty-three letters - ё included, it was missing - and a space bar,
 * because "не хочу" is two words and the marker is right to insist on that.
 * One tab stop for the whole board; the arrow keys walk the keys.
 */
const ROWS: Partial<Record<Lang, readonly string[]>> = {
  ru: ['йцукенгшщзхъё', 'фывапролджэ', 'ячсмитьбю'],
  // Only what a Latin keyboard makes hard. A full Spanish layout would just be
  // the keyboard she already has, with worse spacing.
  es: ['áéíóú', 'üñ¿¡'],
};

const KEY =
  'lift-press h-9 min-w-0 flex-1 rounded-md bg-surface-2 font-sans text-sm text-fg active:bg-accent active:text-accent-fg';

export function LetterKeys({
  lang,
  onKey,
  onBackspace,
}: {
  /** The language the answer is written in. */
  lang: Lang;
  onKey: (ch: string) => void;
  onBackspace: () => void;
}) {
  const rows = ROWS[lang] ?? [];
  // Every key in reading order, then space and backspace - one index each.
  const letters = rows.flatMap((row) => [...row]);
  const roving = useRovingFocus<HTMLButtonElement>(letters.length + 2);
  if (!rows.length) return null;

  let index = 0;
  return (
    <div
      role="group"
      aria-label="Letters"
      className="space-y-1"
      {...roving.containerProps}
    >
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-[3px]">
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onKey(ch)}
              className={KEY}
              {...roving.itemProps(index++)}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-[3px]">
        <button
          type="button"
          onClick={() => onKey(' ')}
          aria-label="Space"
          className={`${KEY} flex-[4] text-muted`}
          {...roving.itemProps(index++)}
        >
          ␣
        </button>
        <button
          type="button"
          onClick={onBackspace}
          aria-label="Backspace"
          className={`${KEY} flex items-center justify-center text-muted`}
          {...roving.itemProps(index++)}
        >
          <Delete className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

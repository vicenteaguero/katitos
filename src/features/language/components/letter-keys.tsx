import { Delete } from 'lucide-react';
import type { Lang } from '../types';

/**
 * The letters your phone's keyboard doesn't have, on screen.
 *
 * Typing an answer is far better practice than recognising one — but he is
 * learning Russian on a Latin keyboard, and she is learning Spanish on a
 * Cyrillic one. Making either of them install a second layout to answer one
 * card is exactly the kind of friction that ends a habit. So the alphabet comes
 * to whoever needs it, and which one appears follows the language of the answer.
 */
const ROWS: Partial<Record<Lang, readonly string[]>> = {
  ru: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
  // Only what a Latin keyboard makes hard. A full Spanish layout would just be
  // the keyboard she already has, with worse spacing.
  es: ['áéíóú', 'üñ¿¡'],
};

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
  const rows = ROWS[lang];
  if (!rows) return null;
  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-[3px]">
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onKey(ch)}
              className="lift-press h-9 min-w-0 flex-1 rounded-md bg-surface-2 font-sans text-sm text-fg active:bg-accent active:text-accent-fg"
            >
              {ch}
            </button>
          ))}
          {i === rows.length - 1 && (
            <button
              type="button"
              onClick={onBackspace}
              aria-label="Backspace"
              className="lift-press flex h-9 min-w-[2.5rem] flex-1 items-center justify-center rounded-md bg-surface-2 text-muted active:bg-accent active:text-accent-fg"
            >
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

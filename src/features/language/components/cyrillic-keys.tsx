import { Delete } from 'lucide-react';

/**
 * A Cyrillic keyboard, on screen.
 *
 * Typing an answer is far better practice than recognising one — but he is
 * learning on a phone whose keyboard is Latin, and making him install a Russian
 * layout to answer one card is exactly the kind of friction that ends a habit.
 * So the alphabet comes to him.
 */
const ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'] as const;

export function CyrillicKeys({
  onKey,
  onBackspace,
}: {
  onKey: (ch: string) => void;
  onBackspace: () => void;
}) {
  return (
    <div className="space-y-1">
      {ROWS.map((row, i) => (
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
          {i === ROWS.length - 1 && (
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
      <div className="flex justify-center gap-[3px]">
        <button
          type="button"
          onClick={() => onKey('ё')}
          className="lift-press h-9 w-10 rounded-md bg-surface-2 font-sans text-sm text-fg active:bg-accent active:text-accent-fg"
        >
          ё
        </button>
        <button
          type="button"
          onClick={() => onKey(' ')}
          className="lift-press h-9 flex-1 rounded-md bg-surface-2 font-sans text-xs uppercase tracking-[0.2em] text-muted active:bg-accent active:text-accent-fg"
        >
          space
        </button>
      </div>
    </div>
  );
}

import { cn } from '@kernel/lib';
import type { KnowMeOption } from '../types';
import { KnowMeImage } from './know-me-image';

/**
 * 2×2 grid of the four options. Single-select; locks once committed. Each cell
 * shows an image (if the option has one) plus its label.
 */
export function OptionGrid({
  options,
  selected,
  onSelect,
  locked = false,
}: {
  options: KnowMeOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  locked?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={locked}
          onClick={() => onSelect(o.id)}
          className={cn(
            'flex flex-col gap-2 rounded-lg border p-3 text-left transition active:scale-95 disabled:active:scale-100',
            selected === o.id
              ? 'border-accent bg-accent/10'
              : 'border-border bg-surface-2'
          )}
        >
          {o.imagePath && (
            <KnowMeImage
              path={o.imagePath}
              className="h-24 w-full rounded object-cover"
            />
          )}
          <span className="text-sm font-medium">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

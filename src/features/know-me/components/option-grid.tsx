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
    <div className="grid grid-cols-2 gap-3.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={locked}
          onClick={() => onSelect(o.id)}
          className={cn(
            'lift-press flex flex-col gap-3 rounded-none p-4 text-left shadow-catch outline-none transition focus-visible:shadow-candle disabled:pointer-events-none',
            selected === o.id
              ? 'gilt-hairline bg-purple/25 text-fg shadow-candle'
              : 'gilt-hairline-flat velvet-2 text-muted hover:text-fg'
          )}
        >
          {o.imagePath && (
            <KnowMeImage
              path={o.imagePath}
              className="h-24 w-full rounded-none object-cover"
            />
          )}
          <span className="font-sans text-sm font-semibold tracking-[0.01em]">
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

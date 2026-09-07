import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Move up - move down - delete, for a row in an ordered list.
 *
 * The lesson builder drew this trio three times over. The targets are a real
 * 32px in a rail under a mouse and 44px on a row under a thumb, and a
 * disabled end is dimmed, not hidden, so the row keeps its shape.
 */
/** The look of one toolbar control - exported so a sibling control matches. */
export const ROW_TOOL =
  'flex h-8 w-8 items-center justify-center rounded-full text-muted outline-none transition hover:bg-fg/5 hover:text-fg focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-30 disabled:hover:bg-transparent';

/** The same control at thumb size, for a row on a phone. */
export const ROW_TOOL_TOUCH =
  'flex h-11 w-11 items-center justify-center rounded text-muted outline-none transition hover:bg-fg/5 hover:text-fg focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-30 disabled:hover:bg-transparent';

export function RowToolbar({
  first = false,
  last = false,
  onMove,
  onDelete,
  deleteLabel = 'Delete',
  size = 'sm',
  reveal = false,
  children,
  className,
}: {
  first?: boolean;
  last?: boolean;
  /** Up/down. Leave it out when a drag handle does the moving. */
  onMove?: (by: -1 | 1) => void;
  onDelete: () => void;
  deleteLabel?: string;
  /** 32px under a mouse, 44px under a thumb. */
  size?: 'sm' | 'touch';
  /** Under a mouse, shown only while the row (a `group`) is hovered. */
  reveal?: boolean;
  /** One more control, before the bin - duplicate, say. */
  children?: ReactNode;
  className?: string;
}) {
  const btn = size === 'touch' ? ROW_TOOL_TOUCH : ROW_TOOL;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        reveal &&
          'transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100',
        className
      )}
    >
      {onMove && (
        <>
          <button
            type="button"
            aria-label="Move up"
            disabled={first}
            onClick={() => onMove(-1)}
            className={btn}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
            className={btn}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </>
      )}
      {children}
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDelete}
        className={btn}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

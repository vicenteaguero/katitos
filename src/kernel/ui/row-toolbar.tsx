import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Move up - move down - delete, for a row in an ordered list.
 *
 * The lesson builder drew this trio three times over. The targets are a real
 * 32px now - a 14px glyph is a hard thing to hit on a phone and a dead thing
 * under a mouse - and a disabled end is dimmed, not hidden, so the row keeps
 * its shape.
 */
/** The look of one toolbar control - exported so a sibling control matches. */
export const ROW_TOOL =
  'flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-fg/5 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent';

export function RowToolbar({
  first = false,
  last = false,
  onMove,
  onDelete,
  deleteLabel = 'Delete',
  children,
  className,
}: {
  first?: boolean;
  last?: boolean;
  /** Up/down. Leave it out when a drag handle does the moving. */
  onMove?: (by: -1 | 1) => void;
  onDelete: () => void;
  deleteLabel?: string;
  /** One more control, before the bin - duplicate, say. */
  children?: ReactNode;
  className?: string;
}) {
  const btn = ROW_TOOL;
  return (
    <div className={cn('flex shrink-0 items-center', className)}>
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

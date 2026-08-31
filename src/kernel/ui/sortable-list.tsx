import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../lib/cn';
import { dropIndexAt, moveItem } from './sortable';

export interface DragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  'aria-label': string;
  className: string;
  style: { touchAction: 'none' };
}

/**
 * A list you can put in order — by dragging its handle, or with the arrow
 * keys on it.
 *
 * Nothing moves until the drop; the list is told the new order once, through
 * `onReorder`, so the caller saves exactly one reorder. Touch and mouse alike
 * (pointer events, and `touch-action: none` on the handle only, so the page
 * still scrolls from anywhere else). Up/Down on the handle moves the row one
 * step — the same reorder, no mouse.
 */
export function SortableList<T>({
  items,
  keyOf,
  onReorder,
  children,
  disabled = false,
  className,
  rowClassName,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  onReorder: (next: T[]) => void;
  /** Render one row; spread `handle` onto the element that starts a drag. */
  children: (item: T, index: number, handle: DragHandleProps) => ReactNode;
  disabled?: boolean;
  className?: string;
  rowClassName?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<{
    from: number;
    to: number;
    dy: number;
  } | null>(null);

  // This list's OWN rows: the course page nests lessons inside units, and a
  // descendant query measured both lists at once.
  const rows = () => [
    ...(listRef.current?.querySelectorAll<HTMLElement>(
      ':scope > [data-sortable-row]'
    ) ?? []),
  ];

  const start = (index: number) => (e: ReactPointerEvent<HTMLElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const boxes = rows().map((r) => {
      const b = r.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom };
    });
    let to = index;
    const move = (ev: PointerEvent) => {
      to = dropIndexAt(ev.clientY, boxes);
      setDrag({ from: index, to, dy: ev.clientY - startY });
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      setDrag(null);
      if (to !== index) onReorder(moveItem(items, index, to));
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    setDrag({ from: index, to: index, dy: 0 });
  };

  const keys = (index: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!by) return;
    e.preventDefault();
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    onReorder(moveItem(items, index, to));
    // Keep the keyboard on the row that moved.
    requestAnimationFrame(() => {
      rows()[to]?.querySelector<HTMLElement>('[data-sortable-handle]')?.focus();
    });
  };

  return (
    <ul ref={listRef} className={cn('space-y-2', className)}>
      {items.map((item, i) => {
        const dragging = drag?.from === i;
        // The drop line: shown on the row the pointer would land before.
        const target = drag && drag.to === i && drag.from !== i;
        return (
          <li
            key={keyOf(item)}
            data-sortable-row
            className={cn(
              'relative transition-shadow',
              dragging && 'z-10 opacity-80 shadow-loge',
              target && (drag!.to > drag!.from ? 'drop-after' : 'drop-before'),
              rowClassName
            )}
            style={
              dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined
            }
          >
            {children(item, i, {
              onPointerDown: start(i),
              onKeyDown: keys(i),
              'aria-label': 'Drag to reorder — or use the arrow keys',
              className:
                'flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted hover:text-fg active:cursor-grabbing',
              style: { touchAction: 'none' },
            })}
          </li>
        );
      })}
    </ul>
  );
}

/** The default handle: a grip. Spread the `handle` props onto it. */
export function DragHandle(props: DragHandleProps) {
  return (
    <button type="button" data-sortable-handle {...props}>
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

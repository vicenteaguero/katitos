import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * A screen laid out for a desk - a rail, a canvas, an inspector - that is
 * still one column on a phone.
 *
 * On a phone the rail is not shown at all (the things it lists are reachable
 * as screens of their own - `.desk__rail` is hidden until a laptop, in the
 * stylesheet, so no width ever shows it by accident), the canvas is the
 * page, and the inspector stacks
 * underneath it, exactly as these screens were before there was a desk. A
 * tablet has room for two panes, not three: the canvas takes the width and
 * the inspector is a drawer over it, behind one small button. From a laptop
 * up the inspector is the third column, the rail joins on the left, and the
 * button is gone. The panes are told
 * apart by tone, never by a line - rail on the house ground, canvas on the
 * surface, inspector one tone up.
 *
 * Which panes exist is a matter of which props are given; the grid follows.
 */
export function Desk({
  rail,
  inspector,
  /** The inspector's fate on a phone: under the canvas, or gone. */
  inspectorOnPhone = 'stack',
  /** A reading page rather than a work surface: the canvas keeps a measure. */
  narrow = false,
  children,
  className,
}: {
  rail?: ReactNode;
  inspector?: ReactNode;
  inspectorOnPhone?: 'stack' | 'hidden';
  narrow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const panes = [rail && 'rail', 'canvas', inspector && 'inspector']
    .filter(Boolean)
    .join(' ');
  // The drawer, on a tablet. Nothing reads this on a phone or a laptop.
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn('desk', narrow && 'desk--narrow', className)}
      data-panes={panes}
      data-inspector={open ? 'open' : undefined}
    >
      {rail && <aside className="desk__rail">{rail}</aside>}
      <section className="desk__canvas" data-desk-canvas>
        {narrow ? <div className="desk__page">{children}</div> : children}
      </section>
      {inspector && (
        <>
          <aside
            className={cn(
              'desk__inspector',
              inspectorOnPhone === 'hidden' && 'max-md:hidden'
            )}
          >
            {inspector}
          </aside>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Hide the details' : 'Show the details'}
            onClick={() => setOpen((o) => !o)}
            className="desk__inspector-toggle lift-press"
          >
            <SlidersHorizontal size={18} />
          </button>
        </>
      )}
    </div>
  );
}

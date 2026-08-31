import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * A screen laid out for a desk — a rail, a canvas, an inspector — that is
 * still one column on a phone.
 *
 * On a phone the rail is not shown at all (the things it lists are reachable
 * as screens of their own), the canvas is the page, and the inspector stacks
 * underneath it, exactly as these screens were before there was a desk. From
 * a tablet up the canvas and the inspector sit side by side, each scrolling
 * on its own; from a laptop up the rail joins on the left. The panes are told
 * apart by tone, never by a line — rail on the house ground, canvas on the
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
  return (
    <div
      className={cn('desk', narrow && 'desk--narrow', className)}
      data-panes={panes}
    >
      {rail && <aside className="desk__rail">{rail}</aside>}
      <section className="desk__canvas" data-desk-canvas>
        {narrow ? <div className="desk__page">{children}</div> : children}
      </section>
      {inspector && (
        <aside
          className={cn(
            'desk__inspector',
            inspectorOnPhone === 'hidden' && 'max-md:hidden'
          )}
        >
          {inspector}
        </aside>
      )}
    </div>
  );
}

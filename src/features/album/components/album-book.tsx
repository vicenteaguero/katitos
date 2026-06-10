import { useRef } from 'react';
import { cn } from '@kernel/lib';
import type { Page } from '../lib/progression';
import type { AlbumPageContext } from './album-page';
import { BookSpread } from './book-spread';
import { PageLeaf } from './page-leaf';
import { usePageFlip } from './use-page-flip';

/**
 * Windowed book container. From the flat page list it derives spreads
 * (`[2k, 2k+1]`) and mounts ONLY prev/current/next so off-window signed-url
 * hooks never mount. Hosts the drag page-flip + tap zones.
 */
export function AlbumBook({
  pages,
  spread,
  setSpread,
  ctx,
}: {
  pages: Page[];
  spread: number;
  setSpread: (n: number) => void;
  ctx: AlbumPageContext;
}) {
  const leafRef = useRef<HTMLDivElement | null>(null);
  const maxSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);

  const {
    bind,
    flip,
    canForward,
    canBackward,
    goForward,
    goBackward,
    onTransitionEnd,
  } = usePageFlip({ spread, maxSpread, setSpread, leafRef });

  const spreadPages = (n: number): { left?: Page; right?: Page } => ({
    left: pages[n * 2],
    right: pages[n * 2 + 1],
  });

  const cur = spreadPages(spread);
  const prev = spread > 0 ? spreadPages(spread - 1) : null;
  const next = spread < maxSpread ? spreadPages(spread + 1) : null;

  // During a flip, the destination spread is mounted beneath the leaf.
  const dest =
    flip.dir === 'forward' ? next : flip.dir === 'backward' ? prev : null;

  // Leaf faces: front = the lifting half of the CURRENT spread; back = the
  // arriving half of the DEST spread.
  const leafFront =
    flip.dir === 'forward'
      ? cur.right
      : flip.dir === 'backward'
        ? cur.left
        : undefined;
  const leafBack =
    flip.dir === 'forward'
      ? next?.left
      : flip.dir === 'backward'
        ? prev?.right
        : undefined;

  return (
    <div className="book-stage relative aspect-[3/2] w-full select-none">
      {/* Tap zones (a11y/desktop convenience) */}
      <button
        type="button"
        aria-label="Previous page"
        disabled={!canBackward}
        onClick={goBackward}
        className="absolute bottom-0 left-0 top-0 z-10 w-[12%] disabled:pointer-events-none"
      />
      <button
        type="button"
        aria-label="Next page"
        disabled={!canForward}
        onClick={goForward}
        className="absolute bottom-0 right-0 top-0 z-10 w-[12%] disabled:pointer-events-none"
      />

      {/* Off-window spreads are intentionally NOT mounted. */}
      <div
        {...bind()}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Destination spread beneath the leaf during a flip. */}
        {dest && (
          <div className="absolute inset-0 z-0">
            <BookSpread left={dest.left} right={dest.right} ctx={ctx} />
          </div>
        )}

        {/* Current spread (hidden side covered by the leaf during a flip). */}
        <div className={cn('absolute inset-0', dest ? 'z-10' : 'z-0')}>
          <BookSpread left={cur.left} right={cur.right} ctx={ctx} />
        </div>

        {/* The turning leaf. */}
        {flip.dir && (
          <PageLeaf
            ref={leafRef}
            dir={flip.dir}
            front={leafFront}
            back={leafBack}
            ctx={ctx}
            onTransitionEnd={onTransitionEnd}
          />
        )}
      </div>
    </div>
  );
}

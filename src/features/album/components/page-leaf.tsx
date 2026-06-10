import { forwardRef } from 'react';
import type { Page } from '../lib/progression';
import { AlbumPage, type AlbumPageContext } from './album-page';
import type { FlipDir } from './use-page-flip';

/**
 * The turning leaf. Two `.book-face` children:
 *  - front = the outgoing page (the half being lifted),
 *  - back (`.book-face--back`, pre-rotated 180°) = the incoming page.
 *
 * Positioned over the correct half of the stage depending on direction.
 * The destination spread is mounted BENEATH this leaf (lower z) by the parent.
 */
export const PageLeaf = forwardRef<
  HTMLDivElement,
  {
    dir: FlipDir;
    front?: Page;
    back?: Page;
    ctx: AlbumPageContext;
    onTransitionEnd: () => void;
  }
>(function PageLeaf({ dir, front, back, ctx, onTransitionEnd }, ref) {
  // Forward turns the right half; backward turns the left half.
  const facePad = dir === 'forward' ? 'pl-0.5' : 'pr-0.5';

  return (
    <div
      ref={ref}
      className="book-leaf absolute bottom-0 top-0 z-20"
      style={{ left: dir === 'forward' ? '50%' : 0, width: '50%' }}
      onTransitionEnd={onTransitionEnd}
    >
      <div className={`book-face ${facePad}`}>
        {front ? (
          <AlbumPage page={front} ctx={ctx} />
        ) : (
          <div className="h-full w-full rounded-lg bg-surface" />
        )}
      </div>
      <div className={`book-face book-face--back ${facePad}`}>
        {back ? (
          <AlbumPage page={back} ctx={ctx} />
        ) : (
          <div className="h-full w-full rounded-lg bg-surface" />
        )}
      </div>
    </div>
  );
});

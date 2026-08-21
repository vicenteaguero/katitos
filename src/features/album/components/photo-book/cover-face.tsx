import { forwardRef } from 'react';
import { cn } from '@kernel/lib';
import type { AlbumBook, CoverMaterial } from '../../types';
import { bookSpan } from '../../lib/book-span';

/**
 * The board at each end of the book.
 *
 * A real leaf, not a picture of one: StPageFlip is told `showCover`, which
 * makes the first and last leaves rigid and gives them a spread to themselves,
 * so the book opens by turning its cover the way a book does. Everything about
 * it is CSS — the grain, the gilt, the bevel — because a texture file would be
 * one more thing to download before the album could be looked at.
 */
export const CoverFace = forwardRef<
  HTMLDivElement,
  { book: AlbumBook; back?: boolean; coverUrl?: string }
>(function CoverFace({ book, back = false, coverUrl }, ref) {
  const material = (book.cover_material as CoverMaterial) ?? 'leather';
  const span = bookSpan(book);
  return (
    <div
      ref={ref}
      // `hard` is what StPageFlip reads off the DOM to flip a leaf as a board
      // rather than curling it like paper. Set here as well as implied by
      // showCover, so a cover stays rigid even if the leaf order ever shifts.
      data-density="hard"
      className={cn('pb-cover', `pb-mat-${material}`, back && 'pb-cover--back')}
    >
      {/*
        Everything lives in an inner, absolutely-positioned face — NOT on the
        leaf itself.

        StPageFlip rewrites each leaf's entire `cssText` on every draw, and
        that template hard-codes `display: block`. Any layout put on the leaf
        is therefore wiped: the title stopped being centred, fell to the top of
        the board and had its ascenders sliced off by the rounded corner. The
        paper pages have always done it this way (`.pb-page-host` > `.pb-page`)
        for exactly this reason.
      */}
      <div className="pb-cover-face">
        {!back && coverUrl && (
          <img className="pb-cover-photo" src={coverUrl} alt="" aria-hidden />
        )}
        <span className="pb-cover-plate" aria-hidden="true" />
        {back ? (
          <span className="pb-cover-mark">
            <span className="pb-title">К</span>
          </span>
        ) : (
          <span className="pb-cover-text">
            <span className="pb-title pb-cover-title">{book.title}</span>
            {span && <span className="pb-cover-span">{span}</span>}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * A blank endpaper.
 *
 * Only ever there to keep the number of leaves even, so the back cover gets a
 * spread of its own instead of being paired with the last page of photographs.
 * It looks like the inside of the board, which is what an endpaper is.
 */
export const EndPaper = forwardRef<HTMLDivElement, { paper?: string }>(
  function EndPaper({ paper = 'cream' }, ref) {
    return (
      <div ref={ref} data-density="soft" className="pb-page-host">
        <div className={cn('pb-page pb-endpaper', `pb-paper-${paper}`)} />
      </div>
    );
  }
);

/**
 * The one shape CSS cannot describe on its own.
 *
 * `clip-path: path()` does not scale with its element, so a heart has to come
 * from an SVG clipPath in objectBoundingBox units. It is mounted ONCE, at the
 * root of the book: `url(#pb-heart)` is a document-scoped reference, so if this
 * ever ends up inside a conditional branch that unmounts, every heart on screen
 * silently goes back to being a rectangle.
 */
export function ShapeDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="pb-heart" clipPathUnits="objectBoundingBox">
          <path d="M0.5,1 C0.5,1 0.02,0.66 0.02,0.34 C0.02,0.13 0.18,0.02 0.33,0.02 C0.42,0.02 0.47,0.08 0.5,0.14 C0.53,0.08 0.58,0.02 0.67,0.02 C0.82,0.02 0.98,0.13 0.98,0.34 C0.98,0.66 0.5,1 0.5,1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

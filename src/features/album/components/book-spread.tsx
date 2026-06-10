import type { Page } from '../lib/progression';
import { AlbumPage, type AlbumPageContext } from './album-page';

/**
 * A two-page spread: left (verso) + right (recto). A missing page (odd tail)
 * renders blank.
 */
export function BookSpread({
  left,
  right,
  ctx,
}: {
  left?: Page;
  right?: Page;
  ctx: AlbumPageContext;
}) {
  return (
    <div className="flex h-full w-full">
      <div className="relative h-full w-1/2 pr-0.5">
        {left ? (
          <AlbumPage page={left} ctx={ctx} />
        ) : (
          <div className="h-full w-full rounded-lg bg-surface" />
        )}
      </div>
      <div className="book-spine w-px shrink-0 bg-border" />
      <div className="relative h-full w-1/2 pl-0.5">
        {right ? (
          <AlbumPage page={right} ctx={ctx} />
        ) : (
          <div className="h-full w-full rounded-lg bg-surface" />
        )}
      </div>
    </div>
  );
}

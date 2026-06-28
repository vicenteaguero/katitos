import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Plus } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { Empty, IconButton, LoadingScreen } from '@kernel/ui';
import { SLOTS_PER_PAGE, type BookScope } from '../../types';
import { useBook, usePages } from '../../api/photo-book.queries';
import { useAddPage } from '../../api/photo-book.mutations';
import { PageFace } from './page-face';
import { SlotSheet } from './slot-sheet';
import { useBookFlip } from './use-book-flip';
import '../../photo-book.css';

export interface PhotoBook3DProps {
  scope: BookScope;
  /** Required when `scope === 'trip'`. */
  tripId?: string;
  /** Gilt title embossed above the book. */
  title?: string;
}

/**
 * The shared 3D photo-book engine. Resolves (and self-heals) the book for a
 * scope, loads its pages + photos, and renders a real paper book you flip
 * through with your thumb. Used by Pololini (`scope="life"`) and Summer Panini
 * (`scope="trip"`, one book per trip).
 */
export function PhotoBook3D({ scope, tripId, title }: PhotoBook3DProps) {
  const { data: book, isLoading: bookLoading } = useBook(scope, tripId, title);
  const bookId = book?.id;
  const { data: pages, isLoading: pagesLoading } = usePages(bookId);

  // Live sync: this book's pages, and any photo change (photos carry no book id,
  // so we invalidate broadly — volume is tiny).
  useTableSync('album_pages', bookId ? qk.album.pages(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });
  useTableSync('album_photos', bookId ? qk.album.pages(bookId) : [], {
    enabled: !!bookId,
  });

  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<{ pageId: string; slot: number } | null>(
    null
  );
  const leafRef = useRef<HTMLDivElement | null>(null);
  const addPage = useAddPage();

  // A fresh book starts at its cover.
  useEffect(() => setIndex(0), [bookId]);

  const count = pages?.length ?? 0;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(0, count - 1));

  const {
    bind,
    turning,
    canNext,
    canPrev,
    goNext,
    goPrev,
    onLeafTransitionEnd,
  } = useBookFlip({ index: safeIndex, count, setIndex, leafRef });

  if ((scope === 'life' && bookLoading) || (scope === 'trip' && !tripId)) {
    if (scope === 'trip' && !tripId) {
      return (
        <Empty
          icon={<BookOpen />}
          title="No trip yet"
          hint="Pick a trip to start its book."
        />
      );
    }
    return <LoadingScreen />;
  }
  if (bookLoading || pagesLoading || !pages || count === 0) {
    return <LoadingScreen />;
  }

  const current = pages[safeIndex];
  const nextPage = pages[safeIndex + 1];
  const prevPage = pages[safeIndex - 1];

  const basePage = turning?.dir === 'next' ? (nextPage ?? current) : current;
  const leafPage =
    turning?.dir === 'next'
      ? current
      : turning?.dir === 'prev'
        ? prevPage
        : undefined;

  const atLast = safeIndex === count - 1;
  const lastFull =
    current.photos.filter((p) => p.image_path).length >= SLOTS_PER_PAGE;
  const showAddPage = atLast && lastFull && !turning;

  const tapSlot = (slot: number) => {
    if (turning) return;
    setTarget({ pageId: current.id, slot });
  };

  const onAddPage = () => {
    if (!bookId) return;
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count); // advance onto the new page once it arrives
  };

  const targetPhoto = target
    ? current.photos.find((p) => p.slot === target.slot)
    : undefined;

  return (
    <div className="pb-wine curtain-reveal">
      {title && (
        <p className="mb-4 text-center font-display text-3xl font-semibold">
          <span className="pb-title">{title}</span>
        </p>
      )}

      <div className="pb-stage">
        <div className="pb-case">
          <div
            {...bind()}
            className="pb-stack cursor-grab active:cursor-grabbing"
            data-turning={turning ? 'true' : 'false'}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="pb-layer">
              <PageFace
                page={basePage}
                onTapSlot={tapSlot}
                interactive={!turning}
              />
            </div>

            {turning && leafPage && (
              <div
                ref={leafRef}
                className="pb-leaf"
                onTransitionEnd={onLeafTransitionEnd}
              >
                <div className="pb-face">
                  <PageFace page={leafPage} interactive={false} />
                </div>
                <div className="pb-face pb-face--back" />
                <div className="pb-shade" />
              </div>
            )}

            <div className="pb-foredge" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
        <IconButton
          label="Previous page"
          onClick={goPrev}
          disabled={!canPrev || !!turning}
        >
          <ChevronLeft />
        </IconButton>

        <span className="font-sans text-sm tabular-nums text-muted">
          {safeIndex + 1} / {count}
        </span>

        <div className="flex items-center gap-1">
          {showAddPage && (
            <IconButton
              label="Add a page"
              onClick={onAddPage}
              disabled={addPage.isPending}
            >
              <Plus />
            </IconButton>
          )}
          <IconButton
            label="Next page"
            onClick={goNext}
            disabled={!canNext || !!turning}
          >
            <ChevronRight />
          </IconButton>
        </div>
      </div>

      {target && bookId && (
        <SlotSheet
          key={`${target.pageId}:${target.slot}`}
          bookId={bookId}
          pageId={target.pageId}
          slot={target.slot}
          photo={targetPhoto}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

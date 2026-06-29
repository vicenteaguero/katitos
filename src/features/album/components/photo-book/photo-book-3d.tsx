import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Plus } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { Empty, IconButton, LoadingScreen } from '@kernel/ui';
import { type BookScope } from '../../types';
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

  // Size the book to fill the screen — its WIDTH is derived from the available
  // HEIGHT (book is 3:4), so the page-turn buttons + the whole book are always
  // visible without scrolling, on any phone. Re-measures on resize/orientation.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  useLayoutEffect(() => {
    const compute = () => {
      const el = stageRef.current;
      const main = el?.closest('main');
      if (!el || !main) return;
      const padB = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const top = el.getBoundingClientRect().top;
      // Available height for the book = main content bottom − stage top − the
      // nav row + gap beneath it (~76px).
      const availH = main.getBoundingClientRect().bottom - padB - top - 76;
      setStageW(Math.max(220, Math.floor(availH * 0.75)));
    };
    compute();
    const main = stageRef.current?.closest('main');
    const ro = main ? new ResizeObserver(compute) : null;
    if (main && ro) ro.observe(main);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, []);

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
  if (bookLoading || pagesLoading || !pages || count === 0 || !bookId) {
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
  const showAddPage = atLast && !turning;

  // Add a sticker to the current page. Slot is now just a unique id; the photo
  // lands at the page centre and you drag it where you want.
  const onAdd = () => {
    if (turning) return;
    const nextSlot =
      current.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    setTarget({ pageId: current.id, slot: nextSlot });
  };

  const onAddPage = () => {
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count); // advance onto the new page once it arrives
  };

  return (
    <div className="pb-wine curtain-reveal">
      <div
        ref={stageRef}
        className="pb-stage"
        style={stageW ? { width: stageW, marginInline: 'auto' } : undefined}
      >
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
                bookId={bookId}
                interactive={!turning}
                onAdd={onAdd}
              />
            </div>

            {turning && leafPage && (
              <div
                ref={leafRef}
                className="pb-leaf"
                onTransitionEnd={onLeafTransitionEnd}
              >
                <div className="pb-face">
                  <PageFace
                    page={leafPage}
                    bookId={bookId}
                    interactive={false}
                  />
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

      {target && (
        <SlotSheet
          key={`${target.pageId}:${target.slot}`}
          bookId={bookId}
          pageId={target.pageId}
          slot={target.slot}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

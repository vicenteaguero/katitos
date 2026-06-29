import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  Pencil,
  Check,
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Empty, IconButton, LoadingScreen } from '@kernel/ui';
import { type AlbumPageWithPhotos, type BookScope } from '../../types';
import { useBook, usePages } from '../../api/photo-book.queries';
import { useAddPage } from '../../api/photo-book.mutations';
import { PageFace } from './page-face';
import { SlotSheet } from './slot-sheet';
import '../../photo-book.css';

export interface PhotoBook3DProps {
  scope: BookScope;
  /** Required when `scope === 'trip'`. */
  tripId?: string;
  /** Gilt title embossed above the book. */
  title?: string;
}

/** The subset of the StPageFlip instance we drive imperatively. */
interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (page: number) => void;
  getCurrentPageIndex: () => number;
}
interface FlipBookRef {
  pageFlip: () => FlipApi | undefined;
}

/**
 * One bound paper page, ref-forwarded so StPageFlip can grab its DOM node (the
 * library clones each child and attaches a ref). The page CONTENT is our shared
 * `PageFace`; in the reader it's static (stickers are `pointer-events:none` so a
 * drag peels the page instead of grabbing a photo).
 */
const FlipPage = forwardRef<
  HTMLDivElement,
  { page: AlbumPageWithPhotos; bookId: string }
>(function FlipPage({ page, bookId }, ref) {
  return (
    <div className="pb-page-host" ref={ref}>
      <PageFace page={page} bookId={bookId} interactive={false} />
    </div>
  );
});

/**
 * The shared 3D photo-book engine. Resolves (and self-heals) the book for a
 * scope, loads its pages + photos, and renders a real paper book you flip
 * through with your thumb — a genuine soft-paper curl powered by StPageFlip.
 * Used by Pololini (`scope="life"`) and Summer Panini (`scope="trip"`).
 *
 * Two modes share the same wine chrome:
 *   • read    — the flip-book (realistic page curl); stickers are static.
 *   • arrange — an opaque editor laid over the book where you add / drag / remove
 *     stickers. Placing one persists it (it stays put forever); × removes it.
 * The flip-book instance stays mounted across modes (the arrange editor just
 * covers it), so the engine never re-inits and gestures never clash.
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
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const [flipping, setFlipping] = useState(false);
  const [target, setTarget] = useState<{ pageId: string; slot: number } | null>(
    null
  );
  const bookRef = useRef<FlipBookRef | null>(null);
  const addPage = useAddPage();

  // Size the book to fill the screen — its WIDTH is derived from the available
  // HEIGHT (book is 3:4), so the nav row + the whole book are always visible
  // without scrolling, on any phone. Re-measures on resize/orientation.
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

  // Keep the (always-mounted) reader on the right page: when returning from
  // arrange, and after a data change makes react-pageflip re-run `updateFromHtml`
  // (which can reset its page). A manual flip doesn't change `pages`/`mode`, so
  // this never fights a normal turn.
  useEffect(() => {
    if (mode === 'read') bookRef.current?.pageFlip()?.turnToPage(safeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pages]);

  // Stable page children — rebuilt only when the pages DATA changes (sticker
  // add / move / remove, a new page), NOT on a flip's `setIndex` re-render. A
  // fresh children array each render would make react-pageflip fire
  // `updateFromHtml` mid-flip and swallow the next turn.
  const flipPages = useMemo(
    () =>
      (pages ?? []).map((p) => (
        <FlipPage key={p.id} page={p} bookId={bookId ?? ''} />
      )),
    [pages, bookId]
  );

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

  const arranging = mode === 'arrange';
  const atLast = safeIndex === count - 1;
  const current = pages[safeIndex];

  // Nav: in the reader the buttons drive the real flip; in arrange they just
  // step the editor's page (the hidden book is re-synced on "Done").
  const goPrev = () => {
    if (arranging) setIndex((i) => Math.max(0, i - 1));
    else bookRef.current?.pageFlip()?.flipPrev();
  };
  const goNext = () => {
    if (arranging) setIndex((i) => Math.min(count - 1, i + 1));
    else bookRef.current?.pageFlip()?.flipNext();
  };

  // Add a sticker to the current page. Slot is just a unique id; the photo lands
  // at the page centre and you drag it where you want.
  const onAdd = () => {
    const nextSlot =
      current.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    setTarget({ pageId: current.id, slot: nextSlot });
  };

  const onAddPage = () => {
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count); // advance onto the new page once it arrives
  };

  const showAddPage = !arranging && atLast;
  const navBusy = !arranging && flipping;

  return (
    <div className="pb-wine curtain-reveal">
      {/* Header: arrange / done toggle */}
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setMode(arranging ? 'read' : 'arrange')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-loge transition active:scale-95',
            arranging
              ? 'bg-accent text-accent-fg'
              : 'bg-surface text-fg/80 ring-1 ring-border/60'
          )}
        >
          {arranging ? (
            <>
              <Check className="h-3.5 w-3.5" /> Done
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" /> Arrange
            </>
          )}
        </button>
      </div>

      <div
        ref={stageRef}
        className="pb-stage"
        style={stageW ? { width: stageW, marginInline: 'auto' } : undefined}
      >
        {stageW > 0 && (
          <div className="pb-case">
            <HTMLFlipBook
              ref={bookRef}
              className="pb-book"
              style={{}}
              startPage={safeIndex}
              width={360}
              height={480}
              size="stretch"
              minWidth={200}
              maxWidth={2000}
              minHeight={260}
              maxHeight={2666}
              drawShadow
              flippingTime={800}
              usePortrait
              startZIndex={0}
              autoSize
              maxShadowOpacity={0.5}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward={false}
              useMouseEvents
              swipeDistance={24}
              showPageCorners
              disableFlipByClick={false}
              onFlip={(e: { data: number }) => setIndex(e.data)}
              onChangeState={(e: { data: string }) =>
                setFlipping(e.data !== 'read')
              }
            >
              {flipPages}
            </HTMLFlipBook>
          </div>
        )}

        {/* Arrange editor — an opaque page laid over the book. */}
        {arranging && stageW > 0 && (
          <div className="pb-arrange">
            <div className="pb-case">
              <div className="pb-arrange-page">
                <PageFace
                  key={current.id}
                  page={current}
                  bookId={bookId}
                  interactive
                  onAdd={onAdd}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
        <IconButton
          label="Previous page"
          onClick={goPrev}
          disabled={safeIndex <= 0 || navBusy}
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
            disabled={atLast || navBusy}
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

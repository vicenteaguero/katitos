import {
  forwardRef,
  useCallback,
  useEffect,
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
import { Empty, IconButton, LoadingScreen, useTopBarAction } from '@kernel/ui';
import { type AlbumPageWithPhotos, type BookScope } from '../../types';
import { useBook, usePages } from '../../api/photo-book.queries';
import { useAddPage } from '../../api/photo-book.mutations';
import { PageFace } from './page-face';
import { SlotSheet } from './slot-sheet';
import '../../photo-book.css';

const FLIP_MS = 800;

export interface PhotoBook3DProps {
  scope: BookScope;
  tripId?: string;
  title?: string;
}

interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}
interface FlipBookRef {
  pageFlip: () => FlipApi | undefined;
}

/** One paper leaf — ref-forwarded so StPageFlip can grab the DOM node. */
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
 * The shared photo-book engine (Pololini + Panini): one BIG page, edge to edge,
 * with StPageFlip's NATIVE finger-curl — drag a page corner to peel it, exactly
 * like the reference repo. `read` shows the flip-book; `arrange` swaps it for a
 * single-page editor (so there's never a second book underneath). Add / edit
 * live in the top bar.
 */
export function PhotoBook3D({ scope, tripId, title }: PhotoBook3DProps) {
  const { data: book, isLoading: bookLoading } = useBook(scope, tripId, title);
  const bookId = book?.id;
  const { data: pages, isLoading: pagesLoading } = usePages(bookId);

  useTableSync('album_pages', bookId ? qk.album.pages(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });
  useTableSync('album_photos', bookId ? qk.album.pages(bookId) : [], {
    enabled: !!bookId,
  });

  const [index, setIndex] = useState(0); // the page being read
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const [target, setTarget] = useState<{ pageId: string; slot: number } | null>(
    null
  );
  const bookRef = useRef<FlipBookRef | null>(null);
  const addPage = useAddPage();

  // The page is 3:4 and fills the screen WIDTH (full-bleed), capped so its height
  // still fits without scrolling. A callback ref measures once the stage mounts.
  const [pageW, setPageW] = useState(0);
  const teardownRef = useRef<(() => void) | null>(null);
  const setStage = useCallback((el: HTMLDivElement | null) => {
    teardownRef.current?.();
    teardownRef.current = null;
    const main = el?.closest('main');
    if (!el || !main) return;
    const compute = () => {
      const cs = getComputedStyle(main);
      const padB = parseFloat(cs.paddingBottom) || 0;
      const top = el.getBoundingClientRect().top;
      const fullW = el.getBoundingClientRect().width; // edge-to-edge stage
      const availH = main.getBoundingClientRect().bottom - padB - top - 76;
      setPageW(Math.max(220, Math.min(Math.floor(availH * 0.75), fullW)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(main);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    teardownRef.current = () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, []);

  useEffect(() => setIndex(0), [bookId]);

  const count = pages?.length ?? 0;
  const focused = Math.min(Math.max(index, 0), Math.max(0, count - 1));

  const flipPages = useMemo(
    () =>
      (pages ?? []).map((p) => (
        <FlipPage key={p.id} page={p} bookId={bookId ?? ''} />
      )),
    [pages, bookId]
  );

  // Top-bar controls: + adds a sticker to the current page, ✎ toggles arrange.
  const liveRef = useRef({ pages, focused });
  liveRef.current = { pages, focused };
  const addStickerTop = useCallback(() => {
    const { pages: ps, focused: f } = liveRef.current;
    const cur = ps?.[f];
    if (!cur) return;
    const nextSlot = cur.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    setTarget({ pageId: cur.id, slot: nextSlot });
  }, []);
  const toggleArrange = useCallback(
    () => setMode((m) => (m === 'arrange' ? 'read' : 'arrange')),
    []
  );
  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={addStickerTop}
        aria-label="Add a photo"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={toggleArrange}
        aria-label={mode === 'arrange' ? 'Done arranging' : 'Arrange stickers'}
        className={cn(
          'lift-press flex h-8 w-8 items-center justify-center rounded-full shadow-loge',
          mode === 'arrange'
            ? 'bg-accent text-accent-fg'
            : 'bg-surface text-fg/80 ring-1 ring-border/60'
        )}
        style={
          mode === 'arrange'
            ? { border: '1px solid rgba(228,195,106,.4)' }
            : undefined
        }
      >
        {mode === 'arrange' ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </button>
    </div>,
    [mode]
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
  const current = pages[focused];
  const pageH = Math.round(pageW * (4 / 3));

  const onAddPage = () => {
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count);
  };
  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => bookRef.current?.pageFlip()?.flipNext();
  const atEnd = focused >= count - 1;

  return (
    <div className="pb-wine curtain-reveal">
      <div ref={setStage} className="pb-stage">
        {pageW > 0 && !arranging && (
          <div className="pb-viewport" style={{ height: pageH }}>
            <HTMLFlipBook
              ref={bookRef}
              className="pb-book"
              style={{}}
              startPage={focused}
              width={pageW}
              height={pageH}
              size="fixed"
              minWidth={pageW}
              maxWidth={pageW}
              minHeight={pageH}
              maxHeight={pageH}
              drawShadow
              flippingTime={FLIP_MS}
              usePortrait
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.5}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward={false}
              useMouseEvents
              swipeDistance={18}
              showPageCorners
              disableFlipByClick={false}
              onFlip={(e: { data: number }) => setIndex(e.data)}
            >
              {flipPages}
            </HTMLFlipBook>
          </div>
        )}

        {pageW > 0 && arranging && (
          <div className="pb-editor" style={{ maxWidth: pageW }}>
            <PageFace
              key={current.id}
              page={current}
              bookId={bookId}
              interactive
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
        <IconButton
          label="Previous page"
          onClick={goPrev}
          disabled={arranging || focused <= 0}
        >
          <ChevronLeft />
        </IconButton>

        <span className="font-sans text-sm tabular-nums text-muted">
          {focused + 1} / {count}
        </span>

        <div className="flex items-center gap-1">
          {!arranging && atEnd && (
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
            disabled={arranging || atEnd}
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

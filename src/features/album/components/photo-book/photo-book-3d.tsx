import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useDrag } from '@use-gesture/react';
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

/** Page-turn duration; the in-spread pan rides the same clock so a flip and a
 *  slide feel like one motion. */
const FLIP_MS = 700;

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
 * `PageFace`; in the reader it's static (stickers are `pointer-events:none`).
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
 * The shared photo-book engine — a real OPEN two-page book shown through a
 * single-page-wide sliding window (Pololini `scope="life"` + Summer Panini
 * `scope="trip"`).
 *
 * StPageFlip runs in landscape (2-page spreads `[2k | 2k+1]`), so a flip reveals
 * the genuine facing page (no single-page "duplicate" artifact). A clipping
 * viewport shows ONE page; `.pb-track` (200% wide) pans `translateX 0% ↔ -50%`:
 *   • moving within a spread (left↔right) just slides the window — no flip.
 *   • moving across a spread flips the leaf (real curl) and lands on the next page.
 * Swipe left/right, the `‹ ›` buttons, or tap the left/right edge to navigate.
 *
 * Two modes share the wine chrome: `read` (the book) and `arrange` (an opaque
 * editor laid over the viewport to add / drag / remove stickers).
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

  const [index, setIndex] = useState(0); // the focused page (0..count-1)
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const [busy, setBusy] = useState(false); // a turn/slide is in flight
  const [target, setTarget] = useState<{ pageId: string; slot: number } | null>(
    null
  );
  const bookRef = useRef<FlipBookRef | null>(null);
  const busyRef = useRef(false);
  const addPage = useAddPage();

  // Size the SINGLE page to fit: book is 3:4, so width is derived from available
  // HEIGHT and capped to available WIDTH. The track is 200% of this (clipped). A
  // callback ref fires the moment the stage mounts (past the LoadingScreen).
  const [stageW, setStageW] = useState(0);
  const teardownRef = useRef<(() => void) | null>(null);
  const setStage = useCallback((el: HTMLDivElement | null) => {
    teardownRef.current?.();
    teardownRef.current = null;
    const main = el?.closest('main');
    if (!el || !main) return;
    const compute = () => {
      const cs = getComputedStyle(main);
      const padB = parseFloat(cs.paddingBottom) || 0;
      const padX =
        (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const top = el.getBoundingClientRect().top;
      const availH = main.getBoundingClientRect().bottom - padB - top - 76;
      const byHeight = Math.floor(availH * 0.75);
      const maxWidth = main.clientWidth - padX;
      setStageW(Math.max(220, Math.min(byHeight, maxWidth)));
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
  const safeIndex = Math.min(Math.max(index, 0), Math.max(0, count - 1));

  // Keep StPageFlip's spread aligned to the focused page when returning to the
  // reader and after a data change re-runs `updateFromHtml` (which can reset it).
  // turnToPage(p) opens the spread containing p; a slide doesn't change `pages`.
  useEffect(() => {
    if (mode === 'read') bookRef.current?.pageFlip()?.turnToPage(safeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pages]);

  const flipPages = useMemo(
    () =>
      (pages ?? []).map((p) => (
        <FlipPage key={p.id} page={p} bookId={bookId ?? ''} />
      )),
    [pages, bookId]
  );

  // One directional move. Crossing a spread boundary flips (real curl);
  // otherwise the track just pans to the facing page. Locked for the transition
  // so a fast double-swipe can't skip a page or fight the flip.
  const move = useCallback(
    (dir: 1 | -1) => {
      if (busyRef.current) return;
      const np = safeIndex + dir;
      if (np < 0 || np > count - 1) return;
      const crossing = dir > 0 ? safeIndex % 2 === 1 : safeIndex % 2 === 0;
      busyRef.current = true;
      setBusy(true);
      if (crossing) {
        const pf = bookRef.current?.pageFlip();
        if (dir > 0) pf?.flipNext();
        else pf?.flipPrev();
      }
      setIndex(np);
      window.setTimeout(() => {
        busyRef.current = false;
        setBusy(false);
      }, FLIP_MS);
    },
    [safeIndex, count]
  );

  const bind = useDrag(
    ({ last, swipe: [sx], movement: [mx] }) => {
      if (!last) return;
      if (sx === -1 || mx < -45) move(1);
      else if (sx === 1 || mx > 45) move(-1);
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
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
  const current = pages[safeIndex];
  // 200%-wide track: 0% shows the left page of the spread, -50% the right page.
  const offsetPct = safeIndex % 2 === 0 ? 0 : -50;

  const onAdd = () => {
    const nextSlot =
      current.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    setTarget({ pageId: current.id, slot: nextSlot });
  };

  const onAddPage = () => {
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count);
  };

  const showAddPage = !arranging && safeIndex === count - 1;
  const goPrev = () =>
    arranging ? setIndex((i) => Math.max(0, i - 1)) : move(-1);
  const goNext = () =>
    arranging ? setIndex((i) => Math.min(count - 1, i + 1)) : move(1);

  return (
    <div className="pb-wine curtain-reveal">
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
        ref={setStage}
        className="pb-stage"
        style={stageW ? { width: stageW, marginInline: 'auto' } : undefined}
      >
        {stageW > 0 && (
          <div className="pb-case">
            <div
              className="pb-viewport"
              {...(arranging ? {} : bind())}
              style={{ touchAction: 'pan-y' }}
            >
              <div
                className="pb-track"
                style={{
                  transform: `translateX(${offsetPct}%)`,
                  transition: `transform ${FLIP_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`,
                }}
              >
                <HTMLFlipBook
                  ref={bookRef}
                  className="pb-book"
                  style={{}}
                  startPage={safeIndex}
                  width={360}
                  height={480}
                  size="stretch"
                  minWidth={200}
                  maxWidth={3000}
                  minHeight={260}
                  maxHeight={4000}
                  drawShadow
                  flippingTime={FLIP_MS}
                  usePortrait={false}
                  startZIndex={0}
                  autoSize
                  maxShadowOpacity={0.5}
                  showCover={false}
                  mobileScrollSupport={false}
                  clickEventForward={false}
                  useMouseEvents={false}
                  swipeDistance={24}
                  showPageCorners
                  disableFlipByClick
                >
                  {flipPages}
                </HTMLFlipBook>
              </div>
            </div>
          </div>
        )}

        {/* Arrange editor — an opaque single page laid over the viewport. */}
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
          disabled={safeIndex <= 0 || busy}
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
            disabled={safeIndex >= count - 1 || busy}
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

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
import { Empty, IconButton, LoadingScreen, useTopBarAction } from '@kernel/ui';
import { type AlbumPageWithPhotos, type BookScope } from '../../types';
import { useBook, usePages } from '../../api/photo-book.queries';
import { useAddPage } from '../../api/photo-book.mutations';
import { PageFace } from './page-face';
import { SlotSheet } from './slot-sheet';
import '../../photo-book.css';

const FLIP_MS = 700;
const M = 10; // wine cover margin around the open pages
const PEEK = 38; // px of the facing page you can always see

export interface PhotoBook3DProps {
  scope: BookScope;
  tripId?: string;
  title?: string;
}

interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (page: number) => void;
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
 * The shared photo-book engine — a wine-bound, double-page open book rendered as
 * ONE PIECE (cover + both pages) that is WIDER than the screen. You see one full
 * page + part of the facing page; DRAG to slide the whole piece (the gesture is
 * ours — `useMouseEvents:false` + `touch-action:none`), and a page curls at the
 * spread edges. `read` shows the book; `arrange` swaps it for a single-page
 * editor (so there's never a second book underneath). Add / edit live in the
 * top bar.
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

  // `index` = the page being read; its spread + side decide where the piece sits.
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const [target, setTarget] = useState<{ pageId: string; slot: number } | null>(
    null
  );
  const [drag, setDrag] = useState<{ active: boolean; dx: number }>({
    active: false,
    dx: 0,
  });
  const bookRef = useRef<FlipBookRef | null>(null);
  const busyRef = useRef(false);

  const addPage = useAddPage();

  // Measure full width → page size, the track (whole piece) width, and the two
  // rest offsets: focus the LEFT page (peek the next on the right) or the RIGHT
  // page (peek the previous on the left).
  const [size, setSize] = useState({ pageW: 0, trackW: 0, restL: 0, restR: 0 });
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
      const fullW = el.getBoundingClientRect().width;
      const availH = main.getBoundingClientRect().bottom - padB - top - 76;
      const byH = Math.floor((availH - 2 * M) * 0.75);
      const pageW = Math.max(220, Math.min(fullW - PEEK, byH));
      setSize({
        pageW,
        trackW: 2 * pageW + 2 * M,
        restL: -M, // left page full, next page peeks on the right
        restR: PEEK - M - pageW, // right page full, prev page peeks on the left
      });
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

  // Keep StPageFlip's spread aligned to the focused page after a data change
  // (which re-runs updateFromHtml and can reset it).
  useEffect(() => {
    if (mode === 'read') bookRef.current?.pageFlip()?.turnToPage(focused);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const flipPages = useMemo(
    () =>
      (pages ?? []).map((p) => (
        <FlipPage key={p.id} page={p} bookId={bookId ?? ''} />
      )),
    [pages, bookId]
  );

  // One step through the book. Within a spread it just pans (no flip); crossing
  // a spread boundary turns a page (StPageFlip curl) as the piece slides.
  const step = useCallback(
    (dir: 1 | -1) => {
      if (busyRef.current) return;
      setIndex((p) => {
        const np = p + dir;
        if (np < 0 || np > count - 1) return p;
        const crossing = dir > 0 ? p % 2 === 1 : p % 2 === 0;
        if (crossing) {
          busyRef.current = true;
          const pf = bookRef.current?.pageFlip();
          if (dir > 0) pf?.flipNext();
          else pf?.flipPrev();
          window.setTimeout(() => {
            busyRef.current = false;
          }, FLIP_MS);
        }
        return np;
      });
    },
    [count]
  );

  // Drag the whole piece: it follows the finger; on release, snap or step.
  const bind = useDrag(
    ({ last, movement: [mx], swipe: [sx] }) => {
      if (last) {
        setDrag({ active: false, dx: 0 });
        if (sx === -1 || mx < -40) step(1);
        else if (sx === 1 || mx > 40) step(-1);
        return;
      }
      const lim = size.pageW * 0.9;
      setDrag({ active: true, dx: Math.max(-lim, Math.min(lim, mx)) });
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
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
  const { pageW, trackW, restL, restR } = size;
  const pageH = Math.round(pageW * (4 / 3));
  const rest = focused % 2 === 0 ? restL : restR;
  const tx = rest + (drag.active ? drag.dx : 0);

  const onAddPage = () => {
    const position = (pages[count - 1]?.position ?? -1) + 1;
    addPage.mutate({ bookId, position });
    setIndex(count);
  };
  const atEnd = focused >= count - 1;

  return (
    <div className="pb-wine curtain-reveal">
      <div ref={setStage} className="pb-stage">
        {pageW > 0 && !arranging && (
          <div
            className="pb-viewport"
            style={{ height: pageH + 2 * M }}
            {...bind()}
          >
            <div
              className="pb-track"
              style={{
                width: trackW,
                transform: `translateX(${tx}px)`,
                transition: drag.active
                  ? 'none'
                  : `transform ${FLIP_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`,
              }}
            >
              <div className="pb-case">
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
                  usePortrait={false}
                  startZIndex={0}
                  autoSize={false}
                  maxShadowOpacity={0.5}
                  showCover={false}
                  mobileScrollSupport={false}
                  clickEventForward={false}
                  useMouseEvents={false}
                  swipeDistance={18}
                  showPageCorners
                  disableFlipByClick
                >
                  {flipPages}
                </HTMLFlipBook>
              </div>
            </div>
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
          onClick={() => step(-1)}
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
            onClick={() => step(1)}
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

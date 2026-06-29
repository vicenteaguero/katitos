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
import {
  computeLayout,
  decideGesture,
  restFor,
  slideDx,
  stepCrossing,
} from './book-geometry';
import '../../photo-book.css';

const FLIP_MS = 700;
const M = 10; // wine cover margin around the open pages
const MIN_PEEK = 40; // smallest sliver of the facing page kept visible

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
  // The gesture is classified ONCE at touch-start and locked for its duration.
  const modeRef = useRef<'slide' | 'flip' | null>(null);
  const targetRef = useRef(0);
  const vpRef = useRef<HTMLDivElement | null>(null);

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
      const elW = el.getBoundingClientRect().width; // padded content width
      const availH = main.getBoundingClientRect().bottom - padB - top - 76;
      setSize(computeLayout(elW, availH, M, MIN_PEEK));
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

  // A page flip (StPageFlip curl) across a spread boundary, locked for FLIP_MS.
  const doFlip = useCallback(
    (target: number) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const pf = bookRef.current?.pageFlip();
      if (target > focused) pf?.flipNext();
      else pf?.flipPrev();
      setIndex(target);
      window.setTimeout(() => {
        busyRef.current = false;
      }, FLIP_MS);
    },
    [focused]
  );

  // One step in a direction. Within a spread it SLIDES (the .pb-track CSS
  // transition pans, no curl); across a spread boundary it FLIPS (curl). Both
  // the buttons and the drag route through this same slide-or-flip decision.
  const go = useCallback(
    (dir: 1 | -1) => {
      const target = focused + dir;
      if (target < 0 || target > count - 1 || busyRef.current) return;
      if (stepCrossing(focused, dir)) doFlip(target);
      else setIndex(target);
    },
    [focused, count, doFlip]
  );

  // The gesture: split the book in halves and decide ONCE at touch-start whether
  // this is a SLIDE or a FLIP, then LOCK it for the gesture so the two never mix
  // (that mixing was the old bounce). Left page → [ flipPrev | slide ]; right
  // page → [ slide | flipNext ]. Slide follows the finger between the two rest
  // offsets; flip commits the curl on a deliberate drag/flick.
  const bind = useDrag(
    ({ first, last, xy: [x], movement: [mx], velocity: [vx] }) => {
      if (first) {
        const rect = vpRef.current?.getBoundingClientRect();
        const leftHalf = rect ? x - rect.left < rect.width / 2 : true;
        const { mode, target } = decideGesture(
          focused,
          count,
          leftHalf,
          busyRef.current
        );
        modeRef.current = mode;
        targetRef.current = target;
        return;
      }
      const mode = modeRef.current;
      if (!mode) return;
      const committed = Math.abs(mx) > 40 || Math.abs(vx) > 0.4;
      if (mode === 'slide') {
        if (last) {
          modeRef.current = null;
          setDrag({ active: false, dx: 0 });
          if (committed) setIndex(targetRef.current);
          return;
        }
        // Follow the finger between the current rest and the target rest.
        setDrag({
          active: true,
          dx: slideDx(focused, mx, size.restL, size.restR),
        });
      } else if (last) {
        // Flip zone: no live pan (the next spread isn't drawn yet) — the curl
        // commits on release past the threshold, else the gesture is cancelled.
        modeRef.current = null;
        if (committed) doFlip(targetRef.current);
      }
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
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={toggleArrange}
        aria-label={mode === 'arrange' ? 'Done arranging' : 'Arrange stickers'}
        className={cn(
          'lift-press flex h-8 w-8 items-center justify-center rounded-full shadow-loge outline-none focus-visible:ring-2 focus-visible:ring-gold',
          mode === 'arrange'
            ? 'bg-accent text-accent-fg'
            : 'bg-surface text-fg/80 ring-1 ring-border'
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
  const rest = restFor(focused, restL, restR);
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
            ref={vpRef}
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
          onClick={() => go(-1)}
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
            onClick={() => go(1)}
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

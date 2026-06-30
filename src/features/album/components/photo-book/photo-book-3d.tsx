import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
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
  Type,
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Empty,
  Input,
  LoadingScreen,
  Sheet,
  useTopBarAction,
} from '@kernel/ui';
import { type AlbumPageWithPhotos, type BookScope } from '../../types';
import { useBook, usePages } from '../../api/photo-book.queries';
import { useAddPage, useAddPhoto } from '../../api/photo-book.mutations';
import { PageFace } from './page-face';
import { SlotSheet } from './slot-sheet';
import { computeLayout, restFor, slideDx, stepCrossing } from './book-geometry';
import '../../photo-book.css';

const FLIP_MS = 700; // StPageFlip curl duration
const SLIDE_MS = 380; // snappier within-spread slide (CSS track transition)
const M = 10; // wine cover margin around the open pages
const MIN_PEEK = 40; // smallest sliver of the facing page kept visible

/** A round, gilt-edged page-nav button. */
function NavBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="lift-press flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-gold shadow-loge outline-none transition disabled:opacity-25"
      style={{ border: '1px solid rgba(228,195,106,.28)' }}
    >
      {children}
    </button>
  );
}

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
 * page + a peek of the facing page. Each focused page is split down the middle:
 * the OUTER half gives StPageFlip's native finger-curl (`useMouseEvents`), the
 * SPINE half is a transparent overlay that SLIDES the piece between the two
 * pages of a spread. Left page → [ curl | slide ]; right page → [ slide | curl ].
 * The two never fight — ownership is decided by which half the touch starts on.
 * `read` shows the book; `arrange` swaps it for a single-page editor.
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
  const vpRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const addPage = useAddPage();
  const addPhoto = useAddPhoto();
  const [textOpen, setTextOpen] = useState(false);
  const [textVal, setTextVal] = useState('');

  // Measure content width → page size + the rest offsets, reserving the REAL
  // controls-row height so the book never clips (the old fixed -76 under-
  // reserved on iOS standalone, which is what cut Panini off).
  const [size, setSize] = useState({
    pageW: 0,
    trackW: 0,
    restL: 0,
    restR: 0,
    vw: 0,
  });
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
      const controlsH = controlsRef.current?.offsetHeight ?? 96;
      const availH =
        main.getBoundingClientRect().bottom - padB - top - controlsH - 16;
      setSize(computeLayout(elW, availH, M, MIN_PEEK));
    };
    compute();
    // Re-measure once the curtain-reveal transform settles — the one-shot mount
    // read happens mid-animation, so this locks in the resting geometry.
    const raf = requestAnimationFrame(compute);
    const t = window.setTimeout(compute, 420);
    const ro = new ResizeObserver(compute);
    ro.observe(main);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    teardownRef.current = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, []);

  useEffect(() => setIndex(0), [bookId]);

  const count = pages?.length ?? 0;
  const focused = Math.min(Math.max(index, 0), Math.max(0, count - 1));

  // Live mirror so the stable onFlip handler always reads the latest values.
  const liveRef = useRef({ pages, focused, count });
  liveRef.current = { pages, focused, count };

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

  // StPageFlip drives the curl natively; when it lands on a new spread it tells
  // us here so our sliding-window track + overlay re-sync. A backward flip
  // enters the previous spread from its RIGHT page (sliding-window continuity).
  const onFlipped = useCallback((e: { data: number }) => {
    const spread = e.data;
    const { focused: f, count: c } = liveRef.current;
    setIndex(spread < f ? Math.min(spread + 1, c - 1) : spread);
  }, []);

  // Buttons: slide within a spread (CSS pan), or trigger the native curl across
  // a boundary (onFlipped then syncs the index).
  const go = useCallback(
    (dir: 1 | -1) => {
      const t = focused + dir;
      if (t < 0 || t > count - 1) return;
      if (stepCrossing(focused, dir)) {
        const pf = bookRef.current?.pageFlip();
        if (dir > 0) pf?.flipNext();
        else pf?.flipPrev();
      } else setIndex(t);
    },
    [focused, count]
  );

  // The SLIDE overlay (spine half) owns its touches and pans the piece between
  // the two pages of the current spread, committing on release. The outer half
  // is left uncovered for StPageFlip's native curl.
  const slideBind = useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
      const even = focused % 2 === 0;
      const t = even ? focused + 1 : focused - 1;
      if (t < 0 || t > count - 1) return; // lone page — nothing to slide to
      if (last) {
        setDrag({ active: false, dx: 0 });
        if (Math.abs(mx) > 40 || Math.abs(vx) > 0.4) setIndex(t);
        return;
      }
      setDrag({
        active: true,
        dx: slideDx(focused, mx, size.restL, size.restR),
      });
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
  );

  // Top-bar controls: + adds a sticker to the current page, ✎ toggles arrange.
  const stickerRef = useRef({ pages, focused });
  stickerRef.current = { pages, focused };
  const addStickerTop = useCallback(() => {
    const { pages: ps, focused: f } = stickerRef.current;
    const cur = ps?.[f];
    if (!cur) return;
    const nextSlot = cur.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    setTarget({ pageId: cur.id, slot: nextSlot });
  }, []);
  const toggleArrange = useCallback(
    () => setMode((m) => (m === 'arrange' ? 'read' : 'arrange')),
    []
  );
  const submitText = useCallback(() => {
    const { pages: ps, focused: f } = stickerRef.current;
    const cur = ps?.[f];
    if (!cur || !textVal.trim() || !bookId) return;
    const nextSlot = cur.photos.reduce((m, p) => Math.max(m, p.slot), -1) + 1;
    addPhoto.mutate(
      {
        bookId,
        pageId: cur.id,
        slot: nextSlot,
        source: 'text',
        caption: textVal.trim(),
      },
      {
        onSuccess: () => {
          setTextOpen(false);
          setTextVal('');
        },
      }
    );
  }, [textVal, bookId, addPhoto]);
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
        onClick={() => setTextOpen(true)}
        aria-label="Add text"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-gold shadow-loge outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Type className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={toggleArrange}
        aria-label={mode === 'arrange' ? 'Done arranging' : 'Arrange stickers'}
        className={cn(
          'lift-press flex h-8 w-8 items-center justify-center rounded-full shadow-loge outline-none focus-visible:ring-2 focus-visible:ring-gold',
          mode === 'arrange'
            ? 'bg-accent text-accent-fg'
            : 'bg-surface text-fg/80 ring-1 ring-accent'
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
  const { pageW, trackW, restL, restR, vw } = size;
  const pageH = Math.round(pageW * (4 / 3));
  const rest = restFor(focused, restL, restR);
  const tx = rest + (drag.active ? drag.dx : 0);
  const even = focused % 2 === 0;
  // The slide overlay sits on the spine half of the focused page; the outer half
  // stays open for StPageFlip's native curl.
  const dividerX = even ? M + pageW / 2 : vw - M - pageW / 2;
  const slideStyle: CSSProperties = even
    ? { left: dividerX, right: 0 }
    : { left: 0, width: dividerX };

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
          >
            <div
              className="pb-track"
              style={{
                width: trackW,
                transform: `translateX(${tx}px)`,
                transition: drag.active
                  ? 'none'
                  : `transform ${SLIDE_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`,
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
                  useMouseEvents
                  onFlip={onFlipped}
                  swipeDistance={18}
                  showPageCorners
                  disableFlipByClick
                >
                  {flipPages}
                </HTMLFlipBook>
              </div>
            </div>
            {/* Slide zone — the spine half; the outer half stays open for the
                native curl. */}
            <div
              className="pb-slide-zone"
              style={{ ...slideStyle, top: 0, bottom: 0 }}
              {...slideBind()}
            />
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

      <div
        ref={controlsRef}
        className="mt-3 flex items-center justify-center gap-4 pb-[env(safe-area-inset-bottom)]"
      >
        <NavBtn
          label="Previous page"
          onClick={() => go(-1)}
          disabled={arranging || focused <= 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </NavBtn>

        <span className="gilt-text gilt-figures min-w-[3.75rem] text-center font-display text-lg font-semibold tabular-nums">
          {focused + 1} / {count}
        </span>

        {!arranging && atEnd ? (
          <NavBtn
            label="Add a page"
            onClick={onAddPage}
            disabled={addPage.isPending}
          >
            <Plus className="h-5 w-5" />
          </NavBtn>
        ) : (
          <NavBtn
            label="Next page"
            onClick={() => go(1)}
            disabled={arranging || atEnd}
          >
            <ChevronRight className="h-5 w-5" />
          </NavBtn>
        )}
      </div>

      <Sheet
        open={textOpen}
        onClose={() => setTextOpen(false)}
        title="Add text"
        size="half"
      >
        <div className="space-y-3">
          <Input
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitText()}
            placeholder="A title, a little message…"
            autoFocus
          />
          <Button
            full
            onClick={submitText}
            disabled={addPhoto.isPending || !textVal.trim()}
          >
            Add to the page
          </Button>
        </div>
      </Sheet>

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

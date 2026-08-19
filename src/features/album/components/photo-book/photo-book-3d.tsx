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
import { useNavigate } from 'react-router';
import HTMLFlipBook from 'react-pageflip';
import { useDrag } from '@use-gesture/react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  Pencil,
  Check,
  Settings2,
  Type,
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { BUCKETS, usePrefetchImages, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Empty,
  Input,
  LoadingScreen,
  Sheet,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import {
  type AlbumPageWithPhotos,
  type AlbumPhoto,
  type BookScope,
  type PlacedSticker,
} from '../../types';
import {
  useBook,
  useBookById,
  useLibrary,
  usePages,
} from '../../api/photo-book.queries';
import { useAddPage } from '../../api/photo-book.mutations';
import {
  useBulkAddToLibrary,
  useDeleteFromLibrary,
} from '../../api/library.mutations';
import {
  usePlaceSticker,
  useRestack,
  useRestoreSticker,
  useStyleSticker,
  useUnplaceSticker,
} from '../../api/placements.mutations';
import { AlbumSettingsSheet } from '../album-settings-sheet';
import { PageFace } from './page-face';
import { LibraryStrip } from './library-strip';
import { LibraryUploadSheet } from './library-upload-sheet';
import { StickerToolbar } from './sticker-toolbar';
import { TextStyleSheet } from './text-style-sheet';
import { usePdfBridge } from './use-pdf-bridge';
import { computeLayout, restFor, slideDx, stepCrossing } from './book-geometry';
import '../../photo-book.css';

const FLIP_MS = 700; // StPageFlip curl duration
const SLIDE_MS = 380; // snappier within-spread slide (CSS track transition)
const M = 10; // wine cover margin around the open pages
const MIN_PEEK = 40; // smallest sliver of the facing page kept visible
// Room above and below the paper for the curling leaf and its shadow. The
// viewport paints into it without occupying it (negative margin in the CSS),
// so the fold stops being sliced off at the top and bottom edges.
const CURL_PAD = 16;
/** A stable empty map, so a page without photos never gets a fresh identity. */
const EMPTY_URLS: Map<string, string> = new Map();
/** `style` is required by react-pageflip's props; a literal here would defeat
 *  its own `React.memo` on every render. */
const NO_STYLE: CSSProperties = {};

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

/**
 * Either open a book by id (the shelf), or resolve one of the two legacy books
 * by scope (Pololini, the trip's Panini). Both paths land on the same engine.
 */
export type PhotoBook3DProps =
  | { bookId: string; scope?: never; tripId?: never; title?: never }
  | { bookId?: never; scope: BookScope; tripId?: string; title?: string };

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
  { page: AlbumPageWithPhotos; bookId: string; urls: Map<string, string> }
>(function FlipPage({ page, bookId, urls }, ref) {
  return (
    <div className="pb-page-host" ref={ref}>
      <PageFace page={page} bookId={bookId} interactive={false} urls={urls} />
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
export function PhotoBook3D(props: PhotoBook3DProps) {
  // Exactly one of these two resolves; the other is disabled by `enabled`.
  const byScope = useBook(
    props.scope ?? 'life',
    props.tripId,
    props.title,
    !props.bookId
  );
  const byId = useBookById(props.bookId);
  const book = props.bookId ? byId.data : byScope.data;
  const bookLoading = props.bookId ? byId.isLoading : byScope.isLoading;
  const bookId = book?.id;
  const { data: pages, isLoading: pagesLoading } = usePages(bookId);

  useTableSync('album_pages', bookId ? qk.album.pages(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });
  // Both filtered to THIS book: unfiltered, any change in any album refetched
  // whichever book happened to be open.
  useTableSync('album_placements', bookId ? qk.album.pages(bookId) : [], {
    enabled: !!bookId,
  });
  useTableSync('album_photos', bookId ? qk.album.library(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });

  // `index` = the page being read; its spread + side decide where the piece sits.
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [styleFor, setStyleFor] = useState<PlacedSticker | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drag, setDrag] = useState<{ active: boolean; dx: number }>({
    active: false,
    dx: 0,
  });
  const bookRef = useRef<FlipBookRef | null>(null);
  const vpRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const addPage = useAddPage();
  const place = usePlaceSticker();
  const restack = useRestack();
  const styleSticker = useStyleSticker();
  const unplace = useUnplaceSticker();
  const restore = useRestoreSticker();
  const deleteFromLibrary = useDeleteFromLibrary();
  const { data: library } = useLibrary(bookId);
  const bulk = useBulkAddToLibrary(bookId);
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
    viewportH: 0,
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
      setSize(computeLayout(elW, availH, M, MIN_PEEK, CURL_PAD));
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

  /**
   * Sign every photo in the book in ONE request per bucket.
   *
   * Each sticker used to sign its own proxy AND its own original — two
   * round-trips per photo, on a screen that shows a dozen at a time. The book
   * asks once and hands each page its slice.
   */
  const albumPaths = useMemo(() => {
    const out: string[] = [];
    for (const p of pages ?? []) {
      for (const st of p.stickers) {
        if (st.photo?.source === 'upload' && st.photo.image_path)
          out.push(st.photo.image_path);
      }
    }
    return out;
    // The LIBRARY is deliberately not in here. Folding it in put every
    // uploaded photo into the book's query key, so adding one — thirty times
    // over during a bulk upload — changed the key, changed the data, and
    // re-initialised the whole flip book each time.
  }, [pages]);

  const polaroidPaths = useMemo(() => {
    const out: string[] = [];
    for (const p of pages ?? []) {
      for (const st of p.stickers) {
        if (st.photo?.source === 'polaroid' && st.photo.image_path)
          out.push(st.photo.image_path);
      }
    }
    return out;
  }, [pages]);

  const albumUrls = useSignedUrls(BUCKETS.album, albumPaths, { proxy: true });
  const polaroidUrls = useSignedUrls(BUCKETS.polaroids, polaroidPaths, {
    proxy: true,
  });

  // The strip's own thumbnails, signed separately and only while it is on
  // screen — it is hidden while reading, so there is nothing to sign then.
  const libraryPaths = useMemo(
    () =>
      (library ?? []).map((p) => p.image_path).filter((p): p is string => !!p),
    [library]
  );
  const stripUrls = useSignedUrls(BUCKETS.album, libraryPaths, {
    proxy: true,
    enabled: mode === 'arrange',
  });

  const urlFor = useCallback(
    (photo: AlbumPhoto | null | undefined): string | undefined => {
      if (!photo?.image_path) return undefined;
      const map =
        photo.source === 'polaroid' ? polaroidUrls.data : albumUrls.data;
      return map?.get(photo.image_path);
    },
    [albumUrls.data, polaroidUrls.data]
  );

  /**
   * A URL map PER PAGE, not one for the whole book.
   *
   * `useSignedUrls` keys on the full path list, so adding a single photo gives
   * a brand-new Map — and handing that same Map to every leaf would invalidate
   * all of them and make StPageFlip re-initialise. A page's slice only changes
   * when that page's photos change.
   */
  const pageUrls = useMemo(() => {
    const out = new Map<string, Map<string, string>>();
    for (const p of pages ?? []) {
      const m = new Map<string, string>();
      for (const st of p.stickers) {
        const url = urlFor(st.photo);
        if (url && st.photo?.image_path) m.set(st.photo.image_path, url);
      }
      out.set(p.id, m);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, albumUrls.data, polaroidUrls.data]);

  const libraryUrls = stripUrls.data ?? EMPTY_URLS;

  /**
   * Warm the pages either side of the one being read.
   *
   * The signed-URL Map has no meaningful order, so the order has to be built
   * here — nearest pages first, because those are the ones about to be turned
   * to.
   */
  const prefetch = useMemo(() => {
    const out: string[] = [];
    for (let i = focused - 1; i <= focused + 2; i++) {
      const p = pages?.[i];
      if (!p) continue;
      for (const st of p.stickers) {
        const url = urlFor(st.photo);
        if (url) out.push(url);
      }
    }
    return out;
  }, [pages, focused, urlFor]);
  usePrefetchImages(prefetch);

  usePdfBridge(pages, book?.title ?? 'album');

  const flipPages = useMemo(
    () =>
      (pages ?? []).map((p) => (
        <FlipPage
          key={p.id}
          page={p}
          bookId={bookId ?? ''}
          urls={pageUrls.get(p.id) ?? EMPTY_URLS}
        />
      )),
    [pages, bookId, pageUrls]
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

  // Top-bar controls: photos in, text in, and the edit toggle.
  const stickerRef = useRef({ pages, focused });
  stickerRef.current = { pages, focused };

  const currentPageId = pages?.[focused]?.id;

  const placeOnPage = useCallback(
    (photo: AlbumPhoto) => {
      const { pages: ps, focused: f } = stickerRef.current;
      const cur = ps?.[f];
      if (!cur || !bookId) return;
      place.mutate({ bookId, pageId: cur.id, photoId: photo.id });
    },
    [bookId, place]
  );

  const toggleEdit = useCallback(() => {
    setSelectedId(null);
    setMode((m) => (m === 'arrange' ? 'read' : 'arrange'));
  }, []);

  const submitText = useCallback(() => {
    const { pages: ps, focused: f } = stickerRef.current;
    const cur = ps?.[f];
    if (!cur || !textVal.trim() || !bookId) return;
    place.mutate(
      { bookId, pageId: cur.id, body: textVal.trim() },
      {
        onSuccess: () => {
          setTextOpen(false);
          setTextVal('');
        },
      }
    );
  }, [textVal, bookId, place]);

  /**
   * Take a sticker off the page — instantly, and undoably.
   *
   * The old ✕ deleted the photo and its bytes with no confirmation, from a
   * target hanging off a rotated sticker. Nothing here loses a picture: the
   * photo stays in the library either way.
   */
  const removeSelected = useCallback(
    (sticker: PlacedSticker) => {
      if (!bookId) return;
      setSelectedId(null);
      unplace.mutate(
        { sticker, bookId },
        {
          onSuccess: () =>
            toast.info('Taken off the page', {
              action: {
                label: 'Undo',
                onClick: () => restore.mutate({ sticker, bookId }),
              },
            }),
        }
      );
    },
    [bookId, unplace, restore]
  );

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setUploadOpen(true)}
        aria-label="Add photos"
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
        onClick={() => setSettingsOpen(true)}
        aria-label="Album settings"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-gold shadow-loge outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{ border: '1px solid rgba(228,195,106,.4)' }}
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={toggleEdit}
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

  if (props.scope === 'trip' && !props.tripId) {
    return (
      <Empty
        icon={<BookOpen />}
        title="No trip yet"
        hint="Pick a trip to start its book."
      />
    );
  }
  if (bookLoading) {
    return <LoadingScreen />;
  }
  if (bookLoading || pagesLoading || !pages || count === 0 || !bookId) {
    return <LoadingScreen />;
  }

  const arranging = mode === 'arrange';
  const current = pages[focused];
  const selected = current.stickers.find((st) => st.id === selectedId) ?? null;
  const placedOnPage = new Set(
    current.stickers
      .map((st) => st.photo?.image_path)
      .filter((v): v is string => !!v)
  );
  const { pageW, trackW, restL, restR, vw, viewportH } = size;
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
            style={{ height: viewportH }}
          >
            <div
              className="pb-track"
              style={{
                width: trackW,
                top: CURL_PAD,
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
                  style={NO_STYLE}
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
              // Inset by the curl padding: the halo the viewport now paints
              // above and below the paper is not part of the book, and a
              // gesture zone stretched over it would swallow taps meant for
              // whatever sits there.
              style={{ ...slideStyle, top: CURL_PAD, bottom: CURL_PAD }}
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
              urls={pageUrls.get(current.id) ?? EMPTY_URLS}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        )}
      </div>

      {/* The book's photos, in the space under it. Only while editing — there
          is nothing to drop onto while you are reading. */}
      {arranging && (
        <LibraryStrip
          photos={library ?? []}
          urls={libraryUrls}
          placedPaths={placedOnPage}
          onPlace={placeOnPage}
          onAddPhotos={() => setUploadOpen(true)}
          onAddText={() => setTextOpen(true)}
          onDelete={(photo) =>
            bookId && deleteFromLibrary.mutate({ photo, bookId })
          }
        />
      )}

      <div
        ref={controlsRef}
        className="mt-3 flex items-center justify-center gap-4 pb-[env(safe-area-inset-bottom)]"
      >
        {selected ? (
          <StickerToolbar
            sticker={selected}
            onFront={() =>
              bookId &&
              currentPageId &&
              restack.mutate({
                id: selected.id,
                bookId,
                pageId: currentPageId,
                to: 'front',
              })
            }
            onBack={() =>
              bookId &&
              currentPageId &&
              restack.mutate({
                id: selected.id,
                bookId,
                pageId: currentPageId,
                to: 'back',
              })
            }
            onToggleFrame={() =>
              bookId &&
              styleSticker.mutate({
                id: selected.id,
                bookId,
                patch: {
                  frame: selected.frame === 'polaroid' ? 'plain' : 'polaroid',
                },
              })
            }
            onEditText={() => setStyleFor(selected)}
            onRemove={() => removeSelected(selected)}
          />
        ) : (
          <>
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
          </>
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
            disabled={place.isPending || !textVal.trim()}
          >
            Add to the page
          </Button>
        </div>
      </Sheet>

      <LibraryUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPick={(files) => void bulk.run(files)}
        jobs={bulk.jobs}
        running={bulk.running}
      />

      {book && (
        <AlbumSettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          book={book}
          page={current}
          pageNumber={focused + 1}
          onDeleted={() => {
            setSettingsOpen(false);
            navigate('/album');
          }}
        />
      )}

      <TextStyleSheet
        open={!!styleFor}
        sticker={styleFor}
        onClose={() => setStyleFor(null)}
        onSave={(patch) =>
          styleFor &&
          bookId &&
          styleSticker.mutate({ id: styleFor.id, bookId, patch })
        }
      />
    </div>
  );
}

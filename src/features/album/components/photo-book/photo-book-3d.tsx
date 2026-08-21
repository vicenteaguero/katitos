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
import { Link, useNavigate } from 'react-router';
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
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { BUCKETS, usePrefetchImages, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Empty,
  Input,
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
import { usePlacementSync } from '../../api/placements.realtime';
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
import { CoverFace, EndPaper, ShapeDefs } from './cover-face';
import { LibraryStrip } from './library-strip';
import { LibrarySheet } from './library-sheet';
import { LibraryUploadSheet } from './library-upload-sheet';
import { StickerToolbar } from './sticker-toolbar';
import { StickerStyleSheet } from './sticker-style-sheet';
import { TextStyleSheet } from './text-style-sheet';
import { usePdfBridge } from './use-pdf-bridge';
import {
  computeLayout,
  coverRest,
  isEndPaper,
  leafAfterFlip,
  leafCountFor,
  leafOfPage,
  padLeaves,
  placeLeaf,
  restFor,
  slideDx,
} from './book-geometry';
import { dropSpot } from './sticker-math';
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
      // No disc, and no gilt: two gold circles either side of the page number
      // read as the loudest thing on a screen whose subject is a photograph.
      // The gold on this screen belongs to the book itself.
      className="lift-press flex h-11 w-11 items-center justify-center rounded-full text-fg/55 outline-none transition active:bg-surface-2 active:text-fg disabled:opacity-20"
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
  {
    page: AlbumPageWithPhotos;
    bookId: string;
    urls: Map<string, string>;
    paper: string;
    eager: boolean;
  }
>(function FlipPage({ page, bookId, urls, paper, eager }, ref) {
  return (
    <div className={cn('pb-page-host', `pb-paper-${paper}`)} ref={ref}>
      <PageFace
        page={page}
        bookId={bookId}
        interactive={false}
        eager={eager}
        urls={urls}
      />
    </div>
  );
});

/**
 * The shared photo-book engine — a wine-bound book with real boards at each
 * end, rendered as ONE PIECE (case + both pages) that is WIDER than the screen.
 * You see one full page + a peek of the facing page. Each focused page is split
 * down the middle: the OUTER half gives StPageFlip's native finger-curl
 * (`useMouseEvents`), the SPINE half is a transparent overlay that SLIDES the
 * piece between the two pages of a spread. The two never fight — ownership is
 * decided by which half the touch starts on. A cover has no facing page, so it
 * simply turns.
 *
 * `index` is a LEAF, not a page: leaf 0 is the front cover, leaf N+1 the back.
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
  const bookError = props.bookId ? byId.error : byScope.error;
  // `maybeSingle` resolves to null for a book that no longer exists — a stale
  // link, or the partner deleting the one you had open. That is a real answer,
  // not a loading state, and it used to spin forever.
  const bookGone = props.bookId ? !byId.isLoading && byId.data === null : false;
  const bookId = book?.id;
  const { data: pages, isLoading: pagesLoading } = usePages(bookId);
  const paper = book?.paper ?? 'cream';

  useTableSync('album_pages', bookId ? qk.album.pages(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });
  // Placements can't be filtered server-side and Postgres echoes our own
  // writes, so this one needs to think before it invalidates.
  usePlacementSync(bookId, pages);
  useTableSync('album_photos', bookId ? qk.album.library(bookId) : [], {
    filter: bookId ? `book_id=eq.${bookId}` : undefined,
    enabled: !!bookId,
  });

  // `index` = the LEAF being read; its spread + side decide where the piece sits.
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'read' | 'arrange'>('read');
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [styleFor, setStyleFor] = useState<PlacedSticker | null>(null);
  const [dressFor, setDressFor] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drag, setDrag] = useState<{ active: boolean; dx: number }>({
    active: false,
    dx: 0,
  });
  /**
   * Where the case is heading while a board is turning.
   *
   * A hard cover rotates about the spine across BOTH halves of the case, and
   * `onFlip` only fires when the animation ends — so sliding the piece
   * afterwards made opening the book a two-beat, 1.1-second affair. The slide
   * starts with the turn instead.
   */
  const [slideAhead, setSlideAhead] = useState<number | null>(null);
  const flippingRef = useRef(false);
  const bookRef = useRef<FlipBookRef | null>(null);
  const vpRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  /** The measure function, so a mode change can ask for a fresh one. */
  const computeRef = useRef<(() => void) | null>(null);

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
    /** All the room the book was given — usually more than it takes. */
    availH: 0,
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
      // The photo strip only exists while arranging, and it was never taken out
      // of the height budget — so the page kept its full size, the strip pushed
      // the page arrows down, and they ended up UNDERNEATH the nav bar. Which
      // is exactly the "I can't change pages in edit mode" you hit.
      const stripH = stripRef.current?.offsetHeight ?? 0;
      const availH =
        main.getBoundingClientRect().bottom -
        padB -
        top -
        controlsH -
        stripH -
        16;
      setSize({ ...computeLayout(elW, availH, M, MIN_PEEK, CURL_PAD), availH });
    };
    computeRef.current = compute;
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

  /** The position of a page we have asked for and are waiting to turn to. */
  const landOnRef = useRef<number | null>(null);

  // Entering or leaving edit mode changes what has to fit on screen.
  useEffect(() => {
    computeRef.current?.();
  }, [mode]);

  const pageCount = pages?.length ?? 0;
  const leafCount = leafCountFor(pageCount);
  const focused = Math.min(Math.max(index, 0), Math.max(0, leafCount - 1));
  const place3 = useMemo(
    () => placeLeaf(focused, leafCount),
    [focused, leafCount]
  );
  /** The paper page this leaf shows — null on either cover, or the endpaper. */
  const currentPage =
    focused >= 1 && focused <= pageCount
      ? (pages?.[focused - 1] ?? null)
      : null;

  // Live mirror so the stable onFlip handler always reads the latest values.
  const liveRef = useRef({ pages, focused, leafCount, pageCount });
  liveRef.current = { pages, focused, leafCount, pageCount };

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

  const coverPaths = useMemo(
    () => (book?.cover_path ? [book.cover_path] : []),
    [book?.cover_path]
  );
  const coverUrls = useSignedUrls(BUCKETS.album, coverPaths, { proxy: true });
  const coverUrl = book?.cover_path
    ? coverUrls.data?.get(book.cover_path)
    : undefined;

  // The strip's own thumbnails, signed separately and only while it is on
  // screen — it is hidden while reading, so there is nothing to sign then.
  const libraryPaths = useMemo(
    () =>
      (library ?? []).map((p) => p.image_path).filter((p): p is string => !!p),
    [library]
  );
  const stripUrls = useSignedUrls(BUCKETS.album, libraryPaths, {
    proxy: true,
    enabled: mode === 'arrange' || libraryOpen,
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
   * to. Leaf indices, shifted by the cover.
   */
  const prefetch = useMemo(() => {
    const out: string[] = [];
    for (let leaf = focused - 2; leaf <= focused + 3; leaf++) {
      const p = pages?.[leaf - 1];
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

  /**
   * Changes ONLY when the run of leaves itself changes — a page added, a page
   * torn out, the endpaper appearing or going.
   *
   * StPageFlip takes each leaf element OUT of React's tree and re-parents it
   * into its own `.stf__item` wrappers. React does not know that, so when a new
   * page has to be inserted between two existing leaves it looks for a sibling
   * that is no longer where it left it and throws `NotFoundError: The object
   * can not be found here` — which took the whole route down with it. That is
   * the crash behind "adding a page from the back cover adds another cover".
   *
   * Used as a `key`, so the book is rebuilt from scratch on those rare
   * occasions instead of being spliced into. Sticker edits do NOT change it,
   * so the expensive case stays as cheap as it was.
   */
  const flipKey = useMemo(
    () => `${(pages ?? []).map((p) => p.id).join('|')}|${padLeaves(pageCount)}`,
    [pages, pageCount]
  );

  const flipPages = useMemo(() => {
    if (!book) return [];
    const leaves: ReactNode[] = [
      <CoverFace key="cover-front" book={book} coverUrl={coverUrl} />,
    ];
    (pages ?? []).forEach((p, i) => {
      leaves.push(
        <FlipPage
          key={p.id}
          page={p}
          bookId={bookId ?? ''}
          paper={paper}
          // The spread you are actually looking at gets its photographs now;
          // everything else can wait its turn.
          eager={Math.abs(i + 1 - focused) <= 1}
          urls={pageUrls.get(p.id) ?? EMPTY_URLS}
        />
      );
    });
    // Keeps the leaf count even so the back board flips alone. Without it
    // StPageFlip pairs the back cover with the last photograph AND turns that
    // photograph into a rigid board.
    if (padLeaves(pageCount)) leaves.push(<EndPaper key="pad" paper={paper} />);
    leaves.push(<CoverFace key="cover-back" book={book} back />);
    return leaves;
    // `focused` deliberately excluded: eagerness is a hint, and rebuilding
    // every leaf on every page turn is the thing this whole file avoids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, bookId, pageUrls, book, coverUrl, paper, pageCount]);

  // StPageFlip drives the curl natively; when it lands on a new spread it tells
  // us here so our sliding-window track + overlay re-sync. `e.data` is the
  // FIRST LEAF of the new spread, so a backward flip enters the previous spread
  // from its RIGHT page (sliding-window continuity).
  const onFlipped = useCallback((e: { data: number }) => {
    const { focused: f, leafCount: lc, pageCount: pc } = liveRef.current;
    flippingRef.current = false;
    setSlideAhead(null);
    let leaf = leafAfterFlip(e.data, f, lc);
    // Never come to rest on the blank endpaper — carry on the way we were
    // already going.
    if (isEndPaper(leaf, pc, lc)) leaf += leaf > f ? 1 : -1;
    setIndex(Math.min(Math.max(leaf, 0), lc - 1));
  }, []);

  /**
   * Start the case moving with the board, not after it.
   *
   * The only way out of a cover is a flip, so the direction is never in doubt:
   * off the front board we are going forwards, off the back one backwards, and
   * a paper page curls towards whichever edge it is not resting against.
   */
  const onChangeState = useCallback((e: { data: string }) => {
    if (e.data !== 'flipping') {
      // 'read' is the last thing StPageFlip says — AFTER `onFlip`, and also
      // after a fold that was picked up and then abandoned. Either way the
      // case must stop leaning towards a page it is not going to: without
      // this, letting go of a half-turned corner left the whole book resting
      // at the wrong offset until the next thing you did.
      if (e.data === 'read') {
        flippingRef.current = false;
        setSlideAhead(null);
      }
      return;
    }
    flippingRef.current = true;
    const { focused: f, leafCount: lc } = liveRef.current;
    const p = placeLeaf(f, lc);
    const dir = p.lone ? (f === 0 ? 1 : -1) : p.side === 'left' ? -1 : 1;
    const target = Math.min(Math.max(f + dir, 0), lc - 1);
    setSlideAhead(target);
  }, []);

  // Buttons: slide within a spread (CSS pan), or trigger the native curl across
  // a boundary (onFlipped then syncs the index).
  const go = useCallback(
    (dir: 1 | -1) => {
      let t = focused + dir;
      // Step OVER the blank endpaper — it is not a page, and landing on it
      // reads as "my album has an empty sheet in it".
      if (isEndPaper(t, pageCount, leafCount)) t += dir;
      const lo = mode === 'arrange' ? 1 : 0;
      const hi = mode === 'arrange' ? pageCount : leafCount - 1;
      if (t < lo || t > hi) return;
      setSelectedId(null);
      setCroppingId(null);
      // While arranging there is no flip book on screen — the editor shows one
      // page at a time — so turning is just moving the index. Without this the
      // arrows were dead the whole time you were editing, which is exactly
      // when you want to put a photo on the NEXT page.
      if (mode === 'arrange') {
        setIndex(t);
        return;
      }
      // Same spread → pan the case. Different spread → turn a leaf. Asking
      // the destination rather than the direction is what lets the step over
      // the endpaper still resolve to a single turn.
      if (placeLeaf(t, leafCount).spread === place3.spread) {
        setIndex(t);
        return;
      }
      setSlideAhead(t);
      flippingRef.current = true;
      const pf = bookRef.current?.pageFlip();
      if (dir > 0) pf?.flipNext();
      else pf?.flipPrev();
    },
    [focused, leafCount, pageCount, mode, place3]
  );

  // A page we asked for has arrived — go and stand on it.
  useEffect(() => {
    const position = landOnRef.current;
    if (position == null || !pages) return;
    const index = pages.findIndex((p) => p.position === position);
    if (index < 0) return;
    landOnRef.current = null;
    setIndex(leafOfPage(index));
  }, [pages]);

  // Keep StPageFlip's spread aligned to the focused leaf after a data change
  // (which re-runs updateFromHtml and can reset it) — but NEVER mid-curl, or
  // the book snaps back under your finger.
  useEffect(() => {
    if (mode === 'read' && !flippingRef.current) {
      bookRef.current?.pageFlip()?.turnToPage(focused);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipPages]);

  // The SLIDE overlay (spine half) owns its touches and pans the piece between
  // the two pages of the current spread, committing on release. The outer half
  // is left uncovered for StPageFlip's native curl.
  const slideBind = useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
      // A cover has nothing beside it to slide to.
      if (place3.lone) return;
      const t = place3.side === 'left' ? focused + 1 : focused - 1;
      if (t < 0 || t > leafCount - 1) return;
      if (last) {
        setDrag({ active: false, dx: 0 });
        if (Math.abs(mx) > 40 || Math.abs(vx) > 0.4) setIndex(t);
        return;
      }
      setDrag({
        active: true,
        dx: slideDx(place3, mx, size.restL, size.restR),
      });
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
  );

  const placeOnPage = useCallback(
    (photo: AlbumPhoto) => {
      const cur = liveRef.current.pages?.[liveRef.current.focused - 1];
      if (!cur || !bookId) return;
      // Beside whatever is already there, not on top of it.
      place.mutate({
        bookId,
        pageId: cur.id,
        photoId: photo.id,
        photo,
        ...dropSpot(cur.stickers.length),
      });
    },
    [bookId, place]
  );

  const placeMany = useCallback(
    (chosen: AlbumPhoto[]) => {
      const cur = liveRef.current.pages?.[liveRef.current.focused - 1];
      if (!cur || !bookId || !chosen.length) return;
      const base = cur.stickers.length;
      chosen.forEach((photo, i) =>
        place.mutate({
          bookId,
          pageId: cur.id,
          photoId: photo.id,
          photo,
          ...dropSpot(base + i),
        })
      );
    },
    [bookId, place]
  );

  /** Stickers taken off in the last few seconds, so one Undo covers them all. */
  const removedRef = useRef<PlacedSticker[]>([]);
  const forgetRef = useRef<number | undefined>(undefined);

  const toggleEdit = useCallback(() => {
    setSelectedId(null);
    setCroppingId(null);
    // A board has nothing on it to arrange. Turn to the first page and start
    // there — which is what "let me put things in" means when you are looking
    // at a cover. (The cover's own settings live behind the gear.)
    if (!currentPage) {
      // Not conditional on the pages having arrived. Tapping edit a beat too
      // early used to do NOTHING AT ALL — no editor, no message — and you were
      // left tapping it again wondering what was broken. Leaf 1 is the first
      // page whenever there is one, and the editor simply waits for it.
      setIndex(1);
      setMode('arrange');
      return;
    }
    setMode((m) => (m === 'arrange' ? 'read' : 'arrange'));
  }, [currentPage]);

  const submitText = useCallback(() => {
    const cur = liveRef.current.pages?.[liveRef.current.focused - 1];
    if (!cur || !textVal.trim() || !bookId) return;
    place.mutate(
      {
        bookId,
        pageId: cur.id,
        body: textVal.trim(),
        ...dropSpot(cur.stickers.length),
      },
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
      setCroppingId(null);
      unplace.mutate(
        { sticker, bookId },
        {
          onSuccess: () => {
            // Clearing a page means half a dozen taps in a row, and each one
            // used to leave its own nine-second toast stacked over the book.
            // One toast, counting up, and its Undo puts the whole burst back.
            const batch = [...removedRef.current, sticker];
            removedRef.current = batch;
            window.clearTimeout(forgetRef.current);
            forgetRef.current = window.setTimeout(() => {
              removedRef.current = [];
            }, 9000);
            toast.info(
              batch.length === 1
                ? 'Taken off the page'
                : `${batch.length} taken off the page`,
              {
                key: 'album-unplace',
                action: {
                  label: 'Undo',
                  onClick: () => {
                    for (const st of batch)
                      restore.mutate({ sticker: st, bookId });
                    removedRef.current = [];
                  },
                },
              }
            );
          },
        }
      );
    },
    [bookId, unplace, restore]
  );

  /**
   * Two buttons, not four.
   *
   * Adding a photo and adding text only mean anything while you are arranging,
   * and the strip under the book already offers both — so the top bar carried
   * two dead controls in reading mode and four gilt-ringed circles in a row in
   * either. What is left is the album itself and the way into editing it.
   */
  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Album settings"
        className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-gold/90 outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={toggleEdit}
        aria-label={mode === 'arrange' ? 'Done arranging' : 'Arrange stickers'}
        className={cn(
          'lift-press flex h-8 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold',
          mode === 'arrange'
            ? 'bg-accent text-accent-fg'
            : 'bg-surface-2 text-gold/90'
        )}
      >
        {mode === 'arrange' ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </button>
    </div>,
    [mode, toggleEdit]
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
  if (bookGone || bookError) {
    return (
      <Empty
        icon={<BookOpen />}
        title={bookGone ? 'That album is gone' : "That album won't open"}
        hint={
          bookGone
            ? 'It was taken off the shelf. The others are still there.'
            : 'Something went wrong reaching it. Try again in a moment.'
        }
        action={
          <Link to="/album">
            <Button>Back to the shelf</Button>
          </Link>
        }
      />
    );
  }

  const arranging = mode === 'arrange';
  const selected =
    currentPage?.stickers.find((st) => st.id === selectedId) ?? null;
  const cropping = !!croppingId;
  const dressed =
    currentPage?.stickers.find((st) => st.id === dressFor) ?? null;
  const placedOnPage = new Set(
    (currentPage?.stickers ?? [])
      .map((st) => st.photo?.image_path)
      .filter((v): v is string => !!v)
  );
  const { pageW, trackW, restL, restR, vw, viewportH, availH } = size;
  const pageH = Math.round(pageW * (4 / 3));
  /**
   * A shut book is ONE board. An open one is a spread.
   *
   * Only while it is actually settled on a cover, though — during a turn the
   * board must be full width, because a hard cover swings across both halves
   * of the case and there has to be binding under it the whole way.
   */
  const shut = slideAhead == null && place3.lone;
  /**
   * THE CASE DOES NOT MOVE WHILE A LEAF IS TURNING.
   *
   * It used to start sliding towards the destination the moment the flip
   * began. On a paper page that was a nudge; on the cover it threw the whole
   * book sideways at t=0, so page one was simply THERE before the cover had
   * gone anywhere — the turn revealed nothing. A book opens where it is
   * standing, and the case follows afterwards.
   *
   * Which is why this reads the leaf we are ON (`place3`), never the one we
   * are heading to.
   */
  const rest = place3.lone
    ? coverRest(place3, pageW, M, vw)
    : restFor(place3, restL, restR);
  const tx = rest + (drag.active ? drag.dx : 0);
  /**
   * The binding is not drawn at all while the book is shut.
   *
   * A closed book is its cover — one board, and nothing behind it. Any binding
   * left showing is a second wine rectangle around the first, which is exactly
   * the "book lying on another book" this all started as.
   */
  // The slide overlay sits on the spine half of the focused page; the outer half
  // stays open for StPageFlip's native curl.
  const onLeft = place3.side === 'left';
  const dividerX = onLeft ? M + pageW / 2 : vw - M - pageW / 2;
  const slideStyle: CSSProperties = onLeft
    ? { left: dividerX, right: 0 }
    : { left: 0, width: dividerX };

  const onAddPage = () => {
    if (!bookId) return;
    const position = (pages?.[pageCount - 1]?.position ?? -1) + 1;
    // Remember WHICH page we are waiting for, and turn to it only once it
    // actually exists. Setting the leaf straight away pointed at a leaf the
    // book did not have yet — on the back board that landed on the board
    // itself, and StPageFlip redrew a second cover where the new page should
    // have been. The board moves to the end on its own; we just follow the
    // page.
    landOnRef.current = position;
    addPage.mutate({ bookId, position });
  };
  // The ＋ replaces ▸ once there is no further page worth turning to: on the
  // last page, on the endpaper, or on the back board.
  const atEnd = focused >= pageCount;
  const label =
    focused === 0
      ? 'Cover'
      : focused === leafCount - 1
        ? 'The end'
        : focused > pageCount
          ? '·'
          : `${focused} / ${pageCount}`;

  const loading = bookLoading || pagesLoading || !pages || !bookId || !book;

  return (
    <div
      className={cn(
        'pb-wine curtain-reveal',
        `pb-mat-${book?.cover_material ?? 'leather'}`
      )}
    >
      <ShapeDefs />
      {/* The book is usually shorter than the space it is given — a 3:4 page
          inside a 16:9-ish gap — and it used to sit at the top of that space
          with all the slack dumped underneath it. Reading mode looked
          top-heavy while arrange mode did not, because the editor centres
          itself. Now the stage owns the whole budget and centres whatever is
          in it, so both modes sit in the same place. */}
      <div
        ref={setStage}
        className="pb-stage"
        style={availH > 0 ? { minHeight: availH } : undefined}
      >
        {/* The case is drawn as soon as it has been measured, whether or not
            the photographs have arrived. A full-screen spinner in its place is
            what made opening an album feel slow when the data was already in
            the cache. */}
        {pageW > 0 && loading && (
          <div className="pb-viewport" style={{ height: viewportH }}>
            <div className="pb-track" style={{ width: trackW, top: CURL_PAD }}>
              <div className="pb-case pb-case--waiting">
                <span
                  className="pb-board"
                  style={{ left: 0, right: 0 }}
                  aria-hidden
                />
                <div
                  className="pb-page-host pb-skeleton-leaf"
                  style={{ width: pageW, height: pageH }}
                />
              </div>
            </div>
          </div>
        )}

        {pageW > 0 && !loading && !arranging && (
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
                {!shut && <span className="pb-board" aria-hidden />}
                <HTMLFlipBook
                  key={flipKey}
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
                  showCover
                  mobileScrollSupport={false}
                  clickEventForward={false}
                  useMouseEvents
                  onFlip={onFlipped}
                  onChangeState={onChangeState}
                  swipeDistance={18}
                  showPageCorners
                  disableFlipByClick
                >
                  {flipPages}
                </HTMLFlipBook>
              </div>
            </div>
            {/* Slide zone — the spine half; the outer half stays open for the
                native curl. A board has no facing page, so it gets no zone at
                all and the whole leaf is free to turn. */}
            {!place3.lone && (
              <div
                className="pb-slide-zone"
                // Inset by the curl padding: the halo the viewport now paints
                // above and below the paper is not part of the book, and a
                // gesture zone stretched over it would swallow taps meant for
                // whatever sits there.
                style={{ ...slideStyle, top: CURL_PAD, bottom: CURL_PAD }}
                {...slideBind()}
              />
            )}
          </div>
        )}

        {pageW > 0 && !loading && arranging && currentPage && (
          <div
            className={cn(
              'pb-editor',
              `pb-paper-${paper}`,
              cropping && 'pb-editor--crop'
            )}
            // The same page the book would draw, so what you arrange is what
            // you turn to. A CSS aspect-ratio here ignored the height budget.
            style={{ width: pageW, height: pageH }}
          >
            <PageFace
              key={currentPage.id}
              page={currentPage}
              bookId={bookId}
              interactive
              eager
              urls={pageUrls.get(currentPage.id) ?? EMPTY_URLS}
              selectedId={selectedId}
              croppingId={croppingId}
              onSelect={(id) => {
                setSelectedId(id);
                if (!id || id !== croppingId) setCroppingId(null);
              }}
            />
          </div>
        )}
      </div>

      {/* The book's photos, in the space under it. Only while editing — there
          is nothing to drop onto while you are reading. */}
      {arranging && !loading && (
        <div ref={stripRef}>
          <LibraryStrip
            photos={library ?? []}
            urls={libraryUrls}
            placedPaths={placedOnPage}
            canPlace={!!currentPage}
            onPlace={placeOnPage}
            onPlaceMany={placeMany}
            onAddPhotos={() => setUploadOpen(true)}
            onAddText={() => setTextOpen(true)}
            onOpenAll={() => setLibraryOpen(true)}
          />
        </div>
      )}

      <div
        ref={controlsRef}
        className="mt-3 flex items-center justify-center gap-4 pb-[env(safe-area-inset-bottom)]"
      >
        {selected && bookId ? (
          <StickerToolbar
            sticker={selected}
            cropping={cropping}
            onFront={() =>
              currentPage &&
              restack.mutate({
                id: selected.id,
                bookId,
                pageId: currentPage.id,
                to: 'front',
              })
            }
            onBack={() =>
              currentPage &&
              restack.mutate({
                id: selected.id,
                bookId,
                pageId: currentPage.id,
                to: 'back',
              })
            }
            onCrop={() => setCroppingId((c) => (c ? null : selected.id))}
            onStyle={() => setDressFor(selected.id)}
            onEditText={() => setStyleFor(selected)}
            onRemove={() => removeSelected(selected)}
          />
        ) : (
          <>
            <NavBtn
              label="Previous page"
              onClick={() => go(-1)}
              disabled={focused <= (arranging ? 1 : 0)}
            >
              <ChevronLeft className="h-5 w-5" />
            </NavBtn>

            <span className="gilt-text gilt-figures min-w-[4.5rem] text-center font-display text-lg font-semibold tabular-nums">
              {label}
            </span>

            {/* BOTH, once you reach the end. The ＋ used to REPLACE the
                arrow on the last page, which left the back board reachable
                only by dragging its corner — there was no button that went
                there at all. */}
            <NavBtn
              label="Next page"
              onClick={() => go(1)}
              disabled={focused >= (arranging ? pageCount : leafCount - 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </NavBtn>

            {atEnd && (
              <NavBtn
                label="Add a page"
                onClick={onAddPage}
                disabled={addPage.isPending || loading}
              >
                <Plus className="h-5 w-5" />
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

      {bookId && (
        <>
          <LibraryUploadSheet
            bookId={bookId}
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onPick={(files) => void bulk.run(files)}
            onRemove={bulk.remove}
            jobs={bulk.jobs}
            running={bulk.running}
          />

          <LibrarySheet
            open={libraryOpen}
            photos={library ?? []}
            urls={libraryUrls}
            canPlace={!!currentPage}
            onClose={() => setLibraryOpen(false)}
            onPlaceMany={placeMany}
            onDeleteMany={(chosen) =>
              chosen.forEach((photo) =>
                deleteFromLibrary.mutate({ photo, bookId })
              )
            }
            onAddPhotos={() => {
              setLibraryOpen(false);
              setUploadOpen(true);
            }}
          />
        </>
      )}

      {book && (
        <AlbumSettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          book={book}
          page={currentPage}
          pageNumber={focused}
          onDeleted={() => {
            setSettingsOpen(false);
            navigate('/album');
          }}
        />
      )}

      <StickerStyleSheet
        open={!!dressed}
        sticker={dressed}
        url={urlFor(dressed?.photo)}
        onClose={() => setDressFor(null)}
        onChange={(patch) =>
          dressed &&
          bookId &&
          styleSticker.mutate({ id: dressed.id, bookId, patch })
        }
      />

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

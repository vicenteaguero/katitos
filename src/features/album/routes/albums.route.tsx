import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookHeart, Plus } from 'lucide-react';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Fieldset,
  Input,
  Sheet,
  Skeleton,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import {
  useAlbumPhotoCounts,
  useAlbums,
  useEnsureLifeBook,
} from '../api/photo-book.queries';
import { useCreateAlbum } from '../api/albums.mutations';
import { bookSpan } from '../lib/book-span';
import type { AlbumBook, CoverMaterial } from '../types';

/** The board, in the colours of whatever the book is bound in. */
const BOARD: Record<CoverMaterial, string> = {
  leather: 'linear-gradient(150deg, #6e1423 0%, #4d0d18 100%)',
  linen: 'linear-gradient(150deg, #7a2233 0%, #5a1522 100%)',
  velvet: 'linear-gradient(150deg, #5a0f1d 0%, #33070f 100%)',
  kraft: 'linear-gradient(150deg, #7d5a3c 0%, #58402c 100%)',
};

/**
 * The shelf — every album we keep, one per era of ours.
 *
 * A vertical stack of wide spines rather than a tile grid: an album is a thing
 * with a name and a span of time, and reading those matters more than fitting
 * more of them on screen.
 */
export function AlbumsRoute() {
  const { data: books, isLoading } = useAlbums();
  const { data: counts } = useAlbumPhotoCounts();
  const create = useCreateAlbum();
  const navigate = useNavigate();
  // The one book that is about US rather than about a trip. It creates itself
  // here because this is the only screen guaranteed to be visited — the route
  // that used to do it could never be reached, so after the albums were wiped
  // Pololini would simply never have come back.
  useEnsureLifeBook();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', startsOn: '', endsOn: '' });

  const covers = (books ?? [])
    .map((b) => b.cover_path)
    .filter((p): p is string => !!p);
  const { data: coverUrls } = useSignedUrls(BUCKETS.album, covers);

  const submit = () => {
    if (!form.title.trim()) return;
    create.mutate(
      {
        title: form.title,
        startsOn: form.startsOn || null,
        endsOn: form.endsOn || null,
      },
      {
        onSuccess: (book) => {
          setOpen(false);
          setForm({ title: '', startsOn: '', endsOn: '' });
          toast.success('Album started 📖');
          // Straight into it. Starting a book and then being left standing in
          // front of the shelf is the oddest moment in the whole feature.
          navigate(`/album/${book.id}`);
        },
      }
    );
  };

  useTopBarAction(
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Start a new album"
      className="lift-press flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-loge"
    >
      <Plus className="h-4 w-4" />
    </button>,
    []
  );

  return (
    <div className="curtain-reveal space-y-3">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" rounded="lg" />
          <Skeleton className="h-28 w-full" rounded="lg" />
        </div>
      ) : (books ?? []).length === 0 ? (
        <Empty
          icon="📖"
          title="No albums yet"
          hint="One book per era of ours — start with the one you're living."
        />
      ) : (
        <div className="curtain-stagger space-y-3">
          {(books ?? []).map((book, i) => (
            <AlbumSpine
              key={book.id}
              book={book}
              index={i}
              photos={counts?.get(book.id) ?? 0}
              coverUrl={
                book.cover_path ? coverUrls?.get(book.cover_path) : undefined
              }
            />
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A new album"
        size="half"
      >
        <div className="space-y-3">
          <Field label="What is it?">
            <Input
              autoFocus
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Georgia &amp; Türkiye 2026"
            />
          </Field>
          <Fieldset label="From — until">
            <FieldRow>
              <Input
                type="date"
                aria-label="From"
                value={form.startsOn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsOn: e.target.value }))
                }
              />
              <Input
                type="date"
                aria-label="Until"
                value={form.endsOn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsOn: e.target.value }))
                }
              />
            </FieldRow>
          </Fieldset>
          <Button
            full
            onClick={submit}
            // Not only `isPending`: a double tap in the moment before the
            // request leaves used to start two albums.
            disabled={create.isPending || !form.title.trim()}
          >
            Start it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/** One book on the shelf: cover, name, the years it covers, how full it is. */
function AlbumSpine({
  book,
  index,
  photos,
  coverUrl,
}: {
  book: AlbumBook;
  index: number;
  photos: number;
  coverUrl?: string;
}) {
  const meta = [bookSpan(book), photos ? `${photos} photos` : 'empty'].filter(
    Boolean
  );
  const board =
    BOARD[(book.cover_material as CoverMaterial) ?? 'leather'] ?? BOARD.leather;
  return (
    <Link
      to={`/album/${book.id}`}
      style={{ '--i': index } as React.CSSProperties}
      className="lift-press flex items-stretch gap-3 overflow-hidden rounded-lg rounded-tr-[1.75rem] bg-surface-2 shadow-loge"
    >
      {/* The wine board and its gilt line, so the shelf is made of the same
          book you open — it used to be a flat brown rectangle. */}
      <span
        className="relative w-20 shrink-0 overflow-hidden"
        aria-hidden="true"
        style={{ background: coverUrl ? undefined : board }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <BookHeart className="h-6 w-6 text-gold/60" strokeWidth={1.5} />
          </span>
        )}
        <span
          className="absolute inset-y-1.5 right-0 w-px"
          style={{ background: 'rgba(228,195,106,.5)' }}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 pr-4">
        <span className="truncate font-display text-xl font-semibold text-fg">
          {book.title}
        </span>
        {/* One quiet line. It used to be two, the second of them shouting
            EMPTY — START FILLING IT in capitals at you. */}
        <span className="truncate font-sans text-xs text-muted">
          {meta.join(' · ')}
        </span>
      </span>
    </Link>
  );
}

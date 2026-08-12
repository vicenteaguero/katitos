import { useState } from 'react';
import { Link } from 'react-router';
import { BookHeart, Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { Button, Field, Input, Sheet, Skeleton, toast } from '@kernel/ui';
import { useAlbumPhotoCounts, useAlbums } from '../api/photo-book.queries';
import { useCreateAlbum } from '../api/albums.mutations';
import type { AlbumBook } from '../types';

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
        onSuccess: () => {
          setOpen(false);
          setForm({ title: '', startsOn: '', endsOn: '' });
          toast.success('Album started 📖');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="curtain-reveal space-y-4">
      <Button full variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Start a new album
      </Button>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" rounded="lg" />
          <Skeleton className="h-28 w-full" rounded="lg" />
        </div>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input
                type="date"
                value={form.startsOn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsOn: e.target.value }))
                }
              />
            </Field>
            <Field label="Until">
              <Input
                type="date"
                value={form.endsOn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsOn: e.target.value }))
                }
              />
            </Field>
          </div>
          <Button full onClick={submit} disabled={create.isPending}>
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
  return (
    <Link
      to={`/album/${book.id}`}
      style={{ '--i': index } as React.CSSProperties}
      className="lift-press flex items-stretch gap-3 overflow-hidden rounded-lg rounded-tr-[1.75rem] bg-surface-2 shadow-loge"
    >
      <span
        className="relative w-24 shrink-0 overflow-hidden bg-brown"
        aria-hidden="true"
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
            <BookHeart className="h-7 w-7 text-gold/50" strokeWidth={1.5} />
          </span>
        )}
        {/* The gilt edge where the spine meets the page block. */}
        <span
          className="absolute inset-y-0 right-0 w-px"
          style={{ background: 'rgba(228,195,106,.45)' }}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-4">
        <span className="truncate font-display text-xl font-semibold text-fg">
          {book.title}
        </span>
        <span className="font-sans text-[0.7rem] text-muted">{span(book)}</span>
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] text-copper">
          {photos === 0
            ? 'empty — start filling it'
            : `${photos} ${photos === 1 ? 'photo' : 'photos'}`}
        </span>
      </span>
    </Link>
  );
}

/** "Jun – Aug 2026", "from Jun 2026", or nothing at all. */
function span(book: AlbumBook): string {
  const fmt = (d: string) => DateTime.fromISO(d).toFormat('LLL yyyy');
  if (book.starts_on && book.ends_on) {
    const a = fmt(book.starts_on);
    const b = fmt(book.ends_on);
    return a === b ? a : `${a} – ${b}`;
  }
  if (book.starts_on) return `from ${fmt(book.starts_on)}`;
  if (book.ends_on) return `until ${fmt(book.ends_on)}`;
  return 'no dates yet';
}

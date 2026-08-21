import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  FieldRow,
  Fieldset,
  Input,
  PhotoPicker,
  Segmented,
  Sheet,
  Switch,
  toast,
} from '@kernel/ui';
import type { AlbumBook, CoverMaterial, PaperStock } from '../types';
import {
  useDeleteAlbum,
  useSetAlbumCover,
  useUpdateAlbum,
} from '../api/albums.mutations';
import { useDeletePage, useUpdatePage } from '../api/pages.mutations';

/**
 * Everything about the book itself, and about the page you have open.
 *
 * Six things to change, so six controls — no captions under them explaining
 * what a title is. Every field here used to carry a little uppercase label AND
 * a grey line of help beneath it, which made a short form look like a tax
 * return. What a box is for is written inside it.
 */
export function AlbumSettingsSheet({
  open,
  onClose,
  book,
  page,
  pageNumber,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  book: AlbumBook;
  /** Null on a cover, on the endpaper, or before the book has loaded. */
  page?: { id: string; title: string | null; on_date: string | null } | null;
  pageNumber: number;
  onDeleted: () => void;
}) {
  const update = useUpdateAlbum();
  const setCover = useSetAlbumCover();
  const remove = useDeleteAlbum();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();

  const [title, setTitle] = useState(book.title);
  const [startsOn, setStartsOn] = useState(book.starts_on ?? '');
  const [endsOn, setEndsOn] = useState(book.ends_on ?? '');
  const [pageTitle, setPageTitle] = useState(page?.title ?? '');
  const [pageDate, setPageDate] = useState(page?.on_date ?? '');
  const [cover, setCoverBlob] = useState<Blob | null>(null);

  // Seeded on IDENTITY, not on the object: `book` and `page` come out of a
  // live query, so a refetch — the partner moving a sticker is enough —
  // replaced whatever she was in the middle of typing.
  useEffect(() => {
    setTitle(book.title);
    setStartsOn(book.starts_on ?? '');
    setEndsOn(book.ends_on ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  useEffect(() => {
    setPageTitle(page?.title ?? '');
    setPageDate(page?.on_date ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  const save = () => {
    // The toast used to fire here, before either write had been attempted — so
    // it cheerfully said "Saved" over a rename that had just been refused.
    update.mutate(
      { id: book.id, title, startsOn, endsOn },
      { onSuccess: () => toast.success('Saved', { key: 'album-saved' }) }
    );
    if (page) {
      updatePage.mutate({
        id: page.id,
        bookId: book.id,
        title: pageTitle,
        onDate: pageDate,
      });
    }
    onClose();
  };

  const material = (book.cover_material as CoverMaterial) ?? 'leather';
  const paper = (book.paper as PaperStock) ?? 'cream';

  return (
    <Sheet open={open} onClose={onClose} title="This album" size="half">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What this album is called"
          className="font-display text-lg"
        />
        {/* One caption for the pair, because two identical date boxes side by
            side with nothing said about either is a riddle, not a saving. */}
        <Fieldset label="From — until">
          <FieldRow>
            <Input
              type="date"
              aria-label="From"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
            <Input
              type="date"
              aria-label="Until"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </FieldRow>
        </Fieldset>

        {/* Two settings, one shape: what it is on the left, the control on the
            right. The archive toggle used to sit on its own with no words at
            all next to it — a switch for nothing in particular. */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
          <span className="font-sans text-sm text-fg">Cover</span>
          <PhotoPicker
            value={cover}
            onChange={(blob) => {
              setCoverBlob(blob);
              if (blob) setCover.mutate({ id: book.id, blob });
            }}
          />
        </div>

        {/* What the book is MADE of. Two rows, because a leather book with
            charcoal pages and a kraft one with cream are different objects and
            she should get to choose which one this era is. */}
        <Fieldset label="Bound in">
          <Segmented
            full
            value={material}
            onChange={(v) =>
              update.mutate({ id: book.id, coverMaterial: v as CoverMaterial })
            }
            options={[
              { value: 'leather', label: 'Leather' },
              { value: 'linen', label: 'Linen' },
              { value: 'velvet', label: 'Velvet' },
              { value: 'kraft', label: 'Kraft' },
            ]}
          />
        </Fieldset>

        <Fieldset label="Paper">
          <Segmented
            full
            value={paper}
            onChange={(v) =>
              update.mutate({ id: book.id, paper: v as PaperStock })
            }
            options={[
              { value: 'cream', label: 'Cream' },
              { value: 'ivory', label: 'Ivory' },
              { value: 'kraft', label: 'Kraft' },
              { value: 'charcoal', label: 'Night' },
            ]}
          />
        </Fieldset>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
          <span className="min-w-0 font-sans text-sm text-fg">
            Put it away
            <span className="block font-sans text-xs text-muted">
              off the shelf, nothing lost
            </span>
          </span>
          <Switch
            checked={book.archived}
            onChange={(next) => update.mutate({ id: book.id, archived: next })}
            label="Put it away"
          />
        </div>

        {page && (
          <Fieldset label={`Page ${pageNumber}`}>
            <FieldRow>
              <Input
                value={pageTitle}
                aria-label={`What page ${pageNumber} is`}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="the morning we missed the boat"
              />
              <Input
                type="date"
                aria-label="The day this page is about"
                value={pageDate}
                onChange={(e) => setPageDate(e.target.value)}
              />
            </FieldRow>
          </Fieldset>
        )}

        <Button full onClick={save} disabled={update.isPending}>
          Save
        </Button>

        {/* Destructive, and therefore quiet and last. */}
        <div className="flex gap-2">
          {page && (
            <Button
              variant="ghost"
              full
              onClick={() => {
                // The photos survive — only the arrangement goes.
                deletePage.mutate({ id: page.id, bookId: book.id });
                onClose();
              }}
            >
              <Trash2 size={15} /> This page
            </Button>
          )}
          {book.scope === 'era' && (
            <Button
              variant="ghost"
              full
              className="text-danger"
              onClick={() => remove.mutate(book.id, { onSuccess: onDeleted })}
              disabled={remove.isPending}
            >
              <Trash2 size={15} /> The album
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Field,
  FieldRow,
  Input,
  PhotoPicker,
  Sheet,
  Switch,
  toast,
} from '@kernel/ui';
import type { AlbumBook } from '../types';
import {
  useDeleteAlbum,
  useSetAlbumCover,
  useUpdateAlbum,
} from '../api/albums.mutations';
import { useDeletePage, useUpdatePage } from '../api/pages.mutations';

/**
 * Everything about the book itself, and about the page you have open.
 *
 * All of this existed as unwired mutations — renaming a book, giving it a
 * cover, archiving it — with nowhere to call it from. One sheet off the top
 * bar, no extra chrome on the page.
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
  page?: { id: string; title: string | null; on_date: string | null };
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
    update.mutate({ id: book.id, title, startsOn, endsOn });
    if (page) {
      updatePage.mutate({
        id: page.id,
        bookId: book.id,
        title: pageTitle,
        onDate: pageDate,
      });
    }
    toast.success('Saved');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="This album" size="full">
      <div className="space-y-3">
        <Field label="Called">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <FieldRow>
          <Field label="From">
            <Input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </Field>
          <Field label="Until">
            <Input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label="Cover" hint="The picture on the shelf">
          <PhotoPicker
            value={cover}
            onChange={(blob) => {
              setCoverBlob(blob);
              if (blob) setCover.mutate({ id: book.id, blob });
            }}
          />
        </Field>

        <Switch
          checked={book.archived}
          onChange={(next) => update.mutate({ id: book.id, archived: next })}
          label="Put it away (keeps everything)"
        />

        {page && (
          <>
            <p className="eyebrow pt-2">Page {pageNumber}</p>
            <FieldRow>
              <Field label="This page is">
                <Input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="the morning we missed the boat"
                />
              </Field>
              <Field label="On">
                <Input
                  type="date"
                  value={pageDate}
                  onChange={(e) => setPageDate(e.target.value)}
                />
              </Field>
            </FieldRow>
            <Button
              variant="ghost"
              full
              onClick={() => {
                // The photos survive — only the arrangement goes.
                deletePage.mutate({ id: page.id, bookId: book.id });
                onClose();
              }}
            >
              <Trash2 size={15} /> Tear out this page
            </Button>
          </>
        )}

        <Button full onClick={save} disabled={update.isPending}>
          Save
        </Button>

        {book.scope === 'era' && (
          <Button
            variant="danger"
            full
            onClick={() => {
              remove.mutate(book.id, { onSuccess: onDeleted });
            }}
            disabled={remove.isPending}
          >
            <Trash2 size={15} /> Delete this album
          </Button>
        )}
      </div>
    </Sheet>
  );
}

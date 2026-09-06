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
  toast,
} from '@kernel/ui';
import type { AlbumBook, CoverMaterial, PaperStock } from '../types';
import {
  useDeleteAlbum,
  useSetAlbumCover,
  useUpdateAlbum,
} from '../api/albums.mutations';
import { useDeletePage } from '../api/pages.mutations';

/**
 * Everything about the book itself.
 *
 * Six things to change, so six controls - no captions under them explaining
 * what a title is. What a box is for is written inside it.
 *
 * Two things that used to live here are gone. A page had its own name and
 * date, which said nothing a text sticker on that page does not say better and
 * more visibly. And an "archive" switch nobody could explain: an album is one
 * we keep or one we delete.
 */
export function AlbumSettingsSheet({
  open,
  onClose,
  book,
  page,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  book: AlbumBook;
  /** The page you have open - null on a cover. Only "tear it out" needs it. */
  page?: { id: string } | null;
  onDeleted: () => void;
}) {
  const update = useUpdateAlbum();
  const setCover = useSetAlbumCover();
  const remove = useDeleteAlbum();
  const deletePage = useDeletePage();

  const [title, setTitle] = useState(book.title);
  const [startsOn, setStartsOn] = useState(book.starts_on ?? '');
  const [endsOn, setEndsOn] = useState(book.ends_on ?? '');
  const [cover, setCoverBlob] = useState<Blob | null>(null);

  // Seeded on IDENTITY, not on the object: `book` comes out of a live query, so
  // a refetch - the partner moving a sticker is enough - replaced whatever she
  // was in the middle of typing.
  useEffect(() => {
    setTitle(book.title);
    setStartsOn(book.starts_on ?? '');
    setEndsOn(book.ends_on ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  const save = () => {
    // The toast used to fire here, before either write had been attempted - so
    // it cheerfully said "Saved" over a rename that had just been refused.
    update.mutate(
      { id: book.id, title, startsOn, endsOn },
      { onSuccess: () => toast.success('Saved', { key: 'album-saved' }) }
    );
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
        <Fieldset label="From - until">
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

        {/* What the book is MADE of. A leather book with charcoal pages and a
            kraft one with cream are different objects, and she should get to
            choose which one this era is. */}
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
                // The photos survive - only the arrangement goes.
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

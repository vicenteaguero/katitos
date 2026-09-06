import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Check, ExternalLink, EyeOff, Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Empty,
  IconButton,
  Sheet,
  Skeleton,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useWishlistItems, useWishlists } from '../api/wishlists.queries';
import {
  useAddItem,
  useDeleteItem,
  useUpdateItem,
} from '../api/wishlists.mutations';
import { ItemSheet, type ItemDraft } from '../components/item-sheet';
import type { WishlistItem } from '../types';

/**
 * One gift list.
 *
 * Reading it is the point - most of the time you're browsing, not editing - so
 * the cards carry the picture, the price and the link, and everything writes
 * optimistically so nothing ever waits on a spinner.
 */
export function WishlistDetailRoute() {
  const { listId } = useParams<{ listId: string }>();
  const userId = useUserId();
  const { data: lists } = useWishlists();
  const { data: items, isLoading } = useWishlistItems(listId);

  const add = useAddItem(listId ?? '');
  const update = useUpdateItem(listId ?? '');
  const del = useDeleteItem(listId ?? '');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [detail, setDetail] = useState<WishlistItem | null>(null);

  const list = lists?.find((l) => l.id === listId);
  const rows = useMemo(() => items ?? [], [items]);

  const { data: urls } = useSignedUrls(
    BUCKETS.wishlist,
    rows.map((i) => i.image_path)
  );

  const hiddenCount = useMemo(
    () => rows.filter((i) => !i.visible).length,
    [rows]
  );

  // The top bar has ONE slot, so the hidden-count and the add button are
  // injected together - two separate useTopBarAction calls would overwrite
  // each other and whichever unmounted last would clear the bar entirely.
  const openNew = useRef(() => {});
  openNew.current = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  useTopBarAction(
    <div className="flex items-center gap-1.5">
      {hiddenCount > 0 && (
        <span className="flex items-center gap-1 font-sans text-[0.7rem] text-muted">
          <EyeOff className="h-3.5 w-3.5" /> {hiddenCount} hidden
        </span>
      )}
      <IconButton
        label="Add a wish"
        className="h-9 w-9"
        onClick={() => openNew.current()}
      >
        <Plus className="h-5 w-5" />
      </IconButton>
    </div>,
    [hiddenCount]
  );

  if (!listId) return <Empty icon="❓" title="No list selected" />;

  const submit = (draft: ItemDraft) => {
    const payload = {
      title: draft.title,
      description: draft.description,
      link: draft.link,
      visible: draft.visible,
      image: draft.image,
    };
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          link: payload.link.trim() || null,
          visible: payload.visible,
        },
        { onError: (e) => toast.error(e.message) }
      );
    } else {
      add.mutate(payload, { onError: (e) => toast.error(e.message) });
    }
    setSheetOpen(false);
    setEditing(null);
  };

  return (
    <div className="curtain-reveal space-y-3">
      {list?.description && (
        <p className="px-1 font-sans text-sm text-muted">{list.description}</p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" rounded="lg" />
          <Skeleton className="h-24 w-full" rounded="lg" />
          <Skeleton className="h-24 w-full" rounded="lg" />
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon="🎁"
          title="Nothing on this list yet"
          hint="Tap + to add the first one. New wishes are hidden by default."
        />
      ) : (
        <div className="curtain-stagger space-y-2.5">
          {rows.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              index={i}
              mine={item.added_by === userId}
              url={item.image_path ? urls?.get(item.image_path) : undefined}
              onOpen={() => setDetail(item)}
              onToggleGot={() =>
                update.mutate(
                  { id: item.id, got: !item.got },
                  { onError: (e) => toast.error(e.message) }
                )
              }
            />
          ))}
        </div>
      )}

      <ItemSheet
        open={sheetOpen}
        editing={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
        submitting={add.isPending || update.isPending}
        onDelete={
          editing
            ? () => {
                del.mutate({ id: editing.id, imagePath: editing.image_path });
                setSheetOpen(false);
                setEditing(null);
              }
            : undefined
        }
      />

      {/* The close look: the whole picture, the whole description. */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title}
        headerAction={
          detail?.added_by === userId ? (
            <button
              type="button"
              onClick={() => {
                setEditing(detail);
                setDetail(null);
                setSheetOpen(true);
              }}
              className="lift-press font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold"
            >
              Edit
            </button>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.image_path && urls?.get(detail.image_path) && (
              <img
                src={urls.get(detail.image_path)}
                alt=""
                className="w-full rounded-lg object-cover"
              />
            )}
            {!detail.visible && (
              <p className="flex items-center gap-1.5 font-sans text-xs text-gold">
                <EyeOff className="h-3.5 w-3.5" /> Only you can see this one
              </p>
            )}
            {detail.description && (
              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
                {detail.description}
              </p>
            )}
            {detail.link && (
              <a
                href={detail.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-copper"
              >
                <ExternalLink className="h-4 w-4" /> Open the link
              </a>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** One wish, at a glance. */
function ItemCard({
  item,
  index,
  mine,
  url,
  onOpen,
  onToggleGot,
}: {
  item: WishlistItem;
  index: number;
  mine: boolean;
  url?: string;
  onOpen: () => void;
  onToggleGot: () => void;
}) {
  return (
    <div
      style={{ '--i': index } as React.CSSProperties}
      className={cn(
        'flex items-stretch gap-3 overflow-hidden rounded-lg bg-surface-2',
        item.got && 'opacity-55'
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="lift-press flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {url ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-20 w-20 shrink-0 object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center bg-surface text-2xl">
            🎁
          </span>
        )}
        <span className="min-w-0 flex-1 py-2">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'truncate font-display text-lg text-fg',
                item.got && 'line-through'
              )}
            >
              {item.title}
            </span>
            {!item.visible && (
              <EyeOff
                className="h-3.5 w-3.5 shrink-0 text-gold"
                aria-label="hidden"
              />
            )}
          </span>
          {item.description && (
            <span className="mt-0.5 block truncate font-sans text-xs text-muted">
              {item.description}
            </span>
          )}
          {!mine && (
            <span className="mt-0.5 block font-sans text-[0.6rem] uppercase tracking-[0.14em] text-muted/70">
              from your love
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleGot}
        aria-label={item.got ? 'Not got yet' : 'Mark as got'}
        aria-pressed={item.got}
        className={cn(
          'lift-press flex w-12 shrink-0 items-center justify-center',
          item.got ? 'text-success' : 'text-muted/40'
        )}
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}

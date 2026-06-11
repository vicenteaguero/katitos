import { useRef } from 'react';
import { useDrag, usePinch } from '@use-gesture/react';
import { Repeat, Trash2, X } from 'lucide-react';
import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { Button, Sheet, Spinner, toast } from '@kernel/ui';
import { formatDate } from '@kernel/lib';
import { useRemoveSticker } from '../api/album.mutations';
import type { AlbumSticker } from '../types';

const SCALE_MIN = 1;
const SCALE_MAX = 4;

/**
 * Full-screen pinch+pan zoom for one sticker, plus a detail Sheet with
 * caption/location/who/taken-on, Swap (→ fill) and confirm Remove.
 */
export function StickerZoom({
  sticker,
  authorName,
  onClose,
  onSwap,
}: {
  sticker: AlbumSticker;
  authorName: string;
  onClose: () => void;
  onSwap: () => void;
}) {
  const { data: url, isLoading } = useSignedUrl(
    BUCKETS.album,
    sticker.image_path
  );
  const remove = useRemoveSticker();
  const viewRef = useRef<HTMLImageElement | null>(null);
  const transform = useRef({ scale: 1, x: 0, y: 0 });

  const apply = () => {
    const el = viewRef.current;
    if (!el) return;
    const { scale, x, y } = transform.current;
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  usePinch(
    ({ offset: [s] }) => {
      transform.current.scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));
      apply();
    },
    {
      target: viewRef,
      eventOptions: { passive: false },
      scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
    }
  );

  const bindDrag = useDrag(
    ({ offset: [ox, oy] }) => {
      transform.current.x = ox;
      transform.current.y = oy;
      apply();
    },
    { from: () => [transform.current.x, transform.current.y] }
  );

  const doRemove = () => {
    if (!confirm('Remove this sticker?')) return;
    remove.mutate(
      { id: sticker.id, path: sticker.image_path },
      {
        onSuccess: () => {
          toast.success('Removed');
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="bg-bg/95 fixed inset-0 z-50 flex flex-col">
      <div className="flex justify-end p-3">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="bg-surface-2 lift-press rounded p-2 text-gold"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {isLoading || !url ? (
          <Spinner />
        ) : (
          <img
            ref={viewRef}
            {...bindDrag()}
            src={url}
            alt={sticker.caption ?? ''}
            className="gilt-hairline max-h-full max-w-full touch-none select-none shadow-loge"
            style={{ touchAction: 'none' }}
          />
        )}
      </div>

      <Sheet open onClose={onClose} title={sticker.caption ?? 'Sticker'}>
        <div className="space-y-3">
          <dl className="space-y-1 text-sm">
            {sticker.location && (
              <div className="flex justify-between">
                <dt className="text-muted">Location</dt>
                <dd className="text-fg">{sticker.location}</dd>
              </div>
            )}
            {sticker.taken_on && (
              <div className="flex justify-between">
                <dt className="text-muted">Taken</dt>
                <dd className="text-fg">{formatDate(sticker.taken_on)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Added by</dt>
              <dd className="text-fg">{authorName}</dd>
            </div>
          </dl>

          <div className="flex gap-2">
            <Button full variant="secondary" onClick={onSwap}>
              <Repeat size={16} /> Swap
            </Button>
            <Button
              variant="ghost"
              onClick={doRemove}
              disabled={remove.isPending}
            >
              <Trash2 size={16} /> Remove
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

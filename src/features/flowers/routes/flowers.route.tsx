import { useMemo, useState } from 'react';
import { Check, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, useSignedUrls } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Empty,
  FilePickerButton,
  IconButton,
  Sheet,
  Skeleton,
  SquareCropper,
  Textarea,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useFlowers } from '../api/flowers.queries';
import { useDeleteFlower, useUpsertFlower } from '../api/flowers.mutations';
import { groupByYear, type MonthSlot } from '../lib/months';
import type { Flower } from '../types';

/**
 * A bouquet for every month, three across, each one captioned with its month.
 *
 * Looking mode shows only the months that have one — a grid of empty frames is
 * a list of things you didn't do. Edit mode opens up every month of the year so
 * she can drop one into whichever she likes.
 *
 * Three columns is an explicit request and overrides the usual no-grid rule.
 */
export function FlowersRoute() {
  useTableSync('flowers', qk.flowers.list());
  const { self } = usePartner();
  const { data: flowers, isLoading } = useFlowers();
  const upsert = useUpsertFlower();
  const del = useDeleteFlower();

  const [editing, setEditing] = useState(false);
  const [cropping, setCropping] = useState<{
    month: string;
    file: File;
  } | null>(null);
  const [detail, setDetail] = useState<Flower | null>(null);
  const [note, setNote] = useState('');

  // Her, or him while he still has the admin flag. Mirrors can_upload_flowers()
  // in the database, which is what actually enforces it.
  const canUpload = self?.role === 'b' || !!self?.is_admin;

  const years = useMemo(
    () => groupByYear(flowers ?? [], { editing: editing && canUpload }),
    [flowers, editing, canUpload]
  );

  const { data: urls } = useSignedUrls(
    BUCKETS.flowers,
    (flowers ?? []).map((f) => f.image_path)
  );

  useTopBarAction(
    canUpload ? (
      <IconButton
        label={editing ? 'Done' : 'Add bouquets'}
        onClick={() => setEditing((e) => !e)}
        className={cn('h-9 w-9', editing && 'bg-accent text-accent-fg')}
      >
        {editing ? (
          <Check className="h-5 w-5" />
        ) : (
          <Pencil className="h-5 w-5" />
        )}
      </IconButton>
    ) : null,
    [editing, canUpload]
  );

  const save = (month: string, blob: Blob) =>
    upsert.mutate(
      { month, blob, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success('Bouquet set down 💐');
          setNote('');
        },
        onError: (e) => toast.error(e.message),
      }
    );

  if (isLoading) {
    return (
      <div className="curtain-reveal space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" rounded="md" />
          ))}
        </div>
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <Empty
        icon="❀"
        title="No bouquets yet"
        hint={
          canUpload
            ? 'Tap the pencil to set the first one down.'
            : 'They will bloom here.'
        }
      />
    );
  }

  return (
    <div className="curtain-reveal space-y-7">
      {years.map((y) => (
        <section key={y.year} className="space-y-3">
          <h2 className="text-center font-sans text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-copper/80">
            {y.year}
            {editing && canUpload && (
              <span className="ml-2 normal-case tracking-normal text-muted">
                {y.filled}/{y.slots.length}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {y.slots.map((slot, i) => (
              <MonthPlate
                key={slot.key}
                slot={slot}
                index={i}
                url={
                  slot.flower?.image_path
                    ? urls?.get(slot.flower.image_path)
                    : undefined
                }
                editing={editing && canUpload}
                onPick={(file) => setCropping({ month: slot.key, file })}
                onOpen={() => slot.flower && setDetail(slot.flower)}
              />
            ))}
          </div>
        </section>
      ))}

      {cropping && (
        <SquareCropper
          file={cropping.file}
          confirmLabel="Set it down"
          onCancel={() => setCropping(null)}
          onCropped={(blob) => {
            const { month } = cropping;
            setCropping(null);
            save(month, blob);
          }}
        />
      )}

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.occasion_date.slice(0, 7) : undefined}
        headerAction={
          detail && canUpload ? (
            <IconButton
              label="Remove"
              className="h-9 w-9"
              onClick={() => {
                del.mutate({ id: detail.id, imagePath: detail.image_path });
                setDetail(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.image_path && urls?.get(detail.image_path) && (
              <img
                src={urls.get(detail.image_path)}
                alt=""
                className="w-full rounded-lg"
              />
            )}
            {detail.note && (
              <p className="font-display text-lg italic text-fg">
                {detail.note}
              </p>
            )}
          </div>
        )}
      </Sheet>

      {editing && canUpload && (
        <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
          <p className="font-sans text-xs text-muted">
            A note to go with the next one you add:
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="optional…"
          />
        </div>
      )}
    </div>
  );
}

/** One month: a square polaroid whose caption is the month itself. */
function MonthPlate({
  slot,
  index,
  url,
  editing,
  onPick,
  onOpen,
}: {
  slot: MonthSlot;
  index: number;
  url?: string;
  editing: boolean;
  onPick: (file: File) => void;
  onOpen: () => void;
}) {
  const caption = (
    <span className="mt-1.5 block truncate text-center font-sans text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-brown/80">
      {slot.label}
    </span>
  );

  // Filled, and we're just looking → tap to see it big.
  if (slot.flower && !editing) {
    return (
      <button
        type="button"
        onClick={onOpen}
        style={{ '--i': index } as React.CSSProperties}
        className="flower-bloom marble lift-press block w-full rounded-md p-1.5 pb-2 shadow-loge"
      >
        <span className="block aspect-square w-full overflow-hidden rounded-sm bg-brown">
          {url && (
            <img
              src={url}
              alt={slot.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
        </span>
        {caption}
      </button>
    );
  }

  // Editing → every slot becomes a picker, filled or not.
  return (
    <FilePickerButton
      onPick={onPick}
      className={cn(
        'flex-col gap-0 border-0 p-1.5 pb-2 shadow-loge',
        slot.flower ? 'marble' : 'bg-surface-2'
      )}
    >
      <span
        className={cn(
          'flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm',
          slot.flower ? 'bg-brown' : 'bg-[rgba(255,255,255,0.04)]'
        )}
      >
        {slot.flower && url ? (
          <span className="relative block h-full w-full">
            <img
              src={url}
              alt={slot.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <ImagePlus className="h-4 w-4 text-white" />
            </span>
          </span>
        ) : (
          <Plus className="h-4 w-4 text-gold/60" />
        )}
      </span>
      <span
        className={cn(
          'mt-1.5 block w-full truncate text-center font-sans text-[0.55rem] font-semibold uppercase tracking-[0.14em]',
          slot.flower ? 'text-brown/80' : 'text-muted'
        )}
      >
        {slot.label}
      </span>
    </FilePickerButton>
  );
}

import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, usePrefetchImages, useSignedUrls } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Empty,
  FilePickerButton,
  IconButton,
  PolaroidPlate,
  Sheet,
  Skeleton,
  SquareCropper,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useFlowers } from '../api/flowers.queries';
import { useDeleteFlower, useUpsertFlower } from '../api/flowers.mutations';
import { groupByYear, type MonthSlot } from '../lib/months';
import type { Flower } from '../types';

/**
 * A bouquet for every month, three across, each on its own instant photo with
 * the month printed on the chin.
 *
 * Looking mode shows only the months that have one — a grid of empty frames is
 * a list of things you didn't do. Edit mode opens every month from June 2025 to
 * the end of the currently open year so she can tap the one she likes.
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
  usePrefetchImages(urls?.values());

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
      { month, blob },
      {
        onSuccess: () => toast.success('Bouquet set down 💐'),
        onError: (e) => toast.error(e.message),
      }
    );

  if (isLoading) {
    return (
      <div className="curtain-reveal space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full" rounded="md" />
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
                {y.filled}/{y.total}
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
        {detail?.image_path && urls?.get(detail.image_path) && (
          <img
            src={urls.get(detail.image_path)}
            alt=""
            className="w-full rounded-lg"
          />
        )}
      </Sheet>
    </div>
  );
}

/** One month, on instant film. Same stock as the daily photo, three across. */
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
  const photo = url ? (
    <img
      src={url}
      alt={slot.label}
      decoding="async"
      className="h-full w-full object-cover"
    />
  ) : null;

  // Just looking → tap the plate to see the whole photo.
  if (!editing) {
    return (
      <PolaroidPlate
        size="sm"
        caption={slot.label}
        onClick={onOpen}
        label={slot.label}
        className="flower-bloom"
        style={{ '--i': index } as React.CSSProperties}
      >
        {photo}
      </PolaroidPlate>
    );
  }

  // Editing → the same plate, but tapping it opens the picker. Identical
  // geometry to the reading mode, so nothing shifts when you toggle.
  return (
    <FilePickerButton bare onPick={onPick}>
      <PolaroidPlate size="sm" caption={slot.label} className="w-full">
        <span className="relative block h-full w-full">
          {photo}
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              // An empty month is unexposed film — pale, not a dark hole. The
              // tone has to be OPAQUE: the plate's window is brown underneath,
              // so a translucent brown tint just reads as more brown.
              slot.flower
                ? 'bg-black/35 text-white'
                : 'bg-[#ded2c2] text-brown/45'
            )}
          >
            <Plus className="h-5 w-5" />
          </span>
        </span>
      </PolaroidPlate>
    </FilePickerButton>
  );
}

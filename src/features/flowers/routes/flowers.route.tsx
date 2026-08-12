import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { BUCKETS, usePrefetchImages, useSignedUrls } from '@kernel/storage';
import { cn } from '@kernel/lib';
import {
  Empty,
  FilePickerButton,
  IconButton,
  PhotoViewer,
  PolaroidPlate,
  Skeleton,
  SquareCropper,
  toast,
  useTopBarAction,
  type ViewerPhoto,
} from '@kernel/ui';
import { useFlowers } from '../api/flowers.queries';
import { useDeleteFlower, useUpsertFlower } from '../api/flowers.mutations';
import { groupByYear, type MonthSlot } from '../lib/months';

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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Her, or him while he still has the admin flag. Mirrors can_upload_flowers()
  // in the database, which is what actually enforces it.
  const canUpload = self?.role === 'b' || !!self?.is_admin;

  const years = useMemo(
    () => groupByYear(flowers ?? [], { editing: editing && canUpload }),
    [flowers, editing, canUpload]
  );

  const paths = useMemo(
    () => (flowers ?? []).map((f) => f.image_path),
    [flowers]
  );
  const { data: urls } = useSignedUrls(BUCKETS.flowers, paths);
  const { data: fullUrls } = useSignedUrls(BUCKETS.flowers, paths, {
    proxy: false,
  });
  usePrefetchImages(urls?.values());

  // Newest first, so paging in the viewer matches the order on the page.
  const viewable: ViewerPhoto[] = useMemo(
    () =>
      [...(flowers ?? [])]
        .sort((a, b) => (a.occasion_date < b.occasion_date ? 1 : -1))
        .filter((f) => f.image_path)
        .map((f) => ({
          id: f.id,
          previewUrl: urls?.get(f.image_path!),
          fullUrl: fullUrls?.get(f.image_path!),
          eyebrow: DateTime.fromISO(f.occasion_date).toFormat('LLLL yyyy'),
          fileName: `flowers-${f.occasion_date.slice(0, 7)}.jpg`,
        })),
    [flowers, urls, fullUrls]
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
                onDelete={
                  slot.flower
                    ? () =>
                        del.mutate({
                          id: slot.flower!.id,
                          imagePath: slot.flower!.image_path,
                        })
                    : undefined
                }
                onOpen={() => {
                  const at = viewable.findIndex(
                    (v) => v.id === slot.flower?.id
                  );
                  if (at >= 0) setViewerIndex(at);
                }}
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

      {/* The same lightbox as the daily photo: pinch, swipe between months,
          pull down to put it back. A bottom sheet could do none of that. */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={viewable}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
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
  onDelete,
}: {
  slot: MonthSlot;
  index: number;
  url?: string;
  editing: boolean;
  onPick: (file: File) => void;
  onOpen: () => void;
  /** Only present while editing a month that actually holds a bouquet. */
  onDelete?: () => void;
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
    // The × sits OUTSIDE the picker: a button inside a button is invalid, and
    // taps would land on whichever won.
    <div className="relative">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${slot.label}`}
          className="lift-press absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-gold shadow-catch"
        >
          <X className="h-3 w-3" />
        </button>
      )}
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
    </div>
  );
}

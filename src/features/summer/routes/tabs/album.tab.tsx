import { useState, type CSSProperties } from 'react';
import { Camera } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { Button, CameraCapture, Empty, toast } from '@kernel/ui';
import { useSummerPhotos } from '../../api/summer.queries';
import { useAddPhoto, useDeletePhoto } from '../../api/summer.mutations';
import { SummerPhoto } from '../../components/summer-photo';
import type { CountryFilter, Trip } from '../../types';

export function AlbumTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_photos', qk.trips.photos(trip.id), { enabled: true });
  const { data: photos } = useSummerPhotos(trip.id);
  const addPhoto = useAddPhoto();
  const delPhoto = useDeletePhoto();
  const [cam, setCam] = useState(false);

  const list = (photos ?? []).filter(
    (p) => country === 'all' || p.country === country
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Postcards</p>
        <Button size="sm" onClick={() => setCam(true)}>
          <Camera size={15} /> Photo
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty icon="📸" title="No postcards yet" />
      ) : (
        <div className="curtain-stagger grid grid-cols-3 gap-2">
          {list.map((p, i) => (
            <div
              key={p.id}
              className="group relative"
              style={{ '--i': i } as CSSProperties}
            >
              <div className="overflow-hidden rounded-lg bg-surface-2">
                <SummerPhoto
                  path={p.image_path}
                  className="aspect-square w-full"
                />
              </div>
              <button
                type="button"
                aria-label="Delete photo"
                onClick={() => delPhoto.mutate({ id: p.id, tripId: trip.id })}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-bg/70 font-sans text-sm text-fg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {cam && (
        <CameraCapture
          facingMode="environment"
          onCapture={(blob) => {
            setCam(false);
            addPhoto.mutate(
              {
                tripId: trip.id,
                blob,
                country: country === 'all' ? null : country,
              },
              { onSuccess: () => toast.success('Added 📸') }
            );
          }}
          onCancel={() => setCam(false)}
        />
      )}
    </section>
  );
}

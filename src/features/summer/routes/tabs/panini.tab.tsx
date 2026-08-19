// Deliberate cross-feature reuse: Summer Panini and Pololini are two views of
// ONE photo-book engine (a product decision). The engine lives in the album
// feature and is consumed here.
// Straight at the module, not through the album barrel: the barrel is on the
// boot path, and importing the engine through it put the whole flip book there
// too — 90 KB parsed on every launch for a screen most launches never open.
// eslint-disable-next-line boundaries/element-types
import { PhotoBook3D } from '@features/album/components/photo-book/photo-book-3d';
import type { Trip } from '../../types';

/** Summer Panini — the trip's own 3D photo-book (same engine as Pololini). */
export function PaniniTab({ trip }: { trip: Trip }) {
  return (
    <section className="space-y-3">
      <PhotoBook3D scope="trip" tripId={trip.id} title="Summer Panini" />
    </section>
  );
}

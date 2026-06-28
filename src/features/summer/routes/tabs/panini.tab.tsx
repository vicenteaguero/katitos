// Deliberate cross-feature reuse: Summer Panini and Pololini are two views of
// ONE photo-book engine (a product decision). The engine lives in the album
// feature and is consumed here.
// eslint-disable-next-line boundaries/element-types
import { PhotoBook3D } from '@features/album';
import type { Trip } from '../../types';

/** Summer Panini — the trip's own 3D photo-book (same engine as Pololini). */
export function PaniniTab({ trip }: { trip: Trip }) {
  return (
    <section className="space-y-3">
      <p className="eyebrow">Summer Panini</p>
      <PhotoBook3D scope="trip" tripId={trip.id} title="Summer Panini" />
    </section>
  );
}

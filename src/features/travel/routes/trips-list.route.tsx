import { useState } from 'react';
import { Plus } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import {
  Empty,
  Fab,
  LoadingScreen,
  PageHeader,
  Sheet,
  toast,
} from '@kernel/ui';
import { useTrips } from '../api/travel.queries';
import { useDeleteTrip } from '../api/travel.mutations';
import { TripCard } from '../components/trip-card';
import { TripForm } from '../components/trip-form';
import type { Trip } from '../types';

export function TripsListRoute() {
  useTableSync('trips', qk.trips.list());
  const { data, isLoading, isError } = useTrips();
  const del = useDeleteTrip();
  const [creating, setCreating] = useState(false);

  const handleDelete = (trip: Trip) => {
    if (confirm(`Delete "${trip.name}"?`)) {
      del.mutate(trip.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="curtain-reveal">
      <p className="eyebrow mb-3">The Travel Folio</p>
      <PageHeader
        title="Travel"
        subtitle="Trips and journeys together — where to next?"
      />

      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      ) : !data || data.length === 0 ? (
        <Empty
          icon="✈️"
          title="No trips yet"
          hint="Tap + to start planning your next adventure."
        />
      ) : (
        <div className="curtain-stagger space-y-5">
          {data.map((trip, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={i}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Fab label="New trip" onClick={() => setCreating(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New trip"
      >
        <TripForm onDone={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}

import { lazy, Suspense, useState } from 'react';
import { List, Map as MapIcon, Plus, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Button, Card, IconButton, Sheet } from '@kernel/ui';
import {
  useSummerItems,
  useSummerLegs,
  useSummerReviews,
} from '../../api/summer.queries';
import { useAddItem, useDeleteItem } from '../../api/summer.mutations';
import { CitySearch, type CityHit } from '../../components/city-search';
import type { MapLeg, MapPin } from '../../components/summer-map';
import { COUNTRIES, type CountryFilter, type Trip } from '../../types';

const SummerMap = lazy(() =>
  import('../../components/summer-map').then((m) => ({ default: m.SummerMap }))
);

const flagOf = (code: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.flag ?? '📍';

export function MapTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_items', qk.trips.items(trip.id), { enabled: true });
  useTableSync('trip_legs', qk.trips.legs(trip.id), { enabled: true });
  useTableSync('trip_reviews', qk.trips.reviews(trip.id), { enabled: true });
  const { data: items } = useSummerItems(trip.id);
  const { data: reviews } = useSummerReviews(trip.id);
  const { data: legs } = useSummerLegs(trip.id);
  const addItem = useAddItem();
  const delItem = useDeleteItem();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [adding, setAdding] = useState(false);
  const [placeCountry, setPlaceCountry] = useState<'TR' | 'GE' | ''>('');

  const inCountry = (c: string | null) => country === 'all' || c === country;

  const placeItems = (items ?? []).filter(
    (it) => it.lat != null && it.lng != null && inCountry(it.country)
  );

  const pins: MapPin[] = [
    ...placeItems.map((it) => ({
      lat: it.lat as number,
      lng: it.lng as number,
      title: it.title,
      tone: 'place' as const,
    })),
    ...(reviews ?? [])
      .filter((r) => r.lat != null && r.lng != null && inCountry(r.country))
      .map((r) => ({
        lat: r.lat as number,
        lng: r.lng as number,
        title: `★ ${r.name}`,
        tone: 'review' as const,
      })),
  ];

  const mapLegs: MapLeg[] = (legs ?? [])
    .filter(
      (l) =>
        l.from_lat != null &&
        l.from_lng != null &&
        l.to_lat != null &&
        l.to_lng != null
    )
    .map((l) => ({
      fromLat: l.from_lat as number,
      fromLng: l.from_lng as number,
      toLat: l.to_lat as number,
      toLng: l.to_lng as number,
      mode: l.mode,
      country: l.country as 'TR' | 'GE' | null,
      label: `${l.from_label} → ${l.to_label}`,
    }));

  const addPlace = (hit: CityHit) => {
    addItem.mutate(
      {
        tripId: trip.id,
        kind: 'place',
        title: hit.name,
        description: null,
        link: null,
        country:
          hit.country || placeCountry || (country === 'all' ? null : country),
        day: null,
        lat: hit.lat,
        lng: hit.lng,
      },
      { onSuccess: () => setAdding(false) }
    );
  };

  return (
    <section className="space-y-3">
      {/* Toolbar — switch list/map, add a place. No titles. */}
      <div className="flex items-center gap-2">
        <IconButton
          label={mode === 'map' ? 'List view' : 'Map view'}
          onClick={() => setMode((m) => (m === 'map' ? 'list' : 'map'))}
          className="bg-surface-2"
        >
          {mode === 'map' ? (
            <List className="h-5 w-5" />
          ) : (
            <MapIcon className="h-5 w-5" />
          )}
        </IconButton>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add place
        </Button>
      </div>

      {mode === 'map' ? (
        <>
          <Suspense
            fallback={
              <div className="h-[440px] w-full animate-pulse rounded-lg bg-surface-2" />
            }
          >
            <SummerMap
              pins={pins}
              legs={mapLegs}
              className="h-[440px] w-full overflow-hidden rounded-lg"
            />
          </Suspense>
          <div className="space-y-1.5">
            {(legs ?? []).map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 font-sans text-xs text-muted"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background:
                      l.country === 'TR'
                        ? '#b5633a'
                        : l.country === 'GE'
                          ? '#6e1423'
                          : '#c9a24b',
                  }}
                />
                <span className="font-semibold text-fg">
                  {l.from_label} → {l.to_label}
                </span>
                <span className="capitalize">· {l.mode}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {placeItems.length === 0 ? (
            <p className="py-10 text-center font-sans text-sm text-muted">
              No places yet — add one.
            </p>
          ) : (
            placeItems.map((it) => (
              <Card key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-lg leading-none">
                  {flagOf(it.country)}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                  {it.title}
                </span>
                <IconButton
                  label="Remove"
                  onClick={() => delItem.mutate({ id: it.id, tripId: trip.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Minimal add — flags + a search, nothing else. */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a place">
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-surface-2 p-1">
              {COUNTRIES.map((co) => {
                const active = placeCountry === co.code;
                return (
                  <button
                    key={co.code}
                    type="button"
                    onClick={() =>
                      setPlaceCountry(active ? '' : (co.code as 'TR' | 'GE'))
                    }
                    className={cn(
                      'lift-press rounded-full px-5 py-1.5 text-xl leading-none transition',
                      active ? 'bg-accent' : 'opacity-45'
                    )}
                  >
                    {co.flag}
                  </button>
                );
              })}
            </div>
          </div>
          <CitySearch onPick={addPlace} />
        </div>
      </Sheet>
    </section>
  );
}

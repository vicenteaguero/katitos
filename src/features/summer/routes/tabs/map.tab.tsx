import { lazy, Suspense } from 'react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import {
  useSummerItems,
  useSummerLegs,
  useSummerReviews,
} from '../../api/summer.queries';
import type { MapLeg, MapPin } from '../../components/summer-map';
import { COUNTRIES, type CountryFilter, type Trip } from '../../types';

const SummerMap = lazy(() =>
  import('../../components/summer-map').then((m) => ({ default: m.SummerMap }))
);

export function MapTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_legs', qk.trips.legs(trip.id), { enabled: true });
  useTableSync('trip_reviews', qk.trips.reviews(trip.id), { enabled: true });
  const { data: items } = useSummerItems(trip.id);
  const { data: reviews } = useSummerReviews(trip.id);
  const { data: legs } = useSummerLegs(trip.id);

  const inCountry = (c: string | null) => country === 'all' || c === country;

  const pins: MapPin[] = [
    ...(items ?? [])
      .filter((it) => it.lat != null && it.lng != null && inCountry(it.country))
      .map((it) => ({
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

  return (
    <section className="space-y-3">
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
      {/* Route legend. */}
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
        <p className="pt-1 text-center font-sans text-[0.7rem] text-muted">
          {COUNTRIES.map((c) => `${c.flag} ${c.label}`).join('  ·  ')}
        </p>
      </div>
    </section>
  );
}

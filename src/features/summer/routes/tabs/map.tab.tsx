import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { List, Map as MapIcon, Star, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Card, IconButton, Sheet, useTopBarAction } from '@kernel/ui';
import {
  useSummerItems,
  useSummerLegs,
  useSummerReviews,
} from '../../api/summer.queries';
import {
  useAddItem,
  useDeleteItem,
  useDeleteLeg,
  useDeleteReview,
} from '../../api/summer.mutations';
import { CitySearch, type CityHit } from '../../components/city-search';
import { TopAdd } from '../../components/top-add';
import type { MapLeg, MapPin } from '../../components/summer-map';
import { COUNTRIES, type CountryFilter, type Trip } from '../../types';

const SummerMap = lazy(() =>
  import('../../components/summer-map').then((m) => ({ default: m.SummerMap }))
);

const flagOf = (code: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.flag ?? '📍';
const legDot = (c: string | null) =>
  c === 'TR' ? '#b5633a' : c === 'GE' ? '#6e1423' : '#c9a24b';

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
  const delReview = useDeleteReview();
  const delLeg = useDeleteLeg();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [adding, setAdding] = useState(false);
  const [placeCountry, setPlaceCountry] = useState<'TR' | 'GE' | ''>('');

  useTopBarAction(<TopAdd onClick={() => setAdding(true)} />, []);

  // Size the map to fill from its top down to the bottom of the scroll area, so
  // the Route tab never scrolls. Re-measures on viewport/orientation changes.
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [mapH, setMapH] = useState(460);
  useLayoutEffect(() => {
    if (mode !== 'map') return;
    const compute = () => {
      const el = mapWrapRef.current;
      const main = el?.closest('main');
      if (!el || !main) return;
      const padB = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const avail =
        main.getBoundingClientRect().bottom -
        padB -
        el.getBoundingClientRect().top;
      setMapH(Math.max(260, Math.floor(avail)));
    };
    compute();
    const main = mapWrapRef.current?.closest('main');
    const ro = main ? new ResizeObserver(compute) : null;
    if (main && ro) ro.observe(main);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, [mode]);

  const inCountry = (c: string | null) => country === 'all' || c === country;

  const placeItems = (items ?? []).filter(
    (it) => it.lat != null && it.lng != null && inCountry(it.country)
  );
  const reviewPins = (reviews ?? []).filter(
    (r) => r.lat != null && r.lng != null && inCountry(r.country)
  );
  const routeLegs = legs ?? [];

  const pins: MapPin[] = [
    ...placeItems.map((it) => ({
      lat: it.lat as number,
      lng: it.lng as number,
      title: it.title,
      tone: 'place' as const,
    })),
    ...reviewPins.map((r) => ({
      lat: r.lat as number,
      lng: r.lng as number,
      title: `★ ${r.name}`,
      tone: 'review' as const,
    })),
  ];

  const mapLegs: MapLeg[] = routeLegs
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

  const listEmpty =
    routeLegs.length === 0 &&
    placeItems.length === 0 &&
    reviewPins.length === 0;

  return (
    <section className="space-y-3">
      {/* Toolbar — switch list/map (Add lives in the top bar). */}
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
        <span className="font-sans text-xs uppercase tracking-[0.14em] text-muted">
          {mode === 'map' ? 'Map' : 'List'}
        </span>
      </div>

      {mode === 'map' ? (
        <div
          ref={mapWrapRef}
          style={{ height: mapH }}
          className="w-full overflow-hidden rounded-lg"
        >
          <Suspense
            fallback={
              <div className="h-full w-full animate-pulse bg-surface-2" />
            }
          >
            <SummerMap pins={pins} legs={mapLegs} className="h-full w-full" />
          </Suspense>
        </div>
      ) : listEmpty ? (
        <p className="py-10 text-center font-sans text-sm text-muted">
          Nothing here yet — add a place.
        </p>
      ) : (
        <div className="space-y-2">
          {/* The route legs — removable. */}
          {routeLegs.map((l) => (
            <Card key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: legDot(l.country) }}
              />
              <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                {l.from_label} → {l.to_label}
              </span>
              <span className="shrink-0 font-sans text-xs capitalize text-muted">
                {l.mode}
              </span>
              <IconButton
                label="Remove"
                onClick={() => delLeg.mutate({ id: l.id, tripId: trip.id })}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </Card>
          ))}
          {/* Places you added (removable). */}
          {placeItems.map((it) => (
            <Card key={it.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-lg leading-none">{flagOf(it.country)}</span>
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
          ))}
          {/* Reviews that are pinned (removable). */}
          {reviewPins.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <Star className="h-4 w-4 shrink-0 fill-gold text-gold" />
              <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                {r.name}
              </span>
              <span className="text-base leading-none">
                {flagOf(r.country)}
              </span>
              <IconButton
                label="Remove"
                onClick={() => delReview.mutate({ id: r.id, tripId: trip.id })}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </Card>
          ))}
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

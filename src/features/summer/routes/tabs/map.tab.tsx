import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { GripVertical, List, Map as MapIcon, Star, Trash2 } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn, greatCircle } from '@kernel/lib';
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
  useUpdateItem,
} from '../../api/summer.mutations';
import { CitySearch, type CityHit } from '../../components/city-search';
import { useRoadRoutes } from '../../api/road-route';
import { TopAdd } from '../../components/top-add';
import type { MapLeg, MapPin } from '../../components/summer-map';
import { buildRoute } from '../../lib/map-route';
import {
  COUNTRIES,
  type CountryFilter,
  type Trip,
  type TripItem,
} from '../../types';

const SummerMap = lazy(() =>
  import('../../components/summer-map').then((m) => ({ default: m.SummerMap }))
);

const flagOf = (code: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.flag ?? '📍';
const legDot = (c: string | null) =>
  c === 'TR' ? '#b5633a' : c === 'GE' ? '#6e1423' : '#c9a24b';

/** Compact remove control — small, so a list row isn't floored at a 44px box. */
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={onClick}
      className="lift-press -mr-0.5 shrink-0 rounded p-1 text-muted outline-none active:text-accent"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

const CITY_ROW_H = 46; // approx row height (incl. the space-y gap)

/** The ordered cities — drag a row by its handle to reorder (no arrows). */
function CityRoute({
  cities,
  onReorder,
  onRemove,
}: {
  cities: TripItem[];
  onReorder: (writes: { id: string; position: number }[]) => void;
  onRemove: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dy, setDy] = useState(0);

  const bind = useDrag(
    ({ args, first, last, movement: [, my] }) => {
      const [id, index] = args as [string, number];
      if (first) setDragId(id);
      setDy(my);
      if (last) {
        const shift = Math.round(my / CITY_ROW_H);
        const target = Math.max(0, Math.min(cities.length - 1, index + shift));
        setDragId(null);
        setDy(0);
        if (target !== index) {
          const order = [...cities];
          const [moved] = order.splice(index, 1);
          order.splice(target, 0, moved);
          onReorder(
            order
              .map((c, idx) => ({ id: c.id, position: idx }))
              .filter((_, idx) => order[idx].position !== idx)
          );
        }
      }
    },
    { axis: 'y', filterTaps: true, pointer: { touch: true } }
  );

  return (
    <div className="space-y-1.5">
      <p className="eyebrow px-0.5">Route · drag to reorder</p>
      {cities.map((it, i) => {
        const dragging = dragId === it.id;
        return (
          <Card
            key={it.id}
            className="flex items-center gap-2 px-2.5 py-1.5"
            style={{
              position: 'relative',
              zIndex: dragging ? 20 : 1,
              transform: dragging
                ? `translateY(${dy}px) scale(1.02)`
                : undefined,
              boxShadow: dragging
                ? '0 12px 26px -10px rgba(0,0,0,0.65)'
                : undefined,
              transition: dragging ? 'none' : 'transform 120ms ease',
            }}
          >
            <button
              type="button"
              aria-label="Drag to reorder"
              {...bind(it.id, i)}
              className="shrink-0 cursor-grab touch-none text-muted active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="w-4 shrink-0 text-center font-display text-sm text-copper">
              {i + 1}
            </span>
            <span className="text-base leading-none">{flagOf(it.country)}</span>
            <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
              {it.title}
            </span>
            <RemoveBtn onClick={() => onRemove(it.id)} />
          </Card>
        );
      })}
    </div>
  );
}

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
  const updateItem = useUpdateItem();
  const delItem = useDeleteItem();
  const delReview = useDeleteReview();
  const delLeg = useDeleteLeg();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [adding, setAdding] = useState(false);
  const [placeCountry, setPlaceCountry] = useState<'TR' | 'GE' | ''>('');
  const [placeKind, setPlaceKind] = useState<'city' | 'place'>('city');
  const [placeMode, setPlaceMode] = useState('car');

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <IconButton
        label={mode === 'map' ? 'List view' : 'Map view'}
        onClick={() => setMode((m) => (m === 'map' ? 'list' : 'map'))}
        className="h-9 w-9 bg-surface-2"
      >
        {mode === 'map' ? (
          <List className="h-4 w-4" />
        ) : (
          <MapIcon className="h-4 w-4" />
        )}
      </IconButton>
      <TopAdd onClick={() => setAdding(true)} />
    </div>,
    [mode]
  );

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

  const mappable = (items ?? []).filter(
    (it) => it.lat != null && it.lng != null && inCountry(it.country)
  );
  // Cities (already position-ordered by the query) drive the route line; every
  // other pinned item is a plain place with no connecting line.
  const cityItems = mappable.filter((it) => it.kind === 'city');
  const placeItems = mappable.filter((it) => it.kind !== 'city');
  const reviewPins = (reviews ?? []).filter(
    (r) => r.lat != null && r.lng != null && inCountry(r.country)
  );
  const seededLegs = legs ?? [];

  const pins: MapPin[] = [
    ...cityItems.map((it) => ({
      lat: it.lat as number,
      lng: it.lng as number,
      title: it.title,
      tone: 'city' as const,
    })),
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

  // Flights (mode='flight') draw as geodesic arcs; every other leg follows the
  // roads. Cities (2+) drive the ground route, else the seeded legs are it.
  const flightLegs = seededLegs.filter(
    (l) =>
      l.mode === 'flight' &&
      l.from_lat != null &&
      l.from_lng != null &&
      l.to_lat != null &&
      l.to_lng != null
  );
  const groundRoute = buildRoute(
    cityItems,
    seededLegs.filter((l) => l.mode !== 'flight')
  );
  const road = useRoadRoutes(
    groundRoute.map((l) => ({
      from: { lat: l.fromLat, lng: l.fromLng },
      to: { lat: l.toLat, lng: l.toLng },
    }))
  );
  const routeLegs: MapLeg[] = [
    ...groundRoute.map((l, i) =>
      l.mode === 'flight'
        ? {
            ...l,
            kind: 'flight' as const,
            path: greatCircle(
              { lat: l.fromLat, lng: l.fromLng },
              { lat: l.toLat, lng: l.toLng },
              48
            ),
          }
        : { ...l, kind: 'road' as const, path: road.data?.[i] ?? undefined }
    ),
    ...flightLegs.map((l) => ({
      fromLat: l.from_lat as number,
      fromLng: l.from_lng as number,
      toLat: l.to_lat as number,
      toLng: l.to_lng as number,
      mode: 'flight',
      country: l.country as 'TR' | 'GE' | null,
      label: `${l.from_label} → ${l.to_label}`,
      kind: 'flight' as const,
      path: greatCircle(
        { lat: l.from_lat as number, lng: l.from_lng as number },
        { lat: l.to_lat as number, lng: l.to_lng as number },
        48
      ),
    })),
  ];

  const addPlace = (hit: CityHit) => {
    addItem.mutate(
      {
        tripId: trip.id,
        kind: placeKind,
        title: hit.name,
        description: null,
        link: null,
        country:
          hit.country || placeCountry || (country === 'all' ? null : country),
        day: null,
        lat: hit.lat,
        lng: hit.lng,
        position: placeKind === 'city' ? cityItems.length : 0,
        mode: placeKind === 'city' ? placeMode : null,
      },
      { onSuccess: () => setAdding(false) }
    );
  };

  // Persist a drag-reorder (the minimal {id, position} writes).
  const reorderCities = (writes: { id: string; position: number }[]) => {
    for (const w of writes)
      updateItem.mutate({
        id: w.id,
        tripId: trip.id,
        patch: { position: w.position },
      });
  };

  // A country must be chosen (here or via the top filter) before searching.
  const effCountry = placeCountry || (country !== 'all' ? country : '');

  const listEmpty =
    routeLegs.length === 0 &&
    cityItems.length === 0 &&
    placeItems.length === 0 &&
    reviewPins.length === 0;

  return (
    <section className="space-y-3">
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
            <SummerMap pins={pins} legs={routeLegs} className="h-full w-full" />
          </Suspense>
        </div>
      ) : listEmpty ? (
        <p className="py-10 text-center font-sans text-sm text-muted">
          Nothing here yet — add a city or a place.
        </p>
      ) : (
        <div className="space-y-2">
          {/* The route — drag a row by its handle to reorder. */}
          {cityItems.length > 0 && (
            <CityRoute
              cities={cityItems}
              onReorder={reorderCities}
              onRemove={(id) => delItem.mutate({ id, tripId: trip.id })}
            />
          )}

          {/* Seeded route legs — only while there's no city route yet. */}
          {cityItems.length < 2 &&
            seededLegs.map((l) => (
              <Card
                key={l.id}
                className="flex items-center gap-2 px-2.5 py-1.5"
              >
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
                <RemoveBtn
                  onClick={() => delLeg.mutate({ id: l.id, tripId: trip.id })}
                />
              </Card>
            ))}

          {/* Places — plain pins, no line. */}
          {placeItems.length > 0 && (
            <div className="space-y-1.5">
              {cityItems.length > 0 && <p className="eyebrow px-0.5">Places</p>}
              {placeItems.map((it) => (
                <Card
                  key={it.id}
                  className="flex items-center gap-2 px-2.5 py-1.5"
                >
                  <span className="text-lg leading-none">
                    {flagOf(it.country)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                    {it.title}
                  </span>
                  <RemoveBtn
                    onClick={() =>
                      delItem.mutate({ id: it.id, tripId: trip.id })
                    }
                  />
                </Card>
              ))}
            </div>
          )}

          {/* Pinned reviews. */}
          {reviewPins.map((r) => (
            <Card key={r.id} className="flex items-center gap-2 px-2.5 py-1.5">
              <Star className="h-4 w-4 shrink-0 fill-gold text-gold" />
              <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                {r.name}
              </span>
              <span className="text-base leading-none">
                {flagOf(r.country)}
              </span>
              <RemoveBtn
                onClick={() => delReview.mutate({ id: r.id, tripId: trip.id })}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Add — City vs place, a flag, a search. */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add to map">
        <div className="space-y-3">
          {/* City (joins the route) vs place (plain pin). */}
          <div className="flex gap-1.5">
            {(
              [
                ['city', 'City'],
                ['place', 'Place'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPlaceKind(val)}
                className={cn(
                  'lift-press flex-1 rounded-full py-1.5 font-sans text-xs font-semibold outline-none',
                  placeKind === val
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface-2 text-muted'
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
          {/* How you travel onward — colours the route hop. Cities only. */}
          {placeKind === 'city' && (
            <div className="flex gap-1.5">
              {(
                [
                  ['car', '🚗 Car'],
                  ['bus', '🚌 Bus'],
                  ['flight', '✈️ Flight'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPlaceMode(val)}
                  className={cn(
                    'lift-press flex-1 rounded-full py-1.5 font-sans text-xs font-semibold outline-none',
                    placeMode === val
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-2 text-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <CitySearch
            onPick={addPlace}
            disabled={!effCountry}
            hint="Pick a country first ☝️"
          />
          <p className="px-1 text-center font-sans text-xs text-muted">
            {placeKind === 'city'
              ? 'Cities link into your route — the line is coloured by how you travel.'
              : 'Places drop a plain pin — no route line.'}
          </p>
        </div>
      </Sheet>
    </section>
  );
}

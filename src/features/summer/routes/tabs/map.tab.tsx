import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  List,
  Map as MapIcon,
  Star,
  Trash2,
} from 'lucide-react';
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
  useUpdateItem,
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

  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <IconButton
        label={mode === 'map' ? 'List view' : 'Map view'}
        onClick={() => setMode((m) => (m === 'map' ? 'list' : 'map'))}
        className="bg-surface-2"
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

  // The route: connect the cities in order. Until there are 2+ cities, fall back
  // to the seeded legs so the original Istanbul→…→Tbilisi line never vanishes.
  const routeLegs: MapLeg[] =
    cityItems.length >= 2
      ? cityItems.slice(0, -1).map((c, i) => ({
          fromLat: c.lat as number,
          fromLng: c.lng as number,
          toLat: cityItems[i + 1].lat as number,
          toLng: cityItems[i + 1].lng as number,
          mode: 'car',
          country: c.country as 'TR' | 'GE' | null,
          label: `${c.title} → ${cityItems[i + 1].title}`,
        }))
      : seededLegs
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
      },
      { onSuccess: () => setAdding(false) }
    );
  };

  // Reorder a city up/down — normalise every city's position to its new index
  // so the drawn route and the list always agree.
  const moveCity = (i: number, dir: 1 | -1) => {
    const j = i + dir;
    if (j < 0 || j >= cityItems.length) return;
    const order = [...cityItems];
    [order[i], order[j]] = [order[j], order[i]];
    order.forEach((c, idx) => {
      if (c.position !== idx)
        updateItem.mutate({
          id: c.id,
          tripId: trip.id,
          patch: { position: idx },
        });
    });
  };

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
          {/* The route — ordered cities (reorder + remove). */}
          {cityItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="eyebrow px-0.5">Route</p>
              {cityItems.map((it, i) => (
                <Card
                  key={it.id}
                  className="flex items-center gap-2 px-2.5 py-1.5"
                >
                  <span className="w-4 shrink-0 text-center font-display text-sm text-copper">
                    {i + 1}
                  </span>
                  <span className="text-base leading-none">
                    {flagOf(it.country)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-base text-fg">
                    {it.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => moveCity(i, -1)}
                    className="lift-press shrink-0 rounded p-0.5 text-muted outline-none active:text-accent disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === cityItems.length - 1}
                    onClick={() => moveCity(i, 1)}
                    className="lift-press shrink-0 rounded p-0.5 text-muted outline-none active:text-accent disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <RemoveBtn
                    onClick={() =>
                      delItem.mutate({ id: it.id, tripId: trip.id })
                    }
                  />
                </Card>
              ))}
            </div>
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
          <CitySearch onPick={addPlace} />
          <p className="px-1 text-center font-sans text-xs text-muted">
            {placeKind === 'city'
              ? 'Cities link into your route in order.'
              : 'Places drop a plain pin — no route line.'}
          </p>
        </div>
      </Sheet>
    </section>
  );
}

import type { MapLeg } from '../components/summer-map';

export interface RouteCity {
  lat: number | null;
  lng: number | null;
  title: string;
  country: string | null;
}

export interface SeededLeg {
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  from_label: string;
  to_label: string;
  mode: string;
  country: string | null;
}

/**
 * The drawn route. With 2+ cities, connect them in order; otherwise fall back to
 * the seeded legs so the original Istanbul→…→Tbilisi line never vanishes before
 * any cities are tagged (prod has no seed beyond the legs created with the trip).
 */
export function buildRoute(cities: RouteCity[], seeded: SeededLeg[]): MapLeg[] {
  if (cities.length >= 2) {
    return cities.slice(0, -1).map((c, i) => ({
      fromLat: c.lat as number,
      fromLng: c.lng as number,
      toLat: cities[i + 1].lat as number,
      toLng: cities[i + 1].lng as number,
      mode: 'car',
      country: c.country as 'TR' | 'GE' | null,
      label: `${c.title} → ${cities[i + 1].title}`,
    }));
  }
  return seeded
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
}

/**
 * Move city `i` by `dir` and renormalise positions to indices — returns only the
 * minimal {id, position} writes needed so the drawn route and the list agree
 * (also self-heals any items still stuck at the default position 0).
 */
export function reorderPositions(
  list: { id: string; position: number }[],
  i: number,
  dir: 1 | -1
): { id: string; position: number }[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return [];
  const order = list.slice();
  [order[i], order[j]] = [order[j], order[i]];
  const writes: { id: string; position: number }[] = [];
  order.forEach((c, idx) => {
    if (c.position !== idx) writes.push({ id: c.id, position: idx });
  });
  return writes;
}

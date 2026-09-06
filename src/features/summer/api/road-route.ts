import { useQuery } from '@tanstack/react-query';

export interface RoutePoint {
  lat: number;
  lng: number;
}

/**
 * Road geometry between two points via the public OSRM demo server - free, no
 * key, CORS-enabled. Returns the path as `[lat, lng]` vertices (OSRM gives
 * GeoJSON `[lon, lat]`, so we flip), or `null` if it couldn't route.
 */
async function osrmRoute(
  a: RoutePoint,
  b: RoutePoint
): Promise<[number, number][] | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      code?: string;
      routes?: { geometry: { coordinates: [number, number][] } }[];
    };
    if (json.code !== 'Ok' || !json.routes?.[0]) return null;
    return json.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  } catch {
    return null;
  }
}

/**
 * Resolve the road geometry for each consecutive leg, cached forever (roads
 * don't move, and OSRM's demo asks for light, polite use). Returns an array
 * aligned to `pairs`; an entry is `null` when OSRM failed, so the caller can
 * fall back to a straight line.
 */
export function useRoadRoutes(pairs: { from: RoutePoint; to: RoutePoint }[]) {
  const key = pairs
    .map(
      (p) =>
        `${p.from.lat.toFixed(4)},${p.from.lng.toFixed(4)}>` +
        `${p.to.lat.toFixed(4)},${p.to.lng.toFixed(4)}`
    )
    .join('|');
  return useQuery({
    queryKey: ['summer', 'road', key],
    enabled: pairs.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const out: ([number, number][] | null)[] = [];
      // Sequential - a handful of legs, kept gentle on the demo server.
      for (const p of pairs) out.push(await osrmRoute(p.from, p.to));
      return out;
    },
  });
}

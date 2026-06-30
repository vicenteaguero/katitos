import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  lat: number;
  lng: number;
  title: string;
  tone?: 'place' | 'home' | 'review' | 'city';
}

export interface MapLeg {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: string;
  country?: 'TR' | 'GE' | null;
  label?: string;
  /** Full geometry (road follow / geodesic arc); falls back to a straight line. */
  path?: [number, number][];
  kind?: 'road' | 'flight';
}

const PIN_COLOR: Record<string, string> = {
  place: '#6e1423',
  home: '#2c8a5e',
  review: '#c9a24b',
  city: '#caa53f',
};

/** Each transport mode gets its own line colour. */
function legColor(mode?: string | null): string {
  switch (mode) {
    case 'bus':
      return '#c9a24b'; // gilt
    case 'train':
      return '#6e1423'; // wine
    case 'ferry':
      return '#3a9b8a'; // teal
    case 'walk':
      return '#9a8a6a'; // muted
    default:
      return '#b5633a'; // car — copper
  }
}

/** Buses + ferries get a dashed line; driven/flown legs are solid. */
function legDash(mode: string): string | undefined {
  return mode === 'bus' || mode === 'ferry' || mode === 'walk'
    ? '6 8'
    : undefined;
}

/** A small plane glyph rotated to a heading (✈ points NE, so offset by 45°). */
function planeIcon(deg: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${deg - 45}deg);font-size:15px;line-height:1;color:#6fa0ff;text-shadow:0 1px 3px rgba(0,0,0,.6)">✈</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }) as Record<string, string>
      )[c]!
  );
}

/** Leaflet/OSM map of the whole Summer arc (Istanbul→Tbilisi) — vanilla Leaflet
 *  in a ref'd div, with styled HTML pins + polyline legs (no marker assets). */
export function SummerMap({
  pins,
  legs = [],
  className,
}: {
  pins: MapPin[];
  legs?: MapLeg[];
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomSnap: 0, // fractional zoom → fitBounds lands exactly, no coarse jumps
      zoomDelta: 0.5,
    }).setView([41.4, 38.0], 6);
    // Esri NatGeo — warm topographic basemap (free, no key; tiles to z16).
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    ).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Adapt to any container height the parent computes (so the map can be sized
  // to fill the screen without a scroll). Leaflet needs invalidateSize on resize.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Route legs first (so pins sit on top). Each leg draws its real geometry
    // (road follow / geodesic arc) when present, else a straight line.
    for (const leg of legs) {
      const pts: [number, number][] =
        leg.path && leg.path.length > 1
          ? leg.path
          : [
              [leg.fromLat, leg.fromLng],
              [leg.toLat, leg.toLng],
            ];
      if (leg.kind === 'flight') {
        // Black halo under the blue, so the flight reads on the busy basemap.
        L.polyline(pts, {
          color: '#0a0306',
          weight: 6.5,
          opacity: 0.55,
          lineCap: 'round',
        }).addTo(layer);
        L.polyline(pts, {
          color: '#7cb0ff',
          weight: 3.5,
          opacity: 1,
          dashArray: '1 9',
          lineCap: 'round',
        }).addTo(layer);
        // A plane partway along, pointed along its heading.
        const m = Math.floor(pts.length / 2);
        const [aLat, aLng] = pts[Math.max(0, m - 1)];
        const [bLat, bLng] = pts[Math.min(pts.length - 1, m + 1)];
        const deg = (Math.atan2(bLng - aLng, bLat - aLat) * 180) / Math.PI;
        L.marker(pts[m], { icon: planeIcon(deg), interactive: false }).addTo(
          layer
        );
      } else {
        L.polyline(pts, {
          color: legColor(leg.mode),
          weight: 3.5,
          opacity: 0.85,
          dashArray: legDash(leg.mode),
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layer);
        // Small waypoint dots at the true endpoints.
        for (const pt of [pts[0], pts[pts.length - 1]]) {
          L.circleMarker(pt, {
            radius: 3.5,
            color: '#e4c36a',
            weight: 1.5,
            fillColor: '#1a0b13',
            fillOpacity: 1,
          }).addTo(layer);
        }
      }
    }

    const valid = pins.filter((p) => p.lat != null && p.lng != null);
    for (const p of valid) {
      const color = PIN_COLOR[p.tone ?? 'place'] ?? '#6e1423';
      // Cities are the route anchors → a larger, brighter-ringed teardrop.
      const isCity = p.tone === 'city';
      const d = isCity ? 22 : 18;
      const tipY = isCity ? 27 : 22;
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:${d}px;height:${d}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${color};border:${isCity ? 2 : 1.5}px solid ${isCity ? '#fff1c9' : '#e4c36a'};
            box-shadow:0 2px 6px rgba(0,0,0,.5)"></div></div>`,
        // The rotated teardrop's sharp tip sits ~tipY down from the icon's top —
        // anchor THERE so the point lands exactly on the lat/lng at any zoom.
        iconSize: [d, tipY],
        iconAnchor: [d / 2, tipY],
        // Open the popup ABOVE the tip, not on the point.
        popupAnchor: [0, -tipY - 2],
      });
      // Z-order: cities on top, then places, then reviews (routes sit in the
      // overlay pane, always below every marker).
      const z = p.tone === 'city' ? 2000 : p.tone === 'place' ? 1000 : 0;
      L.marker([p.lat, p.lng], { icon, zIndexOffset: z })
        .addTo(layer)
        .bindPopup(`<b>${esc(p.title)}</b>`, {
          minWidth: 120,
          autoPanPadding: [24, 24],
        });
    }

    // Frame the GROUND route + place pins (not the far-flung flight arc, which
    // would zoom the whole trip down to a speck).
    const legPts: [number, number][] = legs
      .filter((l) => l.kind !== 'flight')
      .flatMap((l) => [
        [l.fromLat, l.fromLng],
        [l.toLat, l.toLng],
      ]);
    const focus = valid.filter((p) => p.tone !== 'home');
    const framedPts: [number, number][] = [
      ...legPts,
      ...focus.map((p) => [p.lat, p.lng] as [number, number]),
    ];
    const fallback = valid.map((p) => [p.lat, p.lng] as [number, number]);
    const pts = framedPts.length > 0 ? framedPts : fallback;
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds.pad(0.2), { maxZoom: 7 });
    }
    map.invalidateSize();
  }, [pins, legs]);

  return (
    <div
      ref={elRef}
      className={className}
      style={{ background: '#15201a' }}
      aria-label="Trip map"
    />
  );
}

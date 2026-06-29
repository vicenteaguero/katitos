import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  lat: number;
  lng: number;
  title: string;
  tone?: 'place' | 'home' | 'review';
}

export interface MapLeg {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: string;
  country?: 'TR' | 'GE' | null;
  label?: string;
}

const PIN_COLOR: Record<string, string> = {
  place: '#6e1423',
  home: '#2c8a5e',
  review: '#c9a24b',
};

/** Wine for Georgia legs, copper for Türkiye, gilt for the border crossing. */
function legColor(country?: string | null): string {
  if (country === 'GE') return '#6e1423';
  if (country === 'TR') return '#b5633a';
  return '#c9a24b';
}

/** Buses + ferries get a dashed line; driven/flown legs are solid. */
function legDash(mode: string): string | undefined {
  return mode === 'bus' || mode === 'ferry' || mode === 'walk'
    ? '6 8'
    : undefined;
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
    }).setView([41.4, 38.0], 6);
    // CARTO Voyager — warm, refined, well-labelled (free, no key).
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { maxZoom: 20, subdomains: 'abcd' }
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

    // Route legs first (so pins sit on top).
    for (const leg of legs) {
      const from: [number, number] = [leg.fromLat, leg.fromLng];
      const to: [number, number] = [leg.toLat, leg.toLng];
      L.polyline([from, to], {
        color: legColor(leg.country),
        weight: 3,
        opacity: 0.75,
        dashArray: legDash(leg.mode),
        lineCap: 'round',
      }).addTo(layer);
      // Small waypoint dots at each endpoint.
      for (const pt of [from, to]) {
        L.circleMarker(pt, {
          radius: 4,
          color: '#e4c36a',
          weight: 1.5,
          fillColor: '#1a0b13',
          fillOpacity: 1,
        }).addTo(layer);
      }
    }

    const valid = pins.filter((p) => p.lat != null && p.lng != null);
    for (const p of valid) {
      const color = PIN_COLOR[p.tone ?? 'place'] ?? '#6e1423';
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${color};border:1.5px solid #e4c36a;
            box-shadow:0 2px 6px rgba(0,0,0,.5)"></div></div>`,
        // The rotated teardrop's sharp tip sits ~22px down from the icon's top —
        // anchor THERE so the point lands exactly on the lat/lng at any zoom.
        iconSize: [18, 22],
        iconAnchor: [9, 22],
      });
      L.marker([p.lat, p.lng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${esc(p.title)}</b>`);
    }

    // Frame the route + place pins (not the far-apart home cities).
    const legPts: [number, number][] = legs.flatMap((l) => [
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
      map.fitBounds(bounds.pad(0.25), { maxZoom: 9 });
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

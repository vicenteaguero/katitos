import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  lat: number;
  lng: number;
  title: string;
  tone?: 'place' | 'home';
}

/** Escape a user-authored place name before it goes into popup HTML. */
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

/** A Leaflet/OSM map of the trip — vanilla Leaflet in a ref'd div (no
 *  react-leaflet), with styled HTML pins so no marker image assets are needed. */
export function GeorgiaMap({
  pins,
  className,
}: {
  pins: MapPin[];
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Init once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      // On touch, a one-finger pan would hijack page scroll inside this small
      // embedded map — disable dragging there (auto-fit frames the trip; zoom
      // buttons remain). Desktop keeps drag.
      dragging: !L.Browser.mobile,
    }).setView([42.0, 43.5], 6); // Georgia, the Caucasus
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw pins when they change.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const valid = pins.filter((p) => p.lat != null && p.lng != null);
    for (const p of valid) {
      const home = p.tone === 'home';
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
          <div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${home ? '#2c8a5e' : '#6e1423'};border:1.5px solid #e4c36a;
            box-shadow:0 2px 6px rgba(0,0,0,.5)"></div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });
      L.marker([p.lat, p.lng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${esc(p.title)}</b>`);
    }
    // Frame the TRIP (the place pins) — not the far-apart home cities, which
    // would zoom the map out to the whole globe.
    const focus = valid.filter((p) => p.tone !== 'home');
    const framed = focus.length > 0 ? focus : valid;
    if (framed.length > 0) {
      const bounds = L.latLngBounds(framed.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.4), { maxZoom: 9 });
    }
    map.invalidateSize();
  }, [pins]);

  return (
    <div
      ref={elRef}
      className={className}
      style={{ background: '#15201a' }}
      aria-label="Trip map"
    />
  );
}

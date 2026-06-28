import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input, toast } from '@kernel/ui';

export interface CityHit {
  name: string;
  lat: number;
  lng: number;
  country: 'TR' | 'GE' | '';
  label: string;
}

interface NominatimHit {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: { country_code?: string };
}

/** Free OpenStreetMap (Nominatim) geocode — no key. Couple-scale traffic only. */
async function geocode(q: string): Promise<CityHit[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=' +
    encodeURIComponent(q);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Search failed');
  const data = (await res.json()) as NominatimHit[];
  return data.map((d) => {
    const cc = String(d.address?.country_code ?? '').toUpperCase();
    return {
      name: d.name || d.display_name.split(',')[0],
      lat: Number(d.lat),
      lng: Number(d.lon),
      country: cc === 'TR' ? 'TR' : cc === 'GE' ? 'GE' : '',
      label: d.display_name,
    };
  });
}

/** Type a city/sight name → pick a result → its coordinates drop on the map. */
export function CitySearch({ onPick }: { onPick: (hit: CityHit) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CityHit[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      setHits(await geocode(q.trim()));
    } catch {
      toast.error('Could not search — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="Kazbegi, Batumi, Sumela…"
        />
        <Button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="shrink-0 px-4"
        >
          <Search size={16} />
        </Button>
      </div>
      {hits.length > 0 && (
        <div className="space-y-1 rounded-lg border border-[rgba(251,245,240,0.12)] bg-black/20 p-1">
          {hits.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick(h);
                setHits([]);
                setQ('');
              }}
              className="lift-press block w-full truncate rounded px-3 py-2 text-left font-sans text-sm text-fg"
            >
              {h.country === 'TR' ? '🇹🇷 ' : h.country === 'GE' ? '🇬🇪 ' : '📍 '}
              {h.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

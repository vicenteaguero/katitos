import { describe, expect, it } from 'vitest';
import { greatCircle, haversineKm } from './geo';

describe('geo', () => {
  it('one degree of longitude at the equator is ~111 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
      111.19,
      0
    );
  });

  it('is zero for identical points', () => {
    expect(haversineKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it('Santiago to Moscow is roughly 14,000 km', () => {
    const d = haversineKm(
      { lat: -33.4489, lng: -70.6693 },
      { lat: 55.7558, lng: 37.6173 }
    );
    expect(d).toBeGreaterThan(13000);
    expect(d).toBeLessThan(15000);
  });
});

describe('greatCircle', () => {
  it('starts at a, ends at b, with n+1 points', () => {
    const arc = greatCircle({ lat: 41, lng: 29 }, { lat: 42, lng: 45 }, 8);
    expect(arc).toHaveLength(9);
    expect(arc[0][0]).toBeCloseTo(41, 3);
    expect(arc[8][1]).toBeCloseTo(45, 3);
  });

  it('stays on the equator for an equatorial pair', () => {
    const arc = greatCircle({ lat: 0, lng: 0 }, { lat: 0, lng: 60 }, 4);
    for (const [lat] of arc) expect(lat).toBeCloseTo(0, 6);
  });

  it('bows poleward for a far-apart northern pair', () => {
    const arc = greatCircle({ lat: 55, lng: 82 }, { lat: 41, lng: 29 }, 2);
    expect(arc[1][0]).toBeGreaterThan(48);
  });

  it('returns one point for identical endpoints', () => {
    expect(greatCircle({ lat: 5, lng: 5 }, { lat: 5, lng: 5 })).toEqual([
      [5, 5],
    ]);
  });
});

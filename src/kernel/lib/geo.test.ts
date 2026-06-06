import { describe, expect, it } from 'vitest';
import { haversineKm, kmToMiles } from './geo';

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

  it('converts km to miles', () => {
    expect(kmToMiles(100)).toBeCloseTo(62.14, 1);
  });
});

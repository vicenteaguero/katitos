import { describe, expect, it } from 'vitest';
import {
  buildRoute,
  reorderPositions,
  type RouteCity,
  type SeededLeg,
} from './map-route';

const city = (
  title: string,
  lat: number,
  lng: number,
  country = 'TR'
): RouteCity => ({
  title,
  lat,
  lng,
  country,
});

const SEEDED: SeededLeg[] = [
  {
    from_label: 'Istanbul',
    to_label: 'Trabzon',
    from_lat: 41,
    from_lng: 28.9,
    to_lat: 41,
    to_lng: 39.7,
    mode: 'car',
    country: 'TR',
  },
];

describe('buildRoute', () => {
  it('connects cities pairwise in order (n cities → n-1 legs)', () => {
    const legs = buildRoute(
      [city('A', 1, 1), city('B', 2, 2), city('C', 3, 3)],
      SEEDED
    );
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ fromLat: 1, toLat: 2, label: 'A → B' });
    expect(legs[1]).toMatchObject({ fromLat: 2, toLat: 3, label: 'B → C' });
  });

  it('falls back to the seeded legs with fewer than 2 cities', () => {
    expect(buildRoute([], SEEDED)).toHaveLength(1);
    expect(buildRoute([city('A', 1, 1)], SEEDED)).toHaveLength(1);
    expect(buildRoute([], SEEDED)[0].label).toBe('Istanbul → Trabzon');
  });

  it('drops seeded legs missing coordinates', () => {
    const bad: SeededLeg[] = [{ ...SEEDED[0], to_lat: null }];
    expect(buildRoute([], bad)).toHaveLength(0);
  });

  it('carries each city leg country for colouring', () => {
    const legs = buildRoute([city('A', 1, 1, 'GE'), city('B', 2, 2, 'GE')], []);
    expect(legs[0].country).toBe('GE');
    expect(legs[0].mode).toBe('car');
  });
});

describe('reorderPositions', () => {
  const list = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 2 },
  ];

  it('swaps a city down and writes only what changed', () => {
    // move index 0 down → [b, a, c]; b→0, a→1 change; c stays 2.
    expect(reorderPositions(list, 0, 1)).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ]);
  });

  it('swaps a city up', () => {
    expect(reorderPositions(list, 2, -1)).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('is a no-op at the ends', () => {
    expect(reorderPositions(list, 0, -1)).toEqual([]);
    expect(reorderPositions(list, 2, 1)).toEqual([]);
  });

  it('normalises everyone when positions are all default 0', () => {
    const stuck = [
      { id: 'a', position: 0 },
      { id: 'b', position: 0 },
      { id: 'c', position: 0 },
    ];
    // move 'c' up one → order [a, c, b]; writes indices that differ from 0.
    expect(reorderPositions(stuck, 2, -1)).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });
});

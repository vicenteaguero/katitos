import { describe, expect, it } from 'vitest';
import { createFeatureRegistry } from './feature-registry';
import { defineFeature } from './feature';

const Icon = () => null;
const Page = () => null;

describe('createFeatureRegistry', () => {
  const a = defineFeature({
    id: 'a',
    title: 'A',
    basePath: '/alpha',
    routes: [{ index: true, Component: Page }],
    nav: [{ label: 'Alpha', icon: Icon, to: '/alpha', order: 2 }],
  });
  const b = defineFeature({
    id: 'b',
    title: 'B',
    basePath: '/beta',
    routes: [{ index: true, Component: Page }],
    nav: [{ label: 'Beta', icon: Icon, to: '/beta', order: 1 }],
  });
  const disabled = defineFeature({
    id: 'c',
    title: 'C',
    basePath: '/gamma',
    routes: [],
    enabled: false,
  });

  const reg = createFeatureRegistry([a, b, disabled]);

  it('drops disabled features', () => {
    expect(reg.all).toHaveLength(2);
    expect(reg.byId('c')).toBeUndefined();
  });

  it('mounts one route per feature with leading slash stripped', () => {
    expect(reg.routes.map((r) => r.path)).toEqual(['alpha', 'beta']);
  });

  it('sorts nav entries by order', () => {
    expect(reg.navEntries.map((n) => n.label)).toEqual(['Beta', 'Alpha']);
  });

  it('looks features up by id', () => {
    expect(reg.byId('a')?.title).toBe('A');
  });
});

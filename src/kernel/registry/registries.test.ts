import { describe, expect, it } from 'vitest';
import { createWidgetRegistry, defineWidget } from './widget';
import { createGameRegistry, defineGame } from './game';

const C = () => null;

describe('widget registry', () => {
  it('drops disabled widgets and sorts by order', () => {
    const reg = createWidgetRegistry([
      defineWidget({ id: 'b', featureId: 'x', Component: C, order: 2 }),
      defineWidget({ id: 'a', featureId: 'x', Component: C, order: 1 }),
      defineWidget({ id: 'c', featureId: 'x', Component: C, enabled: false }),
    ]);
    expect(reg.all.map((w) => w.id)).toEqual(['a', 'b']);
  });
});

describe('game registry', () => {
  it('applies defaults and looks up by id', () => {
    const g = defineGame({ id: 'g', title: 'G', PlayComponent: C });
    expect(g.scoreOrder).toBe('desc');
    expect(g.enabled).toBe(true);

    const reg = createGameRegistry([g]);
    expect(reg.byId('g')?.title).toBe('G');
    expect(reg.byId('nope')).toBeUndefined();
  });
});

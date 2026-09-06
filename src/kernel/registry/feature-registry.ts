import type { RouteObject } from 'react-router';
import type { FeatureModule, NavEntry } from './feature';

export interface FeatureRegistry {
  all: FeatureModule[];
  navEntries: NavEntry[];
  routes: RouteObject[];
  byId: (id: string) => FeatureModule | undefined;
}

/**
 * Collapse a list of feature modules into the shell's view of the world:
 * the enabled features, a sorted nav, and the route tree. The shell consumes
 * only this - it never names a feature.
 */
export function createFeatureRegistry(
  modules: FeatureModule[]
): FeatureRegistry {
  const enabled = modules.filter((m) => m.enabled !== false);

  // Nav lists every enabled feature - locked ones included, tagged so the shell
  // can grey them out. Routes mount only for UNLOCKED features, so a locked row
  // is inert even if someone hand-types its URL.
  const navEntries = enabled
    .flatMap((m) =>
      (m.nav ?? []).map((e) => ({
        ...e,
        category: e.category ?? m.category,
        locked: m.locked === true,
      }))
    )
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  const routes: RouteObject[] = enabled
    .filter((m) => m.locked !== true)
    .map((m) => ({
      path: m.basePath.replace(/^\//, ''),
      children: m.routes,
    }));

  return {
    all: enabled,
    navEntries,
    routes,
    byId: (id) => enabled.find((m) => m.id === id),
  };
}

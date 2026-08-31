import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

/** An icon component (lucide-react icons satisfy this). */
export type IconComponent = ComponentType<{ className?: string }>;

export interface NavEntry {
  label: string;
  icon: IconComponent;
  /** Path to navigate to (usually the feature basePath). */
  to: string;
  /** Lower sorts earlier. */
  order?: number;
  /** Primary bottom-nav slot vs the "more" drawer. */
  placement?: 'primary' | 'more';
  /** Drawer section, e.g. 'Play' / 'Memories' / 'Us' / 'Practical'. */
  category?: string;
  /** Mirrors the owning feature's `locked` flag — render inert/greyed. */
  locked?: boolean;
}

export interface FeatureModule {
  /** Unique slug, e.g. 'wishlists'. */
  id: string;
  title: string;
  /** URL prefix the routes mount under, e.g. '/wishlists'. */
  basePath: string;
  /** react-router children mounted under basePath. */
  routes: RouteObject[];
  /** Zero or more nav entries (most features: one). */
  nav?: NavEntry[];
  /** Default drawer section for this feature's nav entries. */
  category?: string;
  /** Feature flag — set false to hide without deleting. */
  enabled?: boolean;
  /**
   * Shipped but not yet open to the couple. Still listed (greyed, in "More")
   * so the shape of what's coming is visible, but the row is inert — no
   * navigation, no route reachable from the UI.
   */
  locked?: boolean;
}

/** Define a feature module with sane defaults. */
export function defineFeature(m: FeatureModule): FeatureModule {
  return { enabled: true, ...m };
}

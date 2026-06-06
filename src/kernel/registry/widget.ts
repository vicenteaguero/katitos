import type { ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WidgetContext {}

export interface DashboardWidget {
  /** Unique id, e.g. 'distance'. */
  id: string;
  /** The card body. MUST be self-fetching (own its TanStack query). */
  Component: ComponentType<WidgetContext>;
  /** Grid span: 1 = small, 2 = full width. */
  size?: 1 | 2;
  order?: number;
  enabled?: boolean;
  /** Owning feature id, for provenance. */
  featureId: string;
}

export function defineWidget(w: DashboardWidget): DashboardWidget {
  return { enabled: true, size: 1, order: 100, ...w };
}

export function createWidgetRegistry(widgets: DashboardWidget[]): {
  all: DashboardWidget[];
} {
  const all = widgets
    .filter((w) => w.enabled !== false)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  return { all };
}

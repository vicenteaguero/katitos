import type { CSSProperties } from 'react';
import { usePartner } from '@kernel/auth';
import { Empty } from '@kernel/ui';
import type { DashboardWidget } from '@kernel/registry';
import { widgetRegistry } from '../widgets.registry';

const FALLBACK_CATEGORY = 'More';

/** Group widgets by category, preserving first-seen order (registry is order-sorted). */
function groupByCategory(widgets: DashboardWidget[]) {
  const groups = new Map<string, DashboardWidget[]>();
  for (const w of widgets) {
    const key = w.category ?? FALLBACK_CATEGORY;
    const bucket = groups.get(key);
    if (bucket) bucket.push(w);
    else groups.set(key, [w]);
  }
  return [...groups.entries()];
}

// Vertical editorial flow: a small muted label, then full-width stacked rows.
// No tile grid — each widget owns its own height, so heroes (polaroid, tree,
// album) breathe while minor ones stay slim single-line rows.
function CategorySection({
  label,
  widgets,
  offset,
}: {
  label: string;
  widgets: DashboardWidget[];
  offset: number;
}) {
  return (
    <section className="space-y-4">
      <p className="px-0.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <div className="space-y-3">
        {widgets.map((w, i) => {
          const Widget = w.Component;
          return (
            <div key={w.id} style={{ '--i': offset + i } as CSSProperties}>
              <Widget />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard() {
  const widgets = widgetRegistry.all;
  if (widgets.length === 0) {
    return (
      <Empty
        icon="🧩"
        title="No widgets yet"
        hint="Dashboard cards from features will show up here."
      />
    );
  }
  const groups = groupByCategory(widgets);
  let offset = 0;
  return (
    <div className="curtain-stagger space-y-12">
      {groups.map(([label, items]) => {
        const section = (
          <CategorySection
            key={label}
            label={label}
            widgets={items}
            offset={offset}
          />
        );
        offset += items.length;
        return section;
      })}
    </div>
  );
}

export function HomeRoute() {
  const { self, partner } = usePartner();
  const occasion = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div className="curtain-reveal space-y-10">
      <header className="space-y-4 pt-2 text-center">
        <p className="eyebrow">{partner ? 'Our place' : occasion}</p>
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-fg">
            Hi {self?.display_name ?? 'love'}{' '}
            <span className="candle-flicker">{self?.emoji ?? '❤️'}</span>
          </h1>
          {partner && (
            <div className="flex flex-col items-center gap-3 pt-1">
              <hr className="seam max-w-[10rem]" aria-hidden="true" />
              <p className="font-display text-xl font-light italic text-muted">
                with {partner.display_name}{' '}
                <span className="not-italic">{partner.emoji}</span>
              </p>
            </div>
          )}
        </div>
      </header>
      <Dashboard />
    </div>
  );
}

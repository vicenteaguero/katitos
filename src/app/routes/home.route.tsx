import type { CSSProperties } from 'react';
import { usePartner } from '@kernel/auth';
import { Empty } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { widgetRegistry } from '../widgets.registry';

function WidgetGrid() {
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
  return (
    <div className="curtain-stagger grid grid-cols-2 gap-7">
      {widgets.map((w, i) => {
        const Widget = w.Component;
        return (
          <div
            key={w.id}
            className={cn(w.size === 2 && 'col-span-2')}
            style={{ '--i': i } as CSSProperties}
          >
            <Widget />
          </div>
        );
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
    <div className="curtain-reveal space-y-12">
      <header className="space-y-7 pt-2 text-center">
        <p className="eyebrow">{partner ? 'Our place' : occasion}</p>
        <div className="space-y-3">
          <h1 className="font-display text-5xl font-semibold leading-[1.1] tracking-tight text-fg">
            Hi {self?.display_name ?? 'love'}{' '}
            <span className="candle-flicker">{self?.emoji ?? '💛'}</span>
          </h1>
          {partner && (
            <div className="flex flex-col items-center gap-4 pt-1">
              <hr className="seam max-w-[12rem]" aria-hidden="true" />
              <p className="font-display text-2xl font-light italic text-muted">
                with {partner.display_name}{' '}
                <span className="not-italic">{partner.emoji}</span>
              </p>
            </div>
          )}
        </div>
      </header>
      <WidgetGrid />
    </div>
  );
}

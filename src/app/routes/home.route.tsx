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
    <div className="grid grid-cols-2 gap-3">
      {widgets.map((w) => {
        const Widget = w.Component;
        return (
          <div key={w.id} className={cn(w.size === 2 && 'col-span-2')}>
            <Widget />
          </div>
        );
      })}
    </div>
  );
}

export function HomeRoute() {
  const { self, partner } = usePartner();
  return (
    <div className="space-y-4">
      <header className="pt-1">
        <h1 className="text-2xl font-bold">
          Hi {self?.display_name ?? 'love'} {self?.emoji ?? '💛'}
        </h1>
        {partner && (
          <p className="text-sm text-muted">
            with {partner.display_name} {partner.emoji}
          </p>
        )}
      </header>
      <WidgetGrid />
    </div>
  );
}

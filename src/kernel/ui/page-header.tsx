import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-4xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        <div className="mt-3 h-px w-16 bg-border" aria-hidden="true" />
        {subtitle && (
          <p className="mt-3 font-sans text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

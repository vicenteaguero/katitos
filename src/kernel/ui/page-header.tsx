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
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-[2rem] font-semibold tracking-tight text-fg">
          {title}
        </h1>
        <div className="mt-2 h-px w-12 bg-border/60" aria-hidden="true" />
        {subtitle && (
          <p className="mt-2 font-sans text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

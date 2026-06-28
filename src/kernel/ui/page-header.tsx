import type { ReactNode } from 'react';

/**
 * Page header. The app's top bar already shows the screen's title, so this
 * renders only an optional subtitle + action — keeping exactly ONE title per
 * page. `title` is still accepted (callers pass it) but intentionally not
 * rendered here to avoid a duplicate heading.
 */
export function PageHeader({
  subtitle,
  action,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  if (!subtitle && !action) return null;
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      {subtitle ? (
        <p className="min-w-0 font-sans text-sm text-muted">{subtitle}</p>
      ) : (
        <span />
      )}
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

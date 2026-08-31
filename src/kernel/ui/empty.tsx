import type { ReactNode } from 'react';

export function Empty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      {icon && <div className="text-5xl text-gold/70">{icon}</div>}
      <p className="font-display text-2xl font-medium tracking-tight text-fg">
        {title}
      </p>
      {hint && (
        <p className="max-w-xs font-sans text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

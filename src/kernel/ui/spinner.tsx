import { cn } from '../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent',
        className
      )}
    />
  );
}

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted">
      <Spinner />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

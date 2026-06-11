import { cn } from '../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold/25 border-t-gold',
        className
      )}
    />
  );
}

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 p-16 text-muted">
      <Spinner />
      {label && (
        <p className="font-display text-lg italic tracking-tight">{label}</p>
      )}
    </div>
  );
}

import type { AlbumProgress } from '../lib/progression';

export function AlbumHud({
  progress,
  spread,
  maxSpread,
}: {
  progress?: AlbumProgress;
  spread: number;
  maxSpread: number;
}) {
  if (!progress) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-fg tabular-nums">
          {progress.filled}/{progress.total} ·{' '}
          <span className="text-amber-500">{progress.foilsFilled} foils</span>
        </span>
        <span className="text-muted tabular-nums">
          {spread + 1}/{maxSpread + 1}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}

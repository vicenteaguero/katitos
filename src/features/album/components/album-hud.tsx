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
    <div className="velvet gilt-hairline space-y-2 p-4">
      <div className="flex items-center justify-between font-sans text-xs">
        <span className="font-semibold text-fg tabular-nums">
          {progress.filled}/{progress.total} stickers{' '}
          <span className="mx-1 text-border">·</span>{' '}
          <span className="gilt-text font-semibold">
            {progress.foilsFilled} foils
          </span>
        </span>
        <span className="text-muted tabular-nums">
          leaf {spread + 1}
          <span className="mx-1 text-border">/</span>
          {maxSpread + 1}
        </span>
      </div>
      <div className="bg-brown/40 h-1.5 w-full overflow-hidden">
        <div
          className="gold-shimmer bg-gold h-full transition-all"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}

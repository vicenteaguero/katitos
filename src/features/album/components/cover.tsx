import type { AlbumProgress } from '../lib/progression';

/**
 * The book cover — the album's hero artifact: a single gilt-hairline frame,
 * a Cormorant gilt-text title with a slow gold-foil sheen, and a tonal
 * bookplate for the sticker/foil tally.
 */
export function Cover({ progress }: { progress?: AlbumProgress }) {
  return (
    <div className="bg-surface gilt-hairline relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-lg p-7 text-center shadow-loge">
      <span className="eyebrow">Pololini</span>

      <div className="relative">
        <h1 className="gilt-text gold-shimmer font-display text-5xl font-semibold leading-none tracking-tight">
          Album
        </h1>
        <p className="mt-3 font-display text-lg font-light italic text-muted">
          our life, one sticker at a time
        </p>
      </div>

      {progress && (
        <div className="bg-surface-2 mt-1 rounded px-4 py-2">
          <p className="font-sans text-xs font-medium tracking-wide text-fg tabular-nums">
            <span className="gilt-text font-semibold">{progress.filled}</span>/
            {progress.total} stickers
            <span className="mx-2 text-border">·</span>
            <span className="gilt-text font-semibold">
              {progress.foilsFilled}
            </span>
            /{progress.foilsTotal} foils
          </p>
        </div>
      )}
    </div>
  );
}

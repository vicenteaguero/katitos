import type { AlbumProgress } from '../lib/progression';
import type { AlbumChapter } from '../types';

export function TableOfContents({
  chapters,
  progress,
  onJump,
}: {
  chapters: AlbumChapter[];
  progress?: AlbumProgress;
  /** Jump to the spread index for a chapter divider. */
  onJump: (chapterId: string) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-y-auto rounded-lg bg-surface p-4">
      <h2 className="mb-1 text-sm font-bold text-muted">Chapters</h2>
      {chapters.map((ch) => {
        const cp = progress?.byChapter[ch.id];
        return (
          <button
            key={ch.id}
            type="button"
            onClick={() => onJump(ch.id)}
            className="flex items-center gap-2 rounded px-1 py-1 text-left transition hover:bg-surface-2"
          >
            <span className="text-lg">{ch.emoji ?? '📄'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">
                {ch.title}
              </span>
              {cp && (
                <span className="block h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full bg-accent"
                    style={{ width: `${cp.pct}%` }}
                  />
                </span>
              )}
            </span>
            {cp && (
              <span className="shrink-0 text-[11px] tabular-nums text-muted">
                {cp.filled}/{cp.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

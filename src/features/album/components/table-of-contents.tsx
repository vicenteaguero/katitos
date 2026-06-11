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
    <div className="marble gilt-hairline-flat flex h-full w-full flex-col gap-2 overflow-y-auto p-5">
      <span className="eyebrow mb-2 text-accent before:bg-accent after:bg-accent">
        Contents
      </span>
      {chapters.map((ch) => {
        const cp = progress?.byChapter[ch.id];
        return (
          <button
            key={ch.id}
            type="button"
            onClick={() => onJump(ch.id)}
            className="hover:bg-brown/5 flex items-center gap-2 px-1 py-1 text-left transition"
          >
            <span className="text-lg">{ch.emoji ?? '📄'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-base font-semibold leading-tight text-accent">
                {ch.title}
              </span>
              {cp && (
                <span className="bg-brown/15 mt-0.5 block h-1 w-full overflow-hidden">
                  <span
                    className="block h-full bg-accent"
                    style={{ width: `${cp.pct}%` }}
                  />
                </span>
              )}
            </span>
            {cp && (
              <span className="text-brown shrink-0 font-sans text-[11px] tabular-nums">
                {cp.filled}/{cp.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

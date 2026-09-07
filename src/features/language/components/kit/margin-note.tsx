import { BUCKETS } from '@kernel/storage';
import { PlayButton } from '@kernel/ui';

/**
 * What she wrote in the margin of one answer, and her voice on it if she
 * left one. Read-only; the teacher writes it with `MarginNoteEditor`.
 */
export function MarginNote({
  note,
  audioPath,
  who = 'Her note in the margin',
}: {
  note?: string | null;
  audioPath?: string | null;
  who?: string;
}) {
  if (!note && !audioPath) return null;
  return (
    <div className="space-y-1.5 rounded border border-fg/[0.07] bg-surface-2 px-3 py-2.5">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {who}
      </p>
      {note && (
        <p className="font-display text-base italic leading-snug text-warning">
          {note}
        </p>
      )}
      {audioPath && (
        <div className="flex items-center gap-2">
          <PlayButton
            bucket={BUCKETS.languageAudio}
            path={audioPath}
            size="sm"
            label="Her voice on this one"
          />
          <span className="font-sans text-[11.5px] font-medium text-muted">
            her voice on this one
          </span>
        </div>
      )}
    </div>
  );
}

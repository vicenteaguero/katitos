import { BUCKETS } from '@kernel/storage';
import { PlayButton, Textarea } from '@kernel/ui';

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

/**
 * Writing the note: a gold-edged box, Enter saves, Esc cancels. The caller
 * owns the text and the saving so a blur after Enter cannot save it twice.
 */
export function MarginNoteEditor({
  value,
  onChange,
  onSave,
  onCancel,
  hint = 'Enter saves, Esc cancels. Saved to his phone with the mark.',
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5 rounded border border-gold/35 bg-surface-2 px-3 py-2.5">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-gold">
        Writing a note
      </p>
      <Textarea
        tone="ink"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSave();
          }
          if (e.key === 'Escape') onCancel();
        }}
        rows={2}
        placeholder="почти, watch the ending"
        className="text-[13.5px]"
      />
      <p className="font-sans text-[11px] font-medium text-muted">{hint}</p>
    </div>
  );
}

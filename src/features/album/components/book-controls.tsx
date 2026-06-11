import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Select } from '@kernel/ui';
import type { AlbumChapter } from '../types';

export function BookControls({
  spread,
  maxSpread,
  onPrev,
  onNext,
  chapters,
  onJumpChapter,
}: {
  spread: number;
  maxSpread: number;
  onPrev: () => void;
  onNext: () => void;
  chapters: AlbumChapter[];
  onJumpChapter: (chapterId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-3">
      <IconButton label="Previous page" onClick={onPrev} disabled={spread <= 0}>
        <ChevronLeft className="h-5 w-5" />
      </IconButton>

      <Select
        aria-label="Jump to chapter"
        value=""
        onChange={(e) => {
          if (e.target.value) onJumpChapter(e.target.value);
        }}
        className="max-w-[60%]"
      >
        <option value="">Jump to act…</option>
        {chapters.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.emoji ? `${ch.emoji} ` : ''}
            {ch.title}
          </option>
        ))}
      </Select>

      <IconButton
        label="Next page"
        onClick={onNext}
        disabled={spread >= maxSpread}
      >
        <ChevronRight className="h-5 w-5" />
      </IconButton>
    </div>
  );
}

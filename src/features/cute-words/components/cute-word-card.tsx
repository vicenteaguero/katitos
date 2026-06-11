import { Trash2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { AudioFromPath, Card, IconButton } from '@kernel/ui';
import type { CuteWord } from '../types';

export function CuteWordCard({
  word,
  onDelete,
}: {
  word: CuteWord;
  onDelete: (w: CuteWord) => void;
}) {
  return (
    <Card className="flex items-start justify-between gap-5">
      <div className="min-w-0 space-y-3">
        <div className="space-y-3">
          <h3 className="break-words font-display text-3xl font-semibold leading-tight tracking-tight text-fg">
            {word.term}
          </h3>
          <div className="h-px w-10 bg-copper opacity-70" aria-hidden="true" />
        </div>
        {word.meaning && (
          <p className="font-sans text-base leading-relaxed text-fg">
            {word.meaning}
          </p>
        )}
        {word.example && (
          <p className="font-display text-lg italic leading-snug text-muted">
            &ldquo;{word.example}&rdquo;
          </p>
        )}
        {word.audio_path && (
          <div className="pt-1">
            <AudioFromPath
              bucket={BUCKETS.languageAudio}
              path={word.audio_path}
            />
          </div>
        )}
      </div>
      <div className="shrink-0">
        <IconButton label="Delete" onClick={() => onDelete(word)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}

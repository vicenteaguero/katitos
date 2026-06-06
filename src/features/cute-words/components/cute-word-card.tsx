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
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h3 className="break-words text-xl font-bold">{word.term}</h3>
        {word.meaning && <p className="text-sm text-fg">{word.meaning}</p>}
        {word.example && (
          <p className="text-sm italic text-muted">{word.example}</p>
        )}
        {word.audio_path && (
          <AudioFromPath
            bucket={BUCKETS.languageAudio}
            path={word.audio_path}
          />
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

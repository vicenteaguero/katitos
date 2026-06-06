import { Trash2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { AudioFromPath, Badge, Card, IconButton } from '@kernel/ui';
import { LANG_LABELS, type Lang, type Phrase } from '../types';

export function PhraseCard({
  phrase,
  onDelete,
}: {
  phrase: Phrase;
  onDelete: (phrase: Phrase) => void;
}) {
  const lang = phrase.language as Lang;

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-semibold">{phrase.text}</p>
          {phrase.transliteration && (
            <p className="text-sm italic text-muted">
              {phrase.transliteration}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone="accent">{LANG_LABELS[lang] ?? phrase.language}</Badge>
          <IconButton label="Delete" onClick={() => onDelete(phrase)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {phrase.translation && (
        <p className="text-sm text-fg">{phrase.translation}</p>
      )}

      {phrase.example && <p className="text-sm text-muted">{phrase.example}</p>}

      {phrase.audio_path && (
        <AudioFromPath
          bucket={BUCKETS.languageAudio}
          path={phrase.audio_path}
        />
      )}
    </Card>
  );
}

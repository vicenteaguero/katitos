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
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {/* The foreign tongue, set as an engraved libretto line. */}
          <p className="font-display text-3xl font-medium leading-tight tracking-tight text-fg">
            {phrase.text}
          </p>
          {phrase.transliteration && (
            <p className="font-display text-base italic leading-snug text-copper">
              {phrase.transliteration}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            tone="neutral"
            className="bg-lapis text-warning border-border/50"
          >
            {LANG_LABELS[lang] ?? phrase.language}
          </Badge>
          <IconButton label="Delete" onClick={() => onDelete(phrase)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {phrase.translation && (
        <p className="font-sans text-base leading-relaxed text-fg">
          {phrase.translation}
        </p>
      )}

      {phrase.example && (
        <p className="font-display text-base italic leading-relaxed text-muted">
          {phrase.example}
        </p>
      )}

      {phrase.audio_path && (
        <div className="border-t border-border/40 pt-3">
          <AudioFromPath
            bucket={BUCKETS.languageAudio}
            path={phrase.audio_path}
          />
        </div>
      )}
    </Card>
  );
}

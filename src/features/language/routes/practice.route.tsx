import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { AudioFromPath, Button, Card, Empty, LoadingScreen } from '@kernel/ui';
import { usePhrases } from '../api/phrases.queries';
import { LANG_LABELS, type Lang } from '../types';

export function PracticeRoute() {
  const { language } = useParams<{ language: string }>();
  const lang = (language ?? 'ru') as Lang;
  const { data, isLoading, isError } = usePhrases(lang);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const backLink = (
    <Link
      to="/language"
      className="inline-flex items-center gap-1 text-sm text-muted"
    >
      <ChevronLeft size={16} /> Language
    </Link>
  );

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <div className="space-y-4">
        {backLink}
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      </div>
    );
  }

  const phrases = data ?? [];

  if (phrases.length === 0) {
    return (
      <div className="space-y-4">
        {backLink}
        <Empty
          icon="🗣️"
          title={`No ${LANG_LABELS[lang]} phrases yet`}
          hint="Add some phrases first, then come back to practice."
        />
      </div>
    );
  }

  const safeIndex = Math.min(index, phrases.length - 1);
  const phrase = phrases[safeIndex];

  const go = (next: number) => {
    setIndex(next);
    setRevealed(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {backLink}
        <span className="text-sm tabular-nums text-muted">
          {safeIndex + 1}/{phrases.length}
        </span>
      </div>

      <Card className="min-h-48 space-y-4">
        <div className="space-y-3 text-center">
          <p className="text-3xl font-bold">{phrase.text}</p>
          {phrase.audio_path && (
            <AudioFromPath
              bucket={BUCKETS.languageAudio}
              path={phrase.audio_path}
            />
          )}
        </div>

        {revealed ? (
          <div className="space-y-1 border-t border-border pt-3 text-center">
            {phrase.transliteration && (
              <p className="text-sm italic text-muted">
                {phrase.transliteration}
              </p>
            )}
            {phrase.translation && (
              <p className="text-lg font-medium">{phrase.translation}</p>
            )}
            {phrase.example && (
              <p className="text-sm text-muted">{phrase.example}</p>
            )}
          </div>
        ) : (
          <Button full variant="secondary" onClick={() => setRevealed(true)}>
            <Eye size={16} /> Reveal
          </Button>
        )}
      </Card>

      <div className="flex gap-2">
        <Button
          full
          variant="secondary"
          disabled={safeIndex === 0}
          onClick={() => go(safeIndex - 1)}
        >
          <ChevronLeft size={16} /> Prev
        </Button>
        <Button
          full
          disabled={safeIndex >= phrases.length - 1}
          onClick={() => go(safeIndex + 1)}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

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
      className="inline-flex items-center gap-1 font-sans text-sm text-muted transition-colors hover:text-fg"
    >
      <ChevronLeft size={16} /> Language
    </Link>
  );

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <div className="curtain-reveal space-y-7">
        {backLink}
        <Empty icon="⚠️" title="Couldn't load" hint="Try again in a moment." />
      </div>
    );
  }

  const phrases = data ?? [];

  if (phrases.length === 0) {
    return (
      <div className="curtain-reveal space-y-7">
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
    <div className="curtain-reveal space-y-7">
      <div className="flex items-center justify-between">
        {backLink}
        <span className="font-sans text-xs tabular-nums uppercase tracking-[0.18em] text-gold">
          {safeIndex + 1} / {phrases.length}
        </span>
      </div>

      <p className="eyebrow">On Stage</p>

      {/* The lit stage: a candle-warm footlight rises behind the phrase. */}
      <div className="relative">
        <div
          className="footlight pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <Card className="relative min-h-56 space-y-6">
          <div className="space-y-4 text-center">
            {/* The foreign tongue, performed — engraved and softly alive. */}
            <p className="candle-flicker font-display text-5xl font-medium leading-tight tracking-tight text-fg">
              {phrase.text}
            </p>
            {phrase.audio_path && (
              <div className="flex justify-center">
                <AudioFromPath
                  bucket={BUCKETS.languageAudio}
                  path={phrase.audio_path}
                />
              </div>
            )}
          </div>

          {revealed ? (
            <div className="space-y-2 border-t border-border/50 pt-4 text-center">
              {phrase.transliteration && (
                <p className="font-display text-lg italic leading-snug text-copper">
                  {phrase.transliteration}
                </p>
              )}
              {phrase.translation && (
                <p className="font-sans text-xl font-medium text-fg">
                  {phrase.translation}
                </p>
              )}
              {phrase.example && (
                <p className="font-display text-base italic leading-relaxed text-muted">
                  {phrase.example}
                </p>
              )}
            </div>
          ) : (
            <Button full variant="secondary" onClick={() => setRevealed(true)}>
              <Eye size={16} /> Reveal
            </Button>
          )}
        </Card>
      </div>

      <div className="flex gap-3">
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

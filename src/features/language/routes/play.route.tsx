import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { RotateCcw, Volume2 } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { AudioFromPath, Button, Empty, LoadingScreen } from '@kernel/ui';
import { useDeck, useDeckCards } from '../api/decks.queries';

/** A flashcard card-game over one deck — tap to flip, mark known/again. */
export function PlayRoute() {
  const { deckId } = useParams<{ deckId: string }>();
  const { data: deck } = useDeck(deckId);
  const { data: cards, isLoading } = useDeckCards(deckId);

  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [done, setDone] = useState(false);

  if (isLoading) return <LoadingScreen />;
  const list = cards ?? [];
  if (list.length === 0)
    return <Empty icon="📝" title="No cards to practice yet" />;

  const card = list[i];

  const next = (gotIt: boolean) => {
    if (gotIt) setKnown((k) => k + 1);
    setFlipped(false);
    if (i + 1 >= list.length) setDone(true);
    else setI((n) => n + 1);
  };

  const restart = () => {
    setI(0);
    setKnown(0);
    setFlipped(false);
    setDone(false);
  };

  if (done) {
    return (
      <div className="curtain-reveal flex h-full flex-col items-center justify-center gap-6 text-center">
        <p className="text-6xl">{known === list.length ? '🌟' : '💪'}</p>
        <div>
          <p className="font-display text-3xl text-fg">
            {known} / {list.length}
          </p>
          <p className="mt-1 font-sans text-sm text-muted">
            cards you knew by heart
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={restart}>
            <RotateCcw size={16} /> Again
          </Button>
          <Link to={`/language/deck/${deckId}`}>
            <Button>Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="curtain-reveal flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={`/language/deck/${deckId}`}
          className="font-sans text-sm text-muted"
        >
          ✕ Exit
        </Link>
        <p className="font-sans text-xs tabular-nums text-muted">
          {i + 1} / {list.length} · {deck?.emoji ?? '🗂️'} {deck?.title}
        </p>
      </div>

      {/* The flip card — tap to reveal the meaning. */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative flex-1"
        style={{ perspective: '1400px' }}
      >
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front — the foreign word */}
          <div
            className="marble gilt-hairline shadow-loge absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="font-display text-4xl font-semibold leading-tight text-accent">
              {card.text}
            </p>
            {card.transliteration && (
              <p className="font-display text-lg italic text-copper">
                {card.transliteration}
              </p>
            )}
            <span className="mt-4 font-sans text-xs uppercase tracking-[0.2em] text-brown/60">
              tap to flip
            </span>
          </div>
          {/* Back — the meaning + audio */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-surface-2 p-6 text-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <p className="font-display text-3xl text-fg">
              {card.translation ?? '—'}
            </p>
            {card.example && (
              <p className="font-display text-base italic text-muted">
                {card.example}
              </p>
            )}
            {card.audio_path ? (
              <div
                className="mt-2 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <AudioFromPath
                  bucket={BUCKETS.languageAudio}
                  path={card.audio_path}
                  className="h-9 w-full"
                />
              </div>
            ) : (
              <Volume2 className="mt-2 h-5 w-5 text-muted/40" />
            )}
          </div>
        </div>
      </button>

      <div className="mt-5 flex gap-3">
        <Button full variant="secondary" onClick={() => next(false)}>
          Again
        </Button>
        <Button full onClick={() => next(true)}>
          Got it
        </Button>
      </div>
    </div>
  );
}

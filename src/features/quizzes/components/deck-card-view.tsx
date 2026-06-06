import { useState } from 'react';
import { BUCKETS } from '@kernel/storage';
import { AudioFromPath, Button, Textarea } from '@kernel/ui';
import { cn } from '@kernel/lib';
import type { DeckCard, DeckMode } from '@kernel/engines/deck';
import { QuizImage } from './quiz-image';

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

interface Answer {
  optionId?: string;
  text?: string;
}

function label(card: DeckCard, answer: unknown): string {
  const a = (answer ?? {}) as Answer;
  if (a.optionId)
    return (
      card.prompt.options?.find((o) => o.id === a.optionId)?.label ?? a.optionId
    );
  return a.text ?? '—';
}

export function DeckCardView({
  card,
  mode,
  myAnswer,
  partnerAnswer,
  isAnswered,
  isRevealed,
  onAnswer,
  partnerName,
}: {
  card: DeckCard;
  mode: DeckMode;
  myAnswer: unknown;
  partnerAnswer: unknown;
  isAnswered: boolean;
  isRevealed: boolean;
  onAnswer: (value: unknown) => void;
  partnerName?: string;
}) {
  const [text, setText] = useState('');
  const opts = card.prompt.options;
  const myOpt = (myAnswer as Answer)?.optionId;

  return (
    <div className="space-y-4">
      {card.prompt.imagePath && (
        <QuizImage
          path={card.prompt.imagePath}
          className="max-h-72 w-full rounded-lg object-cover"
        />
      )}
      {card.prompt.audioPath && (
        <AudioFromPath
          bucket={BUCKETS.quizMedia}
          path={card.prompt.audioPath}
        />
      )}
      {card.prompt.text && (
        <p className="text-lg font-medium">{card.prompt.text}</p>
      )}

      {opts ? (
        <div className="space-y-2">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={isAnswered}
              onClick={() => onAnswer({ optionId: o.id })}
              className={cn(
                'w-full rounded-lg border p-3 text-left disabled:opacity-90',
                myOpt === o.id ? 'border-accent bg-accent/10' : 'border-border'
              )}
            >
              {o.imagePath && (
                <QuizImage
                  path={o.imagePath}
                  className="mb-2 h-24 w-full rounded object-cover"
                />
              )}
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        !isAnswered && (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Your answer…"
            />
            <Button
              full
              onClick={() => text.trim() && onAnswer({ text: text.trim() })}
            >
              Answer
            </Button>
          </div>
        )
      )}

      {isAnswered && !isRevealed && mode === 'compare' && (
        <p className="text-sm text-muted">
          You answered. Waiting for {partnerName ?? 'your love'}…
        </p>
      )}

      {isRevealed && (
        <div className="space-y-1 rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <div>
            You: <b>{label(card, myAnswer)}</b>
            {mode === 'quiz' &&
              card.correct != null &&
              (eq(myAnswer, card.correct) ? ' ✓' : ' ✗')}
          </div>
          <div>
            {partnerName ?? 'Partner'}: <b>{label(card, partnerAnswer)}</b>
          </div>
          {mode === 'compare' && (
            <div
              className={
                eq(myAnswer, partnerAnswer) ? 'text-success' : 'text-warning'
              }
            >
              {eq(myAnswer, partnerAnswer) ? 'Match! 🎉' : 'Different 😄'}
            </div>
          )}
          {mode === 'quiz' && card.correct != null && (
            <div className="text-muted">
              Correct answer: {label(card, card.correct)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

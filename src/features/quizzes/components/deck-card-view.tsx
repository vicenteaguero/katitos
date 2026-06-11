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
    <div className="space-y-7">
      {(card.prompt.imagePath || card.prompt.audioPath) && (
        <div className="space-y-4">
          {card.prompt.imagePath && (
            <div className="gilt-hairline overflow-hidden rounded-none shadow-loge">
              <QuizImage
                path={card.prompt.imagePath}
                className="max-h-72 w-full rounded-none object-cover"
              />
            </div>
          )}
          {card.prompt.audioPath && (
            <AudioFromPath
              bucket={BUCKETS.quizMedia}
              path={card.prompt.audioPath}
            />
          )}
        </div>
      )}

      {card.prompt.text && (
        <p className="text-balance text-center font-display text-3xl font-medium leading-tight tracking-tight text-fg">
          {card.prompt.text}
        </p>
      )}

      {opts ? (
        <div className="space-y-3">
          {opts.map((o, i) => {
            const selected = myOpt === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={isAnswered}
                onClick={() => onAnswer({ optionId: o.id })}
                style={{ '--i': i } as React.CSSProperties}
                className={cn(
                  'lift-press group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-none border p-4 text-left font-sans transition disabled:pointer-events-none',
                  selected
                    ? 'gilt-hairline bg-copper/15 text-fg shadow-catch'
                    : 'gilt-hairline-flat text-fg hover:bg-surface-2 disabled:opacity-80'
                )}
              >
                {o.imagePath && (
                  <div className="gilt-hairline-flat shrink-0 overflow-hidden rounded-none">
                    <QuizImage
                      path={o.imagePath}
                      className="h-16 w-16 rounded-none object-cover"
                    />
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-base">
                  {o.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-none border text-xs font-semibold transition',
                    selected
                      ? 'border-copper bg-copper/30 text-warning candle-flicker'
                      : 'border-border/50 text-muted'
                  )}
                >
                  {selected ? '✦' : String.fromCharCode(65 + i)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        !isAnswered && (
          <div className="space-y-3">
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
        <p className="text-center font-display text-lg italic text-muted">
          You answered. Waiting for {partnerName ?? 'your love'}…
        </p>
      )}

      {isRevealed && (
        <div className="velvet gilt-hairline space-y-4 rounded-none p-6 shadow-catch">
          <p className="eyebrow text-copper before:bg-copper after:bg-copper">
            The Reveal
          </p>

          <div className="space-y-3 font-sans text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted">You</span>
              <span className="flex items-center gap-1.5 text-right font-medium text-fg">
                {label(card, myAnswer)}
                {mode === 'quiz' &&
                  card.correct != null &&
                  (eq(myAnswer, card.correct) ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <span className="text-danger">✗</span>
                  ))}
              </span>
            </div>
            <div className="seam" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted">{partnerName ?? 'Partner'}</span>
              <span className="text-right font-medium text-fg">
                {label(card, partnerAnswer)}
              </span>
            </div>
          </div>

          {mode === 'compare' && (
            <p
              className={cn(
                'text-center font-display text-2xl font-medium tracking-tight',
                eq(myAnswer, partnerAnswer) ? 'text-success' : 'text-copper'
              )}
            >
              {eq(myAnswer, partnerAnswer) ? 'Match 🎉' : 'Different 😄'}
            </p>
          )}

          {mode === 'quiz' && card.correct != null && (
            <p className="text-center font-sans text-xs uppercase tracking-[0.16em] text-muted">
              Correct · {label(card, card.correct)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

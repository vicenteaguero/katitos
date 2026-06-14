import { Camera, Check, Lock, Star, Trash2 } from 'lucide-react';
import { Button, Card, IconButton } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { ScavengerProofImage } from './scavenger-proof-image';
import type { ScavengerCardFull } from '../types';

interface Props {
  card: ScavengerCardFull;
  ownerRole: 'a' | 'b' | null;
  raterName: string;
  viewerIsOwner: boolean;
  /** Stars still available to spend on THIS card (pot left + its own stars). */
  maxStars: number;
  onMarkDone: (c: ScavengerCardFull) => void;
  onRate: (c: ScavengerCardFull, stars: number) => void;
  onAccept: (c: ScavengerCardFull) => void;
  onUndo: (c: ScavengerCardFull) => void;
  onDelete: (c: ScavengerCardFull) => void;
}

const TONE = {
  a: { label: 'His', color: '#6f9bd8' },
  b: { label: 'Hers', color: '#d98fb0' },
} as const;

/** Three stars; tappable (with a pot limit) when onPick is given, else static. */
function Stars({
  value,
  onPick,
  limit,
}: {
  value: number;
  onPick?: (n: number) => void;
  limit?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => {
        const overBudget = limit != null && n > limit && n > value;
        return (
          <button
            key={n}
            type="button"
            disabled={!onPick || overBudget}
            onClick={() => onPick?.(n)}
            className={cn(
              onPick && !overBudget ? 'lift-press' : 'cursor-default'
            )}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              size={onPick ? 30 : 18}
              strokeWidth={1.75}
              className={cn(
                n <= value ? 'fill-gold text-gold' : 'text-muted',
                overBudget && 'opacity-25'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function DateCardItem({
  card,
  ownerRole,
  raterName,
  viewerIsOwner,
  maxStars,
  onMarkDone,
  onRate,
  onAccept,
  onUndo,
  onDelete,
}: Props) {
  const claim = card.scavenger_claims;
  const done = !!claim;
  const stars = claim?.stars ?? 0;
  const rated = stars > 0;
  const accepted = !!claim?.accepted;
  const tone = ownerRole
    ? TONE[ownerRole]
    : { label: 'Deck', color: '#c9a24b' };

  return (
    <Card className="overflow-hidden p-0">
      {/* Deck color seam — blue for his, pink for hers. */}
      <div className="h-1 w-full" style={{ background: tone.color }} />

      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          {/* The physical card photo (or the deck envelope as a fallback). */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {card.card_image_path ? (
              <ScavengerProofImage
                path={card.card_image_path}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src="/deck.png"
                alt="card"
                className="h-full w-full object-cover opacity-80"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-left font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: tone.color }}
            >
              {tone.label} deck
            </p>
            <h3 className="truncate font-display text-xl font-semibold tracking-tight text-fg">
              {card.title}
            </h3>
            {card.description && (
              <p className="font-sans text-sm leading-snug text-muted">
                {card.description}
              </p>
            )}
          </div>
          {viewerIsOwner && !accepted && (
            <IconButton label="Delete card" onClick={() => onDelete(card)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {/* ── State machine ──────────────────────────────────────────── */}
        {!done ? (
          <Button full onClick={() => onMarkDone(card)}>
            <Camera size={16} /> We did it — add the photo
          </Button>
        ) : (
          <div className="space-y-3">
            <ScavengerProofImage
              path={claim.image_path ?? ''}
              className="aspect-video w-full rounded-lg object-cover"
            />

            {accepted ? (
              // Locked, final.
              <div className="flex items-center justify-between">
                <Stars value={stars} />
                <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-success">
                  <Lock size={12} /> Accepted
                </span>
              </div>
            ) : !rated ? (
              // Done, awaiting the partner's stars.
              viewerIsOwner ? (
                <p className="text-center font-sans text-sm text-muted">
                  Waiting for {raterName} to score this date…
                </p>
              ) : (
                <div className="space-y-2 text-center">
                  <p className="eyebrow justify-center">How good was it?</p>
                  <div className="flex justify-center">
                    <Stars
                      value={0}
                      limit={maxStars}
                      onPick={(n) => onRate(card, n)}
                    />
                  </div>
                  {maxStars < 3 && (
                    <p className="font-sans text-xs text-muted">
                      {maxStars === 0
                        ? 'Pot empty — no stars left to give'
                        : `${maxStars} left in the pot`}
                    </p>
                  )}
                </div>
              )
            ) : (
              // Rated but not yet accepted.
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {viewerIsOwner ? (
                    <Stars value={stars} />
                  ) : (
                    <Stars
                      value={stars}
                      limit={maxStars}
                      onPick={(n) => onRate(card, n)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onUndo(card)}
                    className="font-sans text-xs uppercase tracking-[0.12em] text-muted lift-press"
                  >
                    undo
                  </button>
                </div>
                {viewerIsOwner ? (
                  <Button full onClick={() => onAccept(card)}>
                    <Check size={16} /> Accept {stars}★ — lock it in
                  </Button>
                ) : (
                  <p className="text-center font-sans text-xs text-muted">
                    Tap a star to adjust · waiting for them to accept
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
